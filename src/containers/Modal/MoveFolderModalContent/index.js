import React from 'react'

import { useLingui } from '@lingui/react'
import { useRecords, useFolders } from '@tetherto/pearpass-lib-vault'
import { html } from 'htm/react'

import { FolderList, HeaderWrapper } from './styles'
import { useGlobalLoading } from '../../../context/LoadingContext'
import { useModal } from '../../../context/ModalContext'
import {
  ButtonFolder,
  ButtonSingleInput,
  NewFolderIcon
} from '../../../lib-react-components'
import { isV2 } from '../../../utils/designVersion'
import { CreateFolderModalContent } from '../CreateFolderModalContent'
import { CreateFolderModalContentV2 } from '../CreateFolderModalContentV2/CreateFolderModalContentV2'
import { ModalContent } from '../ModalContent'

/**
 * @param {{
 *  records: {
 *    id: string
 *    folder?: string
 *  }[]
 *  onCompleted?: () => void
 * }} props
 */
export const MoveFolderModalContent = ({ records, onCompleted }) => {
  const { i18n } = useLingui()
  const { closeModal, setModal } = useModal()

  const { updateFolder, isLoading: isUpdating } = useRecords({
    onCompleted: closeModal
  })
  const { data: folders, isLoading: isLoadingFolders } = useFolders()

  const isLoading = isUpdating || isLoadingFolders

  useGlobalLoading({ isLoading })

  const filteredFolders = React.useMemo(() => {
    const excludedFolder = records?.length === 1 ? records[0].folder : null
    const customFolders = Object.values(folders?.customFolders ?? {})

    return (
      customFolders.filter((folder) => folder.name !== excludedFolder) ?? []
    )
  }, [folders, records])

  const handleMove = async (folderName) => {
    const recordIds = records.map((record) => record.id)
    await updateFolder(recordIds, folderName)

    onCompleted?.()
  }

  const handleCreateClick = () => {
    isV2()
      ? setModal(
          <CreateFolderModalContentV2
            onClose={closeModal}
            onCreate={(folderData) => handleMove(folderData.folder)}
          />
        )
      : setModal(html`
          <${CreateFolderModalContent}
            onCreate=${(folderData) => handleMove(folderData.folder)}
          />
        `)
  }

  return html`
    <${React.Fragment}>
      <${ModalContent}
        onClose=${closeModal}
        headerChildren=${html`
          <${HeaderWrapper}>
            ${i18n._('Select a folder or create a new folder')}
          <//>
        `}
      >
        <${FolderList}>
          ${filteredFolders.map(
            (folder) => html`
              <${ButtonFolder}
                key=${folder.name}
                onClick=${() => handleMove(folder.name)}
              >
                ${folder.name}
              <//>
            `
          )}
        <//>

        <${ButtonSingleInput}
          startIcon=${NewFolderIcon}
          onClick=${() => handleCreateClick()}
        >
          ${i18n._('Create new folder')}
        <//>
      <//>
    <//>
  `
}
