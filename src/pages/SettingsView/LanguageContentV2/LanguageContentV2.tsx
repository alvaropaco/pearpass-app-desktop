import React, { useState } from 'react'

import { useLingui } from '@lingui/react'
import {
  Dropdown,
  NavbarListItem,
  Text,
  Title,
  useTheme
} from '@tetherto/pearpass-lib-ui-kit'
import { ExpandMore } from '@tetherto/pearpass-lib-ui-kit/icons'

import { useLanguageOptions } from '../../../hooks/useLanguageOptions'
import { useTranslation } from '../../../hooks/useTranslation'
import { createStyles } from './LanguageContentV2.styles'

export const LanguageContentV2 = (): React.ReactElement => {
  const { t } = useTranslation()
  const { i18n } = useLingui()
  const { theme } = useTheme()
  const styles = createStyles(theme.colors)

  const [isOpen, setIsOpen] = useState(false)

  type LanguageOption = {
    label: string
    value: string
    testId: string
  }

  const { languageOptions } = useLanguageOptions() as {
    languageOptions: LanguageOption[]
  }
  const selectedLanguage = languageOptions.find(
    (lang: LanguageOption) => lang.value === i18n.locale
  )

  const handleLanguageSelect = (value: string) => {
    i18n.activate(value)
    setIsOpen(false)
  }

  return (
    <section style={styles.section} data-testid="settings-language-v2">
      <div style={styles.header}>
        <Title as="h2">{t('Language')}</Title>
        {/* @ts-ignore - plain CSS object */}
        <Text
          as="p"
          variant="body"
          color={theme.colors.colorTextSecondary}
          style={styles.descriptionText}
        >
          {t('Choose the language of the app.')}
        </Text>
      </div>

      <div
        style={styles.fieldContainer}
        data-testid="settings-language-v2-field"
      >
        <div style={styles.fieldDetails}>
          <Text
            variant="bodyEmphasized"
            color={theme.colors.colorTextPrimary}
          >
            {t('App Language')}
          </Text>
          <Text
            variant="caption"
            color={theme.colors.colorTextSecondary}
          >
            {t('Select the language used throughout PearPass.')}
          </Text>
        </div>

        <Dropdown
          open={isOpen}
          onOpenChange={setIsOpen}
          testID="settings-language-v2-dropdown"
          trigger={
            <button
              type="button"
              style={styles.dropdownTrigger}
              data-testid="settings-language-v2-dropdown-trigger"
            >
              <Text
                variant="bodyEmphasized"
                color={theme.colors.colorTextPrimary}
              >
                {selectedLanguage?.label ?? t('Select')}
              </Text>
              <ExpandMore
                width={14}
                height={14}
                style={{ color: theme.colors.colorTextPrimary }}
              />
            </button>
          }
        >
          {languageOptions.map((option: LanguageOption) => (
            <NavbarListItem
              key={option.value}
              label={option.label}
              selected={option.value === i18n.locale}
              onClick={() => handleLanguageSelect(option.value)}
              testID={option.testId}
            />
          ))}
        </Dropdown>
      </div>

    </section>
  )
}
