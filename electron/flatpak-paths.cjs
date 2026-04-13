const fs = require('fs')
const path = require('path')

function isFlatpakRuntime(options = {}) {
  const env = options.env || process.env
  const existsSync = options.existsSync || fs.existsSync
  const flatpakInfoPath = options.flatpakInfoPath || '/.flatpak-info'

  return Boolean(env.FLATPAK_ID) || existsSync(flatpakInfoPath)
}

function getHostHome(options = {}) {
  const env = options.env || process.env
  if (!isFlatpakRuntime(options)) return env.HOME || ''
  // Inside flatpak $HOME is remapped to the per-app sandbox home.
  // With --filesystem=home the real host home is mounted at /home/$USER
  // and is where host-side browsers (e.g. Chrome) read NativeMessagingHosts.
  const user = env.USER || env.USERNAME
  return user ? path.join('/home', user) : env.HOME || ''
}

function getFlatpakCompatRoots(options = {}) {
  const env = options.env || process.env
  const homeDir = env.HOME

  if (!homeDir) return null

  return {
    config: path.join(homeDir, '.config'),
    data: path.join(homeDir, '.config', 'pearpass-flatpak-data'),
    cache: path.join(homeDir, '.config', 'pearpass-flatpak-cache')
  }
}

function mapFlatpakPathToSandbox(targetPath, options = {}) {
  if (!targetPath || typeof targetPath !== 'string') return targetPath

  const env = options.env || process.env
  const compatRoots = getFlatpakCompatRoots(options)
  if (!compatRoots) return targetPath

  const mappings = [
    [env.XDG_CONFIG_HOME, compatRoots.config],
    [env.XDG_DATA_HOME, compatRoots.data],
    [env.XDG_CACHE_HOME, compatRoots.cache]
  ].filter(([prefix]) => typeof prefix === 'string' && prefix.length > 0)

  for (const [hostPrefix, sandboxPrefix] of mappings) {
    if (targetPath === hostPrefix) return sandboxPrefix
    if (targetPath.startsWith(hostPrefix + path.sep)) {
      return path.join(sandboxPrefix, path.relative(hostPrefix, targetPath))
    }
  }

  return targetPath
}

function getSandboxSafePath(targetPath, options = {}) {
  if (!isFlatpakRuntime(options)) return targetPath
  return mapFlatpakPathToSandbox(targetPath, options)
}

module.exports = {
  getFlatpakCompatRoots,
  getHostHome,
  getSandboxSafePath,
  isFlatpakRuntime,
  mapFlatpakPathToSandbox
}
