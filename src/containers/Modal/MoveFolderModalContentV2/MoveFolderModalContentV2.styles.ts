import type { ThemeColors } from '@tetherto/pearpass-lib-ui-kit'
import { rawTokens } from '@tetherto/pearpass-lib-ui-kit'

export const createStyles = (colors: ThemeColors) => ({
  body: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: `${rawTokens.spacing8}px`,
    width: '100%'
  },
  itemsListHeader: {
    marginBottom: `${rawTokens.spacing16}px`,
  },
  itemRow: {
    display: 'flex' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: `${rawTokens.spacing12}px`,
    width: '100%'
  },
  itemText: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: `${rawTokens.spacing4}px`,
    minWidth: 0,
    flex: 1
  },
  itemsList: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: `${rawTokens.spacing24}px`,
    width: '100%',
    maxHeight: '220px',
    overflowY: 'auto' as const,
    paddingLeft: `${rawTokens.spacing12}px`,
  },
  destinationHint: {
    marginTop: `${rawTokens.spacing16}px`,
    width: '100%'
  },
  chipRow: {
    display: 'flex' as const,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: `${rawTokens.spacing12}px`,
    width: '100%',
    maxHeight: '100px',
    overflowY: 'auto' as const,
  },
  chip: {
    display: 'flex' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: `${rawTokens.spacing8}px`,
    paddingBlock: `${rawTokens.spacing8}px`,
    paddingInline: `${rawTokens.spacing12}px`,
    borderRadius: `${rawTokens.radius8}px`,
    borderWidth: 1,
    borderStyle: 'solid' as const,
    cursor: 'pointer' as const,
    fontFamily: rawTokens.fontPrimary,
    fontSize: `${rawTokens.fontSize12}px`,
    fontWeight: rawTokens.weightMedium,
    lineHeight: 'normal' as const,
    boxSizing: 'border-box' as const,
    backgroundColor: 'transparent',
    color: colors.colorTextPrimary
  },
  chipSelected: {
    backgroundColor: colors.colorSurfaceElevatedOnInteraction,
    borderColor: colors.colorBorderSecondary,
    color: colors.colorTextPrimary
  },
  chipUnselected: {
    borderColor: colors.colorBorderPrimary,
    color: colors.colorTextPrimary
  }
})
