import { useCallback } from 'react'
import { useLingui } from '@lingui/react'

/** Values for ICU-style placeholders in messages, e.g. `t('Hello {name}', { name: 'Ada' })` */
export type TranslationValues = Record<string, unknown>

/**
 * Custom hook for handling translations using Lingui
 * @returns {Object} Object containing the translation function
 * @returns {Function} t - Translation function: `t(key)` or `t(key, values)` for interpolated messages
 */
export const useTranslation = () => {
  const { i18n } = useLingui()

  const t = useCallback(
    (key: string, values?: TranslationValues): string => {
      if (values === undefined) {
        return i18n._(key)
      }
      return i18n._(key, values)
    },
    [i18n]
  )

  return {
    t
  }
}
