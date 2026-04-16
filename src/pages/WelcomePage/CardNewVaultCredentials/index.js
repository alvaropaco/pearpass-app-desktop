import { useEffect } from 'react'

import { html } from 'htm/react'

import { NAVIGATION_ROUTES } from '../../../constants/navigation'
import { CreateVaultModalContent } from '../../../containers/Modal/CreateVaultModalContent'
import { CreateVaultModalContentV2 } from '../../../containers/Modal/CreateVaultModalContentV2/CreateVaultModalContentV2'
import { useModal } from '../../../context/ModalContext'
import { useRouter } from '../../../context/RouterContext'
import { isV2 } from '../../../utils/designVersion'

export const CardNewVaultCredentials = () => {
  const { navigate, currentPage } = useRouter()
  const { closeModal, setModal } = useModal()

  useEffect(() => {
    const handleClose = () => {
      closeModal()
      navigate(currentPage, { state: NAVIGATION_ROUTES.VAULTS })
    }

    const CreateContent = isV2()
      ? CreateVaultModalContentV2
      : CreateVaultModalContent

    setModal(
      html`<${CreateContent} onClose=${handleClose} onSuccess=${closeModal} />`,
      { replace: true }
    )
  }, [closeModal, currentPage, navigate, setModal])

  return null
}
