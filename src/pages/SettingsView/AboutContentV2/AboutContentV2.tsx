import React, { useEffect, useState } from 'react'

import {
  Link,
  Text,
  Title,
  useTheme
} from '@tetherto/pearpass-lib-ui-kit'
import { PRIVACY_POLICY, TERMS_OF_USE } from '@tetherto/pearpass-lib-constants'

import { useToast } from '../../../context/ToastContext'
import { useTranslation } from '../../../hooks/useTranslation'
import { logger } from '../../../utils/logger'
import { createStyles } from './AboutContentV2.styles'

const WEBSITE_URL = 'https://pass.pears.com'

export const AboutContentV2 = (): React.ReactElement => {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { setToast } = useToast()
  const styles = createStyles(theme.colors)

  const [currentVersion, setCurrentVersion] = useState('')
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    const electronAPI = window.electronAPI
    if (!electronAPI || typeof electronAPI.getConfig !== 'function') {
      return
    }

    electronAPI
      .getConfig()
      .then((cfg) => {
        if (cfg && typeof cfg.version === 'string') {
          setCurrentVersion(cfg.version)
        }
      })
      .catch((error) =>
        logger.error(
          'AboutContentV2',
          'Error getting runtime config:',
          error
        )
      )
  }, [])

  const handleCheckForUpdates = async () => {
    const electronAPI = window.electronAPI
    if (isChecking || !electronAPI?.checkUpdated) {
      return
    }

    try {
      setIsChecking(true)
      const hasUpdate = await electronAPI.checkUpdated()

      setToast({
        message: hasUpdate
          ? t('Update available. Restart the app to apply it.')
          : t('You are on the latest version.')
      })
    } catch (error) {
      logger.error(
        'AboutContentV2',
        'Error checking for updates:',
        error
      )
      setToast({
        message: t('Could not check for updates. Please try again.')
      })
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <section style={styles.section} data-testid="settings-about-v2">
      <div style={styles.header}>
        <Title as="h2">{t('App version')}</Title>
        {/* @ts-ignore - plain CSS object */}
        <Text
          as="p"
          variant="body"
          color={theme.colors.colorTextSecondary}
          style={styles.descriptionText}
        >
          {t('Here you can find all the info about your app.')}
          <br />
          {t('Check here to see the')}{' '}
          {/* @ts-ignore - plain CSS object */}
          <Link href={TERMS_OF_USE} isExternal style={styles.descriptionLink}>
            {t('Terms of Use')}
          </Link>
          {', '}
          {/* @ts-ignore - plain CSS object */}
          <Link href={PRIVACY_POLICY} isExternal style={styles.descriptionLink}>
            {t('Privacy Statement')}
          </Link>{' '}
          {t('and')}{' '}
          {/* @ts-ignore - plain CSS object */}
          <Link href={WEBSITE_URL} isExternal style={styles.descriptionLink}>
            {t('visit our website')}
          </Link>
          .
        </Text>
      </div>

      <div
        style={styles.fieldContainer}
        data-testid="settings-about-v2-app-version"
      >
        <Text
          variant="bodyEmphasized"
          color={theme.colors.colorTextPrimary}
        >
          {t('App version')}
        </Text>
        <Text variant="body" color={theme.colors.colorPrimary}>
          {currentVersion}
        </Text>
      </div>

      <button
        type="button"
        style={styles.checkForUpdatesButton}
        disabled={isChecking}
        onClick={handleCheckForUpdates}
        data-testid="settings-about-v2-check-for-updates"
      >
        {isChecking ? t('Checking…') : t('Check for updates')}
      </button>
    </section>
  )
}
