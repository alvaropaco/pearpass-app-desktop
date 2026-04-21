import { useState } from 'react'

import { colors } from '@tetherto/pearpass-lib-ui-theme-provider'
import { html } from 'htm/react'

import { AboutContent } from './AboutContent'
import { AboutContentV2 } from './AboutContentV2/AboutContentV2'
import { AppearanceContent } from './AppearanceContent'
import { LanguageContentV2 } from './LanguageContentV2/LanguageContentV2'
import { SecurityContent } from './SecurityContent'
import {
  NavBar,
  NavItems,
  SettingsContentArea,
  SettingsContentInner,
  SettingsNavItem,
  SettingsSidebar,
  Wrapper
} from './styles'
import { SyncingContent } from './SyncingContent'
import { VaultContent } from './VaultContent'
import { useRouter } from '../../context/RouterContext'
import { useTranslation } from '../../hooks/useTranslation'
import {
  AboutIcon,
  AppearanceIcon,
  BackIcon,
  ButtonRoundIcon,
  SecurityIcon,
  SyncingIcon,
  VaultIcon
} from '../../lib-react-components'
import { isV2 } from '../../utils/designVersion'

const NAV_ITEMS = [
  { key: 'security', label: 'Security', icon: SecurityIcon },
  { key: 'syncing', label: 'Syncing', icon: SyncingIcon },
  { key: 'vault', label: 'Vault', icon: VaultIcon },
  { key: 'appearance', label: 'Appearance', icon: AppearanceIcon },
  { key: 'about', label: 'About', icon: AboutIcon }
]

const renderActiveContent = (activeTab) => {
  switch (activeTab) {
    case 'security':
      return html`<${SecurityContent} />`
    case 'syncing':
      return html`<${SyncingContent} />`
    case 'vault':
      return html`<${VaultContent} />`
    case 'appearance':
      return isV2()
        ? html`<${LanguageContentV2} />`
        : html`<${AppearanceContent} />`
    case 'about':
      return isV2() ? html`<${AboutContentV2} />` : html`<${AboutContent} />`
    default:
      return null
  }
}

export const SettingsView = () => {
  const { t } = useTranslation()
  const { navigate, data } = useRouter()

  const handleGoBack = () => {
    navigate('vault', { recordType: 'all' })
  }

  const [activeTab, setActiveTab] = useState(data?.initialTab || 'security')

  return html`
    <${Wrapper}>
      <${SettingsSidebar}>
        <${NavBar}>
          <${ButtonRoundIcon} onClick=${handleGoBack} startIcon=${BackIcon} />
          ${t('Settings')}
        <//>

        <${NavItems}>
          ${NAV_ITEMS.map(
            (item) => html`
              <${SettingsNavItem}
                key=${item.key}
                data-testid=${`settings-nav-${item.key}`}
                isActive=${activeTab === item.key}
                onClick=${() => setActiveTab(item.key)}
              >
                <${item.icon}
                  size="20"
                  color=${activeTab === item.key
                    ? colors.primary400.mode1
                    : undefined}
                />
                ${t(item.label)}
              <//>
            `
          )}
        <//>
      <//>

      <${SettingsContentArea}>
        <${SettingsContentInner}> ${renderActiveContent(activeTab)} <//>
      <//>
    <//>
  `
}
