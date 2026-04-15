/* eslint-env jest */

jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  readFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  writeFileSync: jest.fn()
}))

jest.mock('./flatpak-paths.cjs', () => ({
  isFlatpakRuntime: jest.fn(() => false)
}))

jest.mock('./clipboardCleanupHelper.cjs', () => ({
  readClipboard: jest.fn(() => ''),
  clearClipboard: jest.fn()
}))

jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'token-1')
}))

jest.mock('child_process', () => ({
  spawn: jest.fn(() => ({
    unref: jest.fn()
  }))
}))

describe('clipboardCleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('clears the clipboard in-process after delay when token still current', () => {
    jest.useFakeTimers()
    const fs = require('fs')
    const { scheduleClipboardCleanup } = require('./clipboardCleanup.cjs')

    const app = {
      getPath: jest.fn(() => '/tmp')
    }
    const clipboard = {
      readText: jest.fn(() => 'secret'),
      clear: jest.fn()
    }
    const logger = { warn: jest.fn() }

    fs.readFileSync.mockReturnValue('token-1')

    scheduleClipboardCleanup({
      app,
      clipboard,
      logger,
      isWindows: false,
      text: 'secret',
      delayMs: 30000
    })

    jest.advanceTimersByTime(30000)

    expect(clipboard.clear).toHaveBeenCalledTimes(1)
    jest.useRealTimers()
  })

  it('flushPendingClipboardCleanups clears clipboard immediately when token still current', () => {
    jest.useFakeTimers()
    const fs = require('fs')
    const {
      flushPendingClipboardCleanups,
      scheduleClipboardCleanup
    } = require('./clipboardCleanup.cjs')

    const app = { getPath: jest.fn(() => '/tmp') }
    const clipboard = {
      readText: jest.fn(() => 'secret'),
      clear: jest.fn()
    }
    const logger = { warn: jest.fn() }

    fs.readFileSync.mockReturnValue('token-1')

    scheduleClipboardCleanup({
      app,
      clipboard,
      logger,
      isWindows: false,
      text: 'secret',
      delayMs: 30000
    })

    flushPendingClipboardCleanups({ clipboard, logger })

    expect(clipboard.clear).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(30000)
    expect(clipboard.clear).toHaveBeenCalledTimes(1)
    jest.useRealTimers()
  })

  it('does not clear the clipboard in-process when user copied something else', () => {
    jest.useFakeTimers()
    const fs = require('fs')
    const { scheduleClipboardCleanup } = require('./clipboardCleanup.cjs')

    const app = { getPath: jest.fn(() => '/tmp') }
    const clipboard = {
      readText: jest
        .fn()
        .mockReturnValueOnce('secret')
        .mockReturnValue('something-else'),
      clear: jest.fn()
    }
    const logger = { warn: jest.fn() }

    fs.readFileSync.mockReturnValue('token-1')

    scheduleClipboardCleanup({
      app,
      clipboard,
      logger,
      isWindows: false,
      delayMs: 30000
    })

    jest.advanceTimersByTime(30000)

    expect(clipboard.clear).not.toHaveBeenCalled()
    jest.useRealTimers()
  })

  it('skips the detached helper in flatpak and clears via host tools in-process', () => {
    jest.useFakeTimers()
    const fs = require('fs')
    const { spawn } = require('child_process')
    const { isFlatpakRuntime } = require('./flatpak-paths.cjs')
    const clipboardHelper = require('./clipboardCleanupHelper.cjs')
    const { scheduleClipboardCleanup } = require('./clipboardCleanup.cjs')

    isFlatpakRuntime.mockReturnValue(true)
    clipboardHelper.readClipboard.mockReturnValue('secret')

    const app = { getPath: jest.fn(() => '/tmp') }
    const clipboard = {
      readText: jest.fn(() => 'secret'),
      clear: jest.fn()
    }
    const logger = { warn: jest.fn() }

    fs.readFileSync.mockReturnValue('token-1')

    scheduleClipboardCleanup({
      app,
      clipboard,
      logger,
      isWindows: false,
      text: 'secret',
      delayMs: 30000
    })

    expect(spawn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(30000)

    expect(clipboardHelper.clearClipboard).toHaveBeenCalledTimes(1)
    expect(clipboard.clear).not.toHaveBeenCalled()
    jest.useRealTimers()
  })

  it('uses the Windows script', () => {
    const path = require('path')
    const fs = require('fs')
    const { spawn } = require('child_process')
    const { scheduleClipboardCleanup } = require('./clipboardCleanup.cjs')

    const app = {
      getPath: jest.fn((name) =>
        name === 'temp' ? 'C:\\Temp' : `/unknown/${name}`
      )
    }
    const clipboard = {
      readText: jest.fn(() => 'secret')
    }
    const logger = {
      warn: jest.fn()
    }

    const result = scheduleClipboardCleanup({
      app,
      clipboard,
      logger,
      isWindows: true,
      text: 'secret',
      delayMs: 30000
    })

    expect(result).toBe(true)
    expect(fs.writeFileSync).toHaveBeenNthCalledWith(
      1,
      path.join('C:\\Temp', 'pearpass-clipboard-secret-token-1.txt'),
      'secret',
      { encoding: 'utf8', mode: 0o600 }
    )
    expect(fs.writeFileSync).toHaveBeenNthCalledWith(
      2,
      path.join('C:\\Temp', 'pearpass-clipboard-cleanup-current.token'),
      'token-1',
      { encoding: 'utf8', mode: 0o600 }
    )
    expect(spawn).toHaveBeenCalledWith(
      'cmd.exe',
      expect.arrayContaining([
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
        path.join(process.cwd(), 'electron', 'clipboardCleanup.windows.ps1')
      ]),
      expect.objectContaining({
        detached: true,
        stdio: 'inherit',
        windowsHide: true
      })
    )
  })
})
