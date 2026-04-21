import type { ThemeColors } from '@tetherto/pearpass-lib-ui-kit'
import { rawTokens } from '@tetherto/pearpass-lib-ui-kit'

export const createStyles = (colors: ThemeColors) => ({
  section: {
    position: 'relative' as const,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'flex-end' as const,
    gap: `${rawTokens.spacing24}px`,
    width: '100%',
    padding: `${rawTokens.spacing20}px`
  },

  header: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: `${rawTokens.spacing6}px`,
    width: '100%'
  },

  descriptionText: {
    fontSize: `${rawTokens.fontSize14}px`,
    fontWeight: rawTokens.weightRegular,
    lineHeight: 'normal' as const
  },

  descriptionLink: {
    fontWeight: rawTokens.weightMedium
  },

  fieldContainer: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    alignSelf: 'stretch' as const,
    gap: `${rawTokens.spacing12}px`,
    padding: `15px ${rawTokens.spacing12}px`,
    border: `1px solid ${colors.colorBorderPrimary}`,
    borderRadius: `${rawTokens.radius8}px`,
    width: '100%'
  },

  checkForUpdatesButton: {
    display: 'flex' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: `${rawTokens.spacing4}px`,
    padding: `${rawTokens.spacing8}px ${rawTokens.spacing12}px`,
    borderRadius: `${rawTokens.radius8}px`,
    background: colors.colorPrimary,
    border: 'none',
    color: colors.colorOnPrimary,
    cursor: 'pointer' as const
  }
})
