const { spawnSync } = require('child_process')

const {
  readClipboardWithFallback,
  clearClipboardWithFallback
} = require('./linuxWaylandClipboardFallback.cjs')

function isWaylandSession() {
  // Electron is pinned to X11 via --ozone-platform=x11 / GDK_BACKEND=x11 in
  // the Flatpak wrapper because the sandbox only holds --socket=x11. In that
  // mode the app's clipboard lives on the X server (XWayland), so reading it
  // with wl-paste would miss our writes and fail to match the cleanup secret.
  if (process.env.GDK_BACKEND === 'x11') return false
  if (process.env.ELECTRON_OZONE_PLATFORM_HINT === 'x11') return false
  return (
    Boolean(process.env.WAYLAND_DISPLAY) ||
    process.env.XDG_SESSION_TYPE === 'wayland'
  )
}

function runCommand(command, args, input) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    input,
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 1500,
    killSignal: 'SIGKILL'
  })
}

function readClipboard() {
  const result = runCommand('wl-paste', ['--no-newline'], undefined)

  if (result.error) {
    return readClipboardWithFallback()
  }

  if (result.status === 0) return result.stdout || ''
  if (result.status === 1) return ''

  process.stderr.write(
    `[linuxWaylandClipboard] wl-paste exited with unexpected status ${result.status}: ${result.stderr}\n`
  )
  return readClipboardWithFallback()
}

function clearClipboard() {
  const clearResult = runCommand('wl-copy', ['--clear'], undefined)

  if (!clearResult.error && clearResult.status === 0) return true

  if (clearResult.error) {
    return clearClipboardWithFallback()
  }

  process.stderr.write(
    `[linuxWaylandClipboard] wl-copy --clear failed (status ${clearResult.status}), trying empty input fallback: ${clearResult.stderr}\n`
  )

  const emptyResult = runCommand('wl-copy', [], '')
  if (!emptyResult.error && emptyResult.status === 0) return true

  process.stderr.write(
    `[linuxWaylandClipboard] wl-copy empty fallback also failed (status ${emptyResult.status}): ${emptyResult.stderr}\n`
  )

  return clearClipboardWithFallback()
}

module.exports = {
  clearClipboard,
  isWaylandSession,
  readClipboard
}
