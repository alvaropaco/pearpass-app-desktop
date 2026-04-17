#!/usr/bin/env node
/**
 * Patches package.json and package-lock.json for Flatpak offline builds.
 *
 * Replaces git+ssh:// / git+https:// dependency specifiers and resolved URLs
 * with file: references to pre-packed tarballs (flatpak/packed-deps/).
 *
 * Run this BEFORE `npm install --offline` inside the Flatpak build sandbox.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const PACKED_DIR = path.join(ROOT, 'flatpak', 'packed-deps');

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
  const { execSync } = require('child_process');
  try {
    const out = execSync(`tar xzf "${tarPath}" -O package/package.json`, { encoding: 'utf8' });
    return JSON.parse(out);
  } catch {
    return null;
  }
}

const tarballIndex = buildTarballIndex();
console.log(`Found ${Object.keys(tarballIndex).length} packed tarballs`);

const pkgPath = path.join(ROOT, 'package.json');
const lockPath = path.join(ROOT, 'package-lock.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

let patchedDeps = 0;
let patchedLock = 0;

for (const section of ['dependencies', 'devDependencies']) {
  if (!pkg[section]) continue;
  for (const [name, spec] of Object.entries(pkg[section])) {
    if (typeof spec !== 'string' || !spec.startsWith('git+')) continue;

    const lockEntry = lock.packages?.['node_modules/' + name];
    const internalName = lockEntry?.name || name.split('/').pop();
    const tb = tarballIndex[internalName] || tarballIndex[name];

    if (tb) {
      pkg[section][name] = 'file:' + tb.filePath;
      patchedDeps++;
    } else {
      delete pkg[section][name];
      patchedDeps++;
      console.log(`Removed git dep without tarball: ${name}`);
    }
  }
}

if (pkg.overrides) {
  for (const [name, spec] of Object.entries(pkg.overrides)) {
    if (typeof spec === 'string' && spec.startsWith('git+')) {
      delete pkg.overrides[name];
      patchedDeps++;
      console.log(`Removed git override: ${name}`);
    }
  }
}

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
    }
  }
}

for (const [key, info] of Object.entries(lock.packages || {})) {
  if (!key.startsWith('node_modules/')) continue;
  if (!info.resolved || !info.resolved.startsWith('git+')) continue;

  const depName = key.replace('node_modules/', '');
  const internalName = info.name || depName.split('/').pop();

  const tb = tarballIndex[internalName] || tarballIndex[depName];
  if (tb) {
    info.resolved = 'file:' + tb.filePath;
    info.integrity = tb.integrity;
    patchedLock++;
  } else if (info.optional) {
    delete lock.packages[key];
    patchedLock++;
    console.log(`Removed optional git dep from lockfile: ${depName}`);
  } else {
    console.warn(`WARNING: No tarball for lockfile entry ${key} (internal: ${internalName})`);
  }
}

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
        delete info[section][dep];
        patchedSpecs++;
      }
    }
  }
}
if (patchedSpecs > 0) console.log(`Patched ${patchedSpecs} git specifiers in lockfile dependency fields`);

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');

console.log(`Patched ${patchedDeps} deps in package.json`);
console.log(`Patched ${patchedLock} entries in package-lock.json`);
console.log('Done - ready for offline npm install');
