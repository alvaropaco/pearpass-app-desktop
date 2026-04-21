import type { ThemeColors } from '@tetherto/pearpass-lib-ui-kit'
import { rawTokens } from '@tetherto/pearpass-lib-ui-kit'

export const createStyles = (colors: ThemeColors) => ({
  section: {
    position: 'relative' as const,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'flex-start' as const,
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

  fieldContainer: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: `${rawTokens.spacing12}px`,
    padding: `${rawTokens.spacing12}px`,
    border: `1px solid ${colors.colorBorderPrimary}`,
    borderRadius: `${rawTokens.radius8}px`,
    width: '100%'
  },

  fieldDetails: {
    display: 'flex' as const,
    flex: '1 0 0' as const,
    flexDirection: 'column' as const,
    justifyContent: 'center' as const,
    gap: `${rawTokens.spacing4}px`,
    minWidth: 0
  },

  dropdownTrigger: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: `${rawTokens.spacing8}px`,
    padding: `${rawTokens.spacing12}px`,
    border: `1px solid ${colors.colorBorderPrimary}`,
    borderRadius: `${rawTokens.radius8}px`,
    background: 'transparent',
    color: colors.colorTextPrimary,
    cursor: 'pointer' as const
  },

  fadeawayGradient: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: '70px',
    pointerEvents: 'none' as const,
    background: `linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, ${colors.colorSurfacePrimary}B3 55%, ${colors.colorSurfacePrimary} 100%)`
  }
})
