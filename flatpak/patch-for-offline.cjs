#!/usr/bin/env node
/**
 * Patches package.json and package-lock.json for Flatpak offline builds.
 *
 * Replaces git+ssh:// / git+https:// dependency specifiers and resolved URLs
 * with file: references to pre-packed tarballs (flatpak/packed-deps/) and
 * stub packages (flatpak/swarmconf-stub/, flatpak/node-gyp-stub/).
 *
 * Run this BEFORE `npm install --offline` inside the Flatpak build sandbox.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const PACKED_DIR = path.join(ROOT, 'flatpak', 'packed-deps');

// No stubs needed - transitive git deps are handled by:
// - Tarballs in flatpak/packed-deps/ for deps with pre-packed archives
// - Removal from lockfile for optional deps (npm skips missing optional deps)

// ── Build tarball index: internalName -> { tarball, version, integrity } ──
function buildTarballIndex() {
  const index = {};
  for (const file of fs.readdirSync(PACKED_DIR).filter(f => f.endsWith('.tgz'))) {
    const tarPath = path.join(PACKED_DIR, file);
    const pkgJson = extractPackageJson(tarPath);
    if (!pkgJson) continue;

    const hash = crypto.createHash('sha512');
    hash.update(fs.readFileSync(tarPath));
    const integrity = 'sha512-' + hash.digest('base64');

    index[pkgJson.name] = {
      tarball: file,
      version: pkgJson.version,
      integrity,
      filePath: 'flatpak/packed-deps/' + file
    };
  }
  return index;
}

function extractPackageJson(tarPath) {
  // Read tarball and find package/package.json entry
  const buf = fs.readFileSync(tarPath);
  // Simple tar extraction for package.json
  const { execSync } = require('child_process');
  try {
    const out = execSync(`tar xzf "${tarPath}" -O package/package.json`, { encoding: 'utf8' });
    return JSON.parse(out);
  } catch {
    return null;
  }
}

// ── Main ──
const tarballIndex = buildTarballIndex();
console.log(`Found ${Object.keys(tarballIndex).length} packed tarballs`);

// Read files
const pkgPath = path.join(ROOT, 'package.json');
const lockPath = path.join(ROOT, 'package-lock.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

let patchedDeps = 0;
let patchedLock = 0;

// ���─ Patch package.json: replace git dep specifiers ──
for (const section of ['dependencies', 'devDependencies']) {
  if (!pkg[section]) continue;
  for (const [name, spec] of Object.entries(pkg[section])) {
    if (typeof spec !== 'string' || !spec.startsWith('git+')) continue;

    // Try to find matching tarball by internal package name
    const lockEntry = lock.packages?.['node_modules/' + name];
    const internalName = lockEntry?.name || name.split('/').pop();
    const tb = tarballIndex[internalName] || tarballIndex[name];

    if (tb) {
      pkg[section][name] = 'file:' + tb.filePath;
      patchedDeps++;
    } else {
      // No tarball available - remove the dep (npm will skip optional ones)
      delete pkg[section][name];
      patchedDeps++;
      console.log(`Removed git dep without tarball: ${name}`);
    }
  }
}

// ── Patch package.json overrides: remove all git overrides ──
// Git overrides for transitive deps cause file: path resolution issues
// (npm resolves from consuming package, not project root). The lockfile
// patching below handles these deps correctly instead.
if (pkg.overrides) {
  for (const [name, spec] of Object.entries(pkg.overrides)) {
    if (typeof spec === 'string' && spec.startsWith('git+')) {
      delete pkg.overrides[name];
      patchedDeps++;
      console.log(`Removed git override: ${name}`);
    }
  }
}

// ── Patch package-lock.json ──

// 1. Patch root package entry's deps
const rootEntry = lock.packages?.[''];
if (rootEntry) {
  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    if (!rootEntry[section]) continue;
    for (const [name, spec] of Object.entries(rootEntry[section])) {
      if (typeof spec !== 'string' || !spec.startsWith('git+')) continue;
      const lockEntry = lock.packages?.['node_modules/' + name];
      const internalName = lockEntry?.name || name.split('/').pop();
      const tb = tarballIndex[internalName] || tarballIndex[name];
      if (tb) {
        rootEntry[section][name] = 'file:' + tb.filePath;
      }
      // No tarball → leave as-is (will be removed from lockfile below if optional)
    }
  }
}

// 2. Patch resolved URLs in all package entries
for (const [key, info] of Object.entries(lock.packages || {})) {
  if (!key.startsWith('node_modules/')) continue;
  if (!info.resolved || !info.resolved.startsWith('git+')) continue;

  const depName = key.replace('node_modules/', '');
  const internalName = info.name || depName.split('/').pop();

  // Check for tarball match
  const tb = tarballIndex[internalName] || tarballIndex[depName];
  if (tb) {
    // Replace git resolved URL with file: tarball reference
    // Lockfile file: paths resolve from the project root
    info.resolved = 'file:' + tb.filePath;
    info.integrity = tb.integrity;
    // Keep nested node_modules entries - their tarballs are in the npm cache
    // via generated-sources.json and npm needs them for dependency resolution
    patchedLock++;
  } else if (info.optional) {
    // Optional dep with no tarball (e.g. @tetherto/swarmconf) - remove entirely
    // npm will skip missing optional deps gracefully
    delete lock.packages[key];
    patchedLock++;
    console.log(`Removed optional git dep from lockfile: ${depName}`);
  } else {
    console.warn(`WARNING: No tarball for lockfile entry ${key} (internal: ${internalName})`);
  }
}

// 3. Replace git specifiers in dependency fields of ALL lockfile entries
// npm reads these specifiers and tries to resolve them, even with a lockfile.
// Build a map of known git dep names -> their patched version
const patchedVersions = {};
for (const [key, info] of Object.entries(lock.packages || {})) {
  if (!key.startsWith('node_modules/')) continue;
  if (info.resolved && info.resolved.startsWith('file:')) {
    const depName = key.replace('node_modules/', '');
    patchedVersions[depName] = info.version || '*';
  }
}

let patchedSpecs = 0;
for (const [key, info] of Object.entries(lock.packages || {})) {
  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    if (!info[section]) continue;
    for (const [dep, spec] of Object.entries(info[section])) {
      if (typeof spec !== 'string' || !spec.startsWith('git+')) continue;
      if (patchedVersions[dep]) {
        info[section][dep] = patchedVersions[dep];
        patchedSpecs++;
      } else {
        // Optional dep or one we removed - delete the reference
        delete info[section][dep];
        patchedSpecs++;
      }
    }
  }
}
if (patchedSpecs > 0) console.log(`Patched ${patchedSpecs} git specifiers in lockfile dependency fields`);

// Write patched files
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');

console.log(`Patched ${patchedDeps} deps in package.json`);
console.log(`Patched ${patchedLock} entries in package-lock.json`);
console.log('Done - ready for offline npm install');
