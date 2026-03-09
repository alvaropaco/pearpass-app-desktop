# Electron packaging and runtime (after migration)

This document describes how the PearPass desktop app is built, packaged, and how the main process, worklet (vault), and renderer communicate. It reflects the state after the migration to fix ESM/CJS and DMG install issues.

---

## 1. Architecture overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Renderer (React)                                               │
│  - Uses window.electronAPI (from preload) for vault & runtime   │
└────────────────────────────┬────────────────────────────────────┘
                             │ IPC (vault:invoke, runtime:*, get-app-path)
                             ▼
┌─────────────────────────────────────────────────────────────────-┐
│  Main process (electron/main.cjs)                                │
│  - Creates window, preload, BrowserWindow                        │
│  - Starts worklet via bare-sidecar (or pear-runtime when upgrade)│
│  - Registers IPC handlers; forwards vault calls to vaultClient   │
└────────────────────────────┬────────────────────────────────────-┘
                             │ stdio / IPC pipe
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Worklet (Bare sidecar)                                         │
│  - Runs vault logic (pearpass-lib-vault-core worklet)           │
│  - Dev: app.js (ESM). Packaged: app.cjs (CJS bundle)            │
└─────────────────────────────────────────────────────────────────┘
```

- **Renderer** never talks to the worklet directly. It calls `window.electronAPI.vaultInvoke(method, args)` (and runtime helpers). The **main process** receives those and forwards them to **PearpassVaultClient**, which speaks to the worklet over a pipe.
- The **worklet** runs in a separate process (Bare runtime). It uses `bare-*` modules and native addons; the main process only spawns it and connects IPC.

---

## 2. Main process (electron/main.cjs)

- **Entry:** `main` in package.json points to `electron/main.cjs`.
- **On ready:** Sets log path, patches `child_process.spawn` for packaged app (so any spawn through `app.asar` is rewritten to `app.asar.unpacked`), registers IPC, then starts the runtime.
- **Runtime start:**
  - If `pearRuntime.upgrade` is set: uses **pear-runtime** (P2P OTA), calls `pearRuntime.run(workletPath)`.
  - Else: uses **bare-sidecar** only (`startWorkletOnly()`), spawns the worklet with `new Sidecar(workletPath)`.
- **Packaged app:** Before creating the Sidecar, the main process `chdir`s to `app.asar.unpacked` so the worklet process resolves `node_modules` (and workspace packages) from that root.
- **IPC:** Handles `get-app-path`, `runtime:getConfig`, `runtime:applyUpdate`, `runtime:restart`, `runtime:checkUpdated`, and `vault:invoke`. Vault methods are forwarded to `vaultClient`; Buffers are serialized as `{ __base64 }`.

---

## 3. Worklet: dev vs packaged

The vault worklet lives in `packages/pearpass-lib-vault-core/src/worklet/`. It is loaded in two different ways so it works in both dev and packaged app.

### 3.1 Dev

- **Path:** `getWorkletPath()` returns  
  `node_modules/pearpass-lib-vault-core/src/worklet/app.js`  
  (from `app.getAppPath()`).
- **Format:** ESM (`app.js`). The Bare loader in dev can run ESM and resolve Node built-ins to `bare-*` (e.g. `fs` → `bare-fs`).
- **No bundle:** Dependencies are required from the real `node_modules` and package tree.

### 3.2 Packaged

- **Path:** `getWorkletPath()` returns  
  `…/app.asar.unpacked/packages/pearpass-lib-vault-core/src/worklet/app.cjs`.
- **Format:** CommonJS bundle (`app.cjs`). The Bare runtime used in the packaged app loads the entry as CJS; if we gave it ESM `app.js`, it would throw “Cannot use import statement outside a module”.
- **Bundle:** Produced by `scripts/build.worklet.mjs` (see below). Only the worklet **source** (relative imports) is bundled; all `node_modules` are external so Bare resolves them at runtime and native addons work.

---

## 4. Worklet build (scripts/build.worklet.mjs)

- **Runs as part of `npm run build`** (before `tsc` and the renderer bundle).
- **Input:** `packages/pearpass-lib-vault-core/src/worklet/app.js` (ESM).
- **Output:** `packages/pearpass-lib-vault-core/src/worklet/app.cjs` (single CJS file).
- **Behaviour:**
  - **Alias:** Node built-ins are aliased to Bare equivalents so the bundle uses `require('bare-fs')` etc.:  
    `fs` → `bare-fs`, `path` → `bare-path`, `buffer` → `bare-buffer`, `crypto` → `bare-crypto`, `os` → `bare-os`.
  - **Externalize all packages:** An esbuild plugin marks any non-relative specifier as external (`filter: /^[^./]/`). So no dependency (including native addons or `fs-native-extensions`) is inlined; the bundle only contains the worklet’s own code. That avoids “ADDON_NOT_FOUND” and keeps one list of externals instead of hundreds.
- **Result:** Small CJS bundle; at runtime Bare loads `bare-*`, `pearpass-utils-password-check`, etc. from `node_modules` (and unpacked workspace packages).

---

## 5. Packaging (electron-builder, asar, asarUnpack)

- **Build command:** `npm run dist` → `npm run build` then `electron-builder`.  
  `build` = worklet bundle + `tsc` + renderer bundle.
- **What gets packed:**  
  `files` in package.json include `electron/**/*`, `dist/**/*`, `index.html`, `index.js`, `packages/**/*`, `assets/**/*`, `node_modules/**/*` (with exclusions for tests, docs, `.map`, etc.).
- **asarUnpack:** These paths are unpacked so the worklet and Node resolution work from disk (no reading through asar for the sidecar):
  - `packages/pearpass-lib-vault-core/src/**` – worklet + middleware/utils (so `../middleware/`, `../utils/` resolve).
  - `packages/pearpass-lib-vault-core/node_modules/**` – vault-core’s deps (resolution from worklet dir).
  - `packages/pearpass-utils-password-check/**` – workspace package; `node_modules/pearpass-utils-password-check` is a symlink to this.
  - `packages/pear-apps-utils-validator/**` – same idea for validator.
  - `node_modules/**` – root `node_modules` so Bare can resolve from `app.asar.unpacked`.

If a workspace package is only inside the asar, the symlink from `node_modules` (e.g. `node_modules/pearpass-utils-password-check` → `../packages/pearpass-utils-password-check`) can fail when the app is run from /Applications (DMG install). Unpacking that package fixes “MODULE_NOT_FOUND” for that name. Only add packages that are actually required at runtime (not dev-only peers like `tether-dev-docs`).

---

## 6. Preload (electron/preload.cjs)

- **Attached to the renderer** via `webPreferences.preload` (with `nodeIntegration: true`, `contextIsolation: false`).
- **Responsibilities:**
  1. **App path for fs-native-extensions:** Sends `get-app-path` sync, then sets `global.__dirname` and `global.__filename` to the `fs-native-extensions` path so code that uses it (e.g. via pear-ipc) in the renderer does not break.
  2. **Renderer API:** Exposes `window.electronAPI` with:
     - Runtime: `getConfig`, `applyUpdate`, `restart`, `checkUpdated`, `onRuntimeUpdating`, `onRuntimeUpdated`
     - Vault: `vaultInvoke(method, args)`, `vaultOnUpdate(cb)`
- The renderer must use this preload; without it there is no `window.electronAPI` and no correct `__dirname`/`__filename` for fs-native-extensions.

---

## 7. Renderer → main → worklet flow

1. Renderer calls e.g. `window.electronAPI.vaultInvoke('someMethod', [arg1, arg2])`.
2. Preload forwards to `ipcRenderer.invoke('vault:invoke', { method, args })`.
3. Main process `ipcMain.handle('vault:invoke', …)` receives it, gets `vaultClient[method]`, deserializes args (e.g. `__base64` → Buffer), calls the method on `vaultClient`.
4. `PearpassVaultClient` sends the call over the pipe to the worklet; worklet runs the vault logic and replies.
5. Main process serializes the result (e.g. Buffer → `__base64`) and returns to the renderer.

---

## 8. Key files reference

| Role | File |
|------|------|
| Main process | `electron/main.cjs` |
| Preload | `electron/preload.cjs` |
| Worklet entry (ESM) | `packages/pearpass-lib-vault-core/src/worklet/app.js` |
| Worklet bundle (CJS, packaged) | `packages/pearpass-lib-vault-core/src/worklet/app.cjs` (generated) |
| Worklet build script | `scripts/build.worklet.mjs` |
| Renderer bundle | `scripts/bundle-renderer.mjs` → `dist/renderer.bundle.js` |
| Build pipeline | `package.json` scripts: `build`, `dist` |

---

## 9. Troubleshooting

- **“Cannot use import statement outside a module” in packaged app**  
  Packaged app must run the CJS worklet (`app.cjs`). Ensure `npm run build` runs the worklet build and `getWorkletPath()` returns `app.cjs` when `app.isPackaged` is true.

- **“MODULE_NOT_FOUND” for a package (e.g. pearpass-utils-password-check) when running from DMG /Applications**  
  That package is likely a workspace dependency symlinked from `node_modules`. Add `packages/<package-name>/**` to `asarUnpack` so the symlink target exists on disk.

- **“ADDON_NOT_FOUND” for a native addon**  
  The worklet bundle must not inline that package. The current setup externalizes all non-relative imports; if something is still inlined, ensure it’s required as a package name (not a relative path) and that the esbuild plugin is applied.

- **Worklet works from dist/mac-arm64 but not from installed DMG**  
  Usually the same as the MODULE_NOT_FOUND case: symlinks from `node_modules` to `packages/...` need the target unpacked so they resolve after install.
