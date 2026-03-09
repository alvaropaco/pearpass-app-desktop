/**
 * Electron-only entry for the renderer bundle (nodeIntegration: true).
 */
import React from 'react'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { ThemeProvider } from 'pearpass-lib-ui-theme-provider'
import { setPearpassVaultClient, VaultProvider } from 'pearpass-lib-vault'
import { createRoot } from 'react-dom/client'

import { App } from './src/app/App'
import { LoadingProvider } from './src/context/LoadingContext'
import { ModalProvider } from './src/context/ModalContext'
import { RouterProvider } from './src/context/RouterContext'
import { ToastProvider } from './src/context/ToastContext'
import { messages } from './src/locales/en/messages.mjs'
import {
  getElectronConfig,
  getElectronVaultClient
} from './src/electron'
import { createOrGetPearpassClient } from './src/services/createOrGetPearpassClient'
import { getNativeMessagingEnabled } from './src/services/nativeMessagingPreferences'
import { startNativeMessagingIPC } from './src/services/nativeMessagingIPCServer'
import { logger } from './src/utils/logger'
import { setFontsAndResetCSS } from './styles'

setFontsAndResetCSS()
i18n.load('en', messages)
i18n.activate('en')

function renderApp(client: Parameters<typeof setPearpassVaultClient>[0]) {
  const container = document.querySelector('#root')
  if (!container) throw new Error('Failed to find the root element')
  const root = createRoot(container)
  root.render(
    <LoadingProvider>
      <ThemeProvider>
        <VaultProvider>
          <I18nProvider i18n={i18n}>
            <ToastProvider>
              <RouterProvider>
                <ModalProvider>
                  <App />
                </ModalProvider>
              </RouterProvider>
            </ToastProvider>
          </I18nProvider>
        </VaultProvider>
      </ThemeProvider>
    </LoadingProvider>
  )
}

async function init() {
  const config = await getElectronConfig()
  const client = await getElectronVaultClient()
  if (!config || !client) throw new Error('Electron config or vault client missing')

  const api = window.electronAPI!
  ;(window as unknown as { Pear: object }).Pear = {
    config: {
      storage: config.storage,
      key: config.key,
      applink: config.applink || ''
    },
    updated: () => api.checkUpdated(),
    updates: (cb: (update?: unknown) => void) => {
      const unsub1 = api.onRuntimeUpdating(() => cb({}))
      const unsub2 = api.onRuntimeUpdated(() => cb({}))
      return () => {
        unsub1()
        unsub2()
      }
    },
    reload: () => window.location.reload(),
    restart: () => api.restart(),
    teardown: () => {}
  }

  // Seed shared PearPass client singleton so code that calls
  // createOrGetPearpassClient() without arguments (e.g. extension pairing)
  // can reuse this Electron vault client instance and storage path.
  createOrGetPearpassClient(client as any, config.storage, { debugMode: true })

  setPearpassVaultClient(client)
  if (getNativeMessagingEnabled()) {
    startNativeMessagingIPC(client as any).catch((err: unknown) => {
      logger.error('INDEX', 'Failed to start IPC server:', err)
    })
  }

  renderApp(client)
}

init()
