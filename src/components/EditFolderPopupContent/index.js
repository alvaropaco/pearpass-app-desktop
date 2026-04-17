import { useMemo } from 'react'

import { useLingui } from '@lingui/react'
import { useFolders } from '@tetherto/pearpass-lib-vault'
import { html } from 'htm/react'

import { MenuItem, MenuList } from './styles'
import { ConfirmationModalContent } from '../../containers/Modal/ConfirmationModalContent'
import { CreateFolderModalContent } from '../../containers/Modal/CreateFolderModalContent'
import { CreateFolderModalContentV2 } from '../../containers/Modal/CreateFolderModalContentV2/CreateFolderModalContentV2'
import { DeleteFolderModalContentV2 } from '../../containers/Modal/DeleteFolderModalContentV2/DeleteFolderModalContentV2'
import { useModal } from '../../context/ModalContext'
import { DeleteIcon, FolderIcon } from '../../lib-react-components'
import { isV2 } from '../../utils/designVersion'

/**
 *
 * @param {{
 *  name: string
 * }} props
 * @returns
 */
export const EditFolderPopupContent = ({ name }) => {
  const { i18n } = useLingui()
  const { deleteFolder, data: folderData } = useFolders()
  const { setModal, closeModal } = useModal()

  const menuItems = useMemo(
    () => [
      {
        name: i18n._('Delete'),
        type: 'delete',
        icon: DeleteIcon,
        onClick: () => {
          if (isV2()) {
            const count =
              folderData?.customFolders?.[name]?.records?.length ?? 0
            if (count === 1) {
              deleteFolder(name)
              closeModal()
            } else {
              setModal(
                <DeleteFolderModalContentV2
                  folderName={name}
                  count={count - 1}
                  onClose={closeModal}
                />
              )
            }
          } else {
            setModal(
              html`<${ConfirmationModalContent}
                primaryAction=${() => {
                  deleteFolder(name)
                  closeModal()
                }}
                secondaryAction=${closeModal}
                title=${i18n._('Are you sure you want to delete this folder?')}
                text=${i18n._(
                  'This action will permanently delete the folder and all items contained within it. Are you sure you want to proceed?'
                )}
              />`
            )
          }
        }
      },
      {
        name: i18n._('Rename'),
        type: 'rename',
        icon: FolderIcon,
        onClick: () =>
          isV2()
            ? setModal(
                <CreateFolderModalContentV2
                  initialValues={{ title: name }}
                  onClose={closeModal}
                />
              )
            : setModal(
                html`<${CreateFolderModalContent}
                  initialValues=${{ title: name }}
                />`
              )
      }
    ],
    [closeModal, deleteFolder, folderData, i18n, name, setModal]
  )

  const handleMenuItemClick = (e, item) => {
    e.stopPropagation()

    item.onClick()
  }

  return html`
    <${MenuList}>
      ${menuItems?.map((item) => {
        const Icon = item.icon

        return html`<${MenuItem}
          data-testid=${`folder-menuitem-${item.type}`}
          key=${item.type}
          onClick=${(e) => handleMenuItemClick(e, item)}
        >
          ${Icon && html`<${Icon} size="24" />`} ${item.name}
        <//>`
      })}
    <//>
  `
}
