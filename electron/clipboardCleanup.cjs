const { spawn, spawnSync } = require('child_process')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const { isFlatpakRuntime } = require('./flatpak-paths.cjs')
const clipboardHelper = require('./clipboardCleanupHelper.cjs')

const DEFAULT_CLIPBOARD_CLEAR_DELAY_MS = 30000
const CLIPBOARD_CLEANUP_STATE_FILE = 'pearpass-clipboard-cleanup-current.token'

const pendingCleanups = new Map()

function resolveBundledXselPath() {
  const arch = process.arch === 'arm64' ? 'xsel-arm64' : 'xsel-x86_64'
  const candidates = [
    path.join(__dirname, '..', '..', 'bin', arch),
    path.join(__dirname, '..', 'resources', 'bin', arch)
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return null
}

// Electron's clipboard.clear() returns before the X SelectionOwner change is
// flushed, so a paste right after app exit can still return the old secret
// (gnome-shell's clipboard manager resurrects content from a dying owner).
// spawnSync'ing the bundled xsel forces a real X round-trip: xsel takes
// ownership with empty content, flushes, exits.
function clearSelectionViaBundledXsel() {
  const source = resolveBundledXselPath()
  if (!source) return false
  const destDir = process.env.XDG_RUNTIME_DIR || require('os').tmpdir()
  const dest = path.join(destDir, 'pearpass-xsel')
  try {
    fs.copyFileSync(source, dest)
    fs.chmodSync(dest, 0o755)
  } catch {
    return false
  }
  const result = spawnSync(dest, ['--clipboard', '--clear'], {
    encoding: 'utf8',
    timeout: 1500,
    stdio: ['ignore', 'pipe', 'pipe']
  })
  return !result.error && result.status === 0
}

function readHostClipboardOrFallback(electronClipboard, logger) {
  try {
    const text = clipboardHelper.readClipboard()
    if (typeof text === 'string') return text
  } catch (err) {
    logger.warn(
      'MAIN',
      'Host clipboard read failed, falling back to Electron:',
      err && err.message ? err.message : err
    )
  }
  return electronClipboard.readText()
}

function clearHostClipboardOrFallback(electronClipboard, logger) {
  try {
    clipboardHelper.clearClipboard()
    return
  } catch (err) {
    logger.warn(
      'MAIN',
      'Host clipboard clear failed, falling back to Electron:',
      err && err.message ? err.message : err
    )
  }
  try {
    electronClipboard.clear()
  } catch (err) {
    logger.warn(
      'MAIN',
      'Electron clipboard clear failed:',
      err && err.message ? err.message : err
    )
  }
}

function getClipboardCleanupStatePath(app) {
  return path.join(app.getPath('temp'), CLIPBOARD_CLEANUP_STATE_FILE)
}

function removeFileIfExists(filePath) {
  try {
    fs.unlinkSync(filePath)
  } catch (err) {
    if (err && err.code !== 'ENOENT') throw err
  }
}

function removeClipboardCleanupTokenIfCurrent(statePath, token) {
  try {
    const currentToken = fs.readFileSync(statePath, 'utf8')
    if (currentToken === token) {
      removeFileIfExists(statePath)
    }
  } catch (err) {
    if (err && err.code !== 'ENOENT') throw err
  }
}

function spawnDetachedClipboardHelper(secretPath, token, statePath, delayMs) {
  const helperPath = path.join(__dirname, 'clipboardCleanupHelper.cjs')
  if (!fs.existsSync(helperPath)) {
    throw new Error(`Clipboard cleanup helper not found: ${helperPath}`)
  }

  const child = spawn(
    process.execPath,
    [helperPath, secretPath, token, statePath, String(delayMs)],
    {
      detached: true,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      stdio: 'inherit',
      windowsHide: true
    }
  )

  child.unref()
}

function spawnDetachedWindowsClipboardHelper(
  secretPath,
  token,
  statePath,
  delayMs
) {
  const scriptPath = path.join(__dirname, 'clipboardCleanup.windows.ps1')
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Windows clipboard cleanup script not found: ${scriptPath}`)
  }

  const child = spawn(
    'cmd.exe',
    [
      '/c',
      'start',
      '""',
      '/min',
      'powershell.exe',
      '-NoProfile',
      '-WindowStyle',
      'Hidden',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      scriptPath,
      '-SecretPath',
      secretPath,
      '-StatePath',
      statePath,
      '-Token',
      token,
      '-DelayMs',
      String(delayMs)
    ],
    {
      detached: true,
      stdio: 'inherit',
      windowsHide: true
    }
  )

  child.unref()
}

function runInProcessClipboardCleanup({
  clipboard,
  logger,
  statePath,
  secretPath,
  token,
  textToMatch
}) {
  try {
    let currentToken
    try {
      currentToken = fs.readFileSync(statePath, 'utf8')
    } catch (err) {
      if (err && err.code === 'ENOENT') return
      throw err
    }
    if (currentToken !== token) return

    // When Electron is pinned to X11 (Flatpak wrapper sets GDK_BACKEND=x11
    // because the sandbox only carries --socket=x11), Electron writes and
    // reads the same X selection through XWayland. Shelling out to
    // wl-paste/xsel in that case fails (no wayland socket, xsel not in the
    // GNOME runtime) and the fallback content mismatches what Electron
    // wrote, so the clear never fires.
    const preferElectronClipboard =
      process.env.GDK_BACKEND === 'x11' ||
      process.env.ELECTRON_OZONE_PLATFORM_HINT === 'x11' ||
      !isFlatpakRuntime()

    const current = preferElectronClipboard
      ? clipboard.readText()
      : readHostClipboardOrFallback(clipboard, logger)
    if (current === textToMatch) {
      if (preferElectronClipboard) {
        clipboard.clear()
      } else {
        clearHostClipboardOrFallback(clipboard, logger)
      }
    }
    removeClipboardCleanupTokenIfCurrent(statePath, token)
    removeFileIfExists(secretPath)
  } catch (err) {
    logger.warn(
      'MAIN',
      'In-process clipboard cleanup failed:',
      err && err.message ? err.message : err
    )
  }
}

function scheduleInProcessClipboardCleanup({
  clipboard,
  logger,
  statePath,
  secretPath,
  token,
  textToMatch,
  delayMs
}) {
  const timer = setTimeout(() => {
    pendingCleanups.delete(token)
    runInProcessClipboardCleanup({
      clipboard,
      logger,
      statePath,
      secretPath,
      token,
      textToMatch
    })
  }, delayMs)

  if (typeof timer.unref === 'function') timer.unref()

  pendingCleanups.set(token, {
    timer,
    statePath,
    secretPath,
    textToMatch
  })
}

function runInProcessClipboardClearOnQuit({
  clipboard,
  logger,
  statePath,
  secretPath,
  token
}) {
  // On quit we skip reading the clipboard to avoid hangs (wl-paste/xclip can
  // block the main thread and freeze shutdown). Entries in pendingCleanups
  // are secrets the user already asked to auto-clear, so clearing
  // unconditionally is safe.
  try {
    const preferElectronClipboard =
      process.env.GDK_BACKEND === 'x11' ||
      process.env.ELECTRON_OZONE_PLATFORM_HINT === 'x11' ||
      !isFlatpakRuntime()
    if (preferElectronClipboard) {
      try {
        clipboard.clear()
        clipboard.writeText('')
      } catch (_) {}
    } else {
      clearHostClipboardOrFallback(clipboard, logger)
    }
    clearSelectionViaBundledXsel()
  } catch (err) {
    logger.warn(
      'MAIN',
      'Clipboard clear on quit failed:',
      err && err.message ? err.message : err
    )
  }
  try {
    removeClipboardCleanupTokenIfCurrent(statePath, token)
  } catch (_) {}
  try {
    removeFileIfExists(secretPath)
  } catch (_) {}
}

function flushPendingClipboardCleanups({ clipboard, logger }) {
  for (const [token, entry] of pendingCleanups) {
    clearTimeout(entry.timer)
    runInProcessClipboardClearOnQuit({
      clipboard,
      logger,
      statePath: entry.statePath,
      secretPath: entry.secretPath,
      token
    })
  }
  pendingCleanups.clear()
}

function scheduleClipboardCleanup({
  app,
  clipboard,
  logger,
  isWindows,
  text,
  delayMs
}) {
  const finalDelayMs =
    Number.isFinite(delayMs) && delayMs > 0
      ? delayMs
      : DEFAULT_CLIPBOARD_CLEAR_DELAY_MS
  const textToMatch = typeof text === 'string' ? text : clipboard.readText()

  if (typeof textToMatch !== 'string' || textToMatch.length === 0) {
    return false
  }

  const token = crypto.randomUUID()
  const statePath = getClipboardCleanupStatePath(app)
  const secretPath = path.join(
    app.getPath('temp'),
    `pearpass-clipboard-secret-${token}.txt`
  )

  try {
    fs.writeFileSync(secretPath, textToMatch, { encoding: 'utf8', mode: 0o600 })
    fs.writeFileSync(statePath, token, { encoding: 'utf8', mode: 0o600 })

    scheduleInProcessClipboardCleanup({
      clipboard,
      logger,
      statePath,
      secretPath,
      token,
      textToMatch,
      delayMs: finalDelayMs
    })

    if (isWindows) {
      spawnDetachedWindowsClipboardHelper(
        secretPath,
        token,
        statePath,
        finalDelayMs
      )
    } else if (!isFlatpakRuntime()) {
      // In flatpak the detached helper runs inside the same sandbox as the
      // app and is killed when the app exits, so it can't clear the clipboard
      // after close. We instead rely on the in-process timer while the app is
      // open and on flushPendingClipboardCleanups to clear immediately on
      // quit.
      spawnDetachedClipboardHelper(secretPath, token, statePath, finalDelayMs)
    }

    return true
  } catch (err) {
    try {
      removeFileIfExists(secretPath)
      removeClipboardCleanupTokenIfCurrent(statePath, token)
    } catch (_) {}

    logger.warn(
      'MAIN',
      'Failed to schedule detached clipboard cleanup:',
      err && err.message ? err.message : err
    )
    return false
  }
}

module.exports = {
  flushPendingClipboardCleanups,
  scheduleClipboardCleanup
}
