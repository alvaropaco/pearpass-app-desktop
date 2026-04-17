import { useState, useCallback } from 'react'

import { useTheme } from '@tetherto/pearpass-lib-ui-kit'
import { html } from 'htm/react'

import { appConfig } from './appConfig'
import { useInactivity } from './hooks/useInactivity'
import { useOnExtensionExit } from './hooks/useOnExtensionExit'
import { useOnExtensionLockOut } from './hooks/useOnExtensionLockOut'
import { useRedirect } from './hooks/useRedirect'
import { TitleBar } from '../../components/TitleBar'
import { AppHeaderContainer } from '../../containers/AppHeaderContainer'
import { useRouter } from '../../context/RouterContext'
import { usePearUpdate } from '../../hooks/usePearUpdate'
import { useSimulatedLoading } from '../../hooks/useSimulatedLoading'
import { Routes } from '../Routes'
import { ContentFrame, WindowBackground } from './styles'
import { isV2 } from '../../utils/designVersion'

export const App = () => {
  const { theme } = useTheme()
  const { currentPage } = useRouter()
  usePearUpdate()
  const isSimulatedLoading = useSimulatedLoading()
  const [isLoadingPageComplete, setIsLoadingPageComplete] = useState(false)

  useInactivity()
  const { isLoading: isDataLoading } = useRedirect()

  useOnExtensionExit()
  useOnExtensionLockOut()

  const handleLoadingComplete = useCallback(() => {
    setIsLoadingPageComplete(true)
  }, [])

  const showLoadingPage = isV2()
    ? isDataLoading || !isLoadingPageComplete
    : !isSimulatedLoading && (isDataLoading || !isLoadingPageComplete)

  if (isV2()) {
    const useLogoTitleBar = appConfig.headerWithLogo.includes(currentPage)
    return html`
      <${WindowBackground} $backgroundColor=${theme.colors.colorBackground}>
        ${useLogoTitleBar
          ? html`<${TitleBar} />`
          : html`<${AppHeaderContainer} />`}
        <${ContentFrame}
          $backgroundColor=${theme.colors.colorBackground}
          $borderColor=${theme.colors.colorBorderPrimary}
        >
          <${Routes}
            isSplashScreenShown=${false}
            isDataLoading=${showLoadingPage}
            onLoadingComplete=${handleLoadingComplete}
          />
        <//>
      <//>
    `
  }

  return html`
    <${Routes}
      isSplashScreenShown=${isSimulatedLoading}
      isDataLoading=${showLoadingPage}
      onLoadingComplete=${handleLoadingComplete}
    />
  `
}
