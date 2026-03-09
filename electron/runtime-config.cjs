/**
 * Pear runtime config for P2P OTA updates.
 * Set your app's upgrade link (pear://...) and version here.
 * In production, version should match package.json; runtime checks version to decide when to update.
 */
const pkg = require('../package.json')

const pearRuntime = pkg.pearRuntime || {}

module.exports = {
  /** Upgrade link for P2P updates (required for OTA). Get from pear link or pear.json. */
  upgrade: pearRuntime.upgrade || process.env.PEARPASS_UPGRADE_LINK || null,
  /** Current app version; runtime fetches package.json from drive and compares. */
  version: pkg.version ?? 0
}
