import React from 'react'
import { html } from 'htm/react'

import { AUTHENTICATOR_ENABLED } from '@tetherto/pearpass-lib-constants'

import {
  AppHeaderAddItemTrigger,
  AppHeaderV2
} from '../../components/AppHeaderV2'
import { CreateNewCategoryPopupContent } from '../../components/CreateNewCategoryPopupContent'
import { PopupMenu } from '../../components/PopupMenu'
import { useRouter } from '../../context/RouterContext'
import { useAppHeaderContext } from '../../context/AppHeaderContext'
import { useCreateOrEditRecord } from '../../hooks/useCreateOrEditRecord'
import { useRecordMenuItems } from '../../hooks/useRecordMenuItems'
import { isV2 } from '../../utils/designVersion'
import { isFavorite } from '../../utils/isFavorite'

export const AppHeaderContainer = () => {
  const { currentPage, data: routerData, navigate } = useRouter()
  const {
    searchValue,
    setSearchValue,
    isAddMenuOpen,
    setIsAddMenuOpen
  } = useAppHeaderContext()
  const { popupItems } = useRecordMenuItems()
  const { handleCreateOrEditRecord } = useCreateOrEditRecord()

  if (!isV2()) {
    return null
  }

  if (currentPage !== 'vault') {
    return null
  }

  if (
    AUTHENTICATOR_ENABLED &&
    routerData?.recordType === 'authenticator'
  ) {
    return null
  }
  const isFavoritesView = isFavorite(routerData?.folder ?? '')
  const selectedFolder =
    routerData?.folder && !isFavoritesView ? routerData.folder : undefined

  const handleMenuItemClick = (item: { name: string; type: string }) => {
    handleCreateOrEditRecord({
      recordType: item.type,
      selectedFolder,
      isFavorite: isFavoritesView ? true : undefined
    })
    setIsAddMenuOpen(false)
  }

  const handleImportClick = () => {
    navigate('settings', { initialTab: 'vault' })
  }

  const addItemControl = html`
    <${PopupMenu}
      direction="bottomRight"
      isOpen=${isAddMenuOpen}
      setIsOpen=${setIsAddMenuOpen}
      content=${html`
        <${CreateNewCategoryPopupContent}
          menuItems=${popupItems}
          onClick=${handleMenuItemClick}
        />
      `}
    >
      <${AppHeaderAddItemTrigger} testId="main-plus-button" />
    <//>
  `

  return (
    <AppHeaderV2
      searchValue={searchValue}
      onSearchChange={(val) => setSearchValue(val)}
      onImportClick={handleImportClick}
      addItemControl={addItemControl}
    />
  )
}
