import React from 'react'

import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'

let mockAuthenticatorEnabled = false

jest.mock('@tetherto/pearpass-lib-constants', () => ({
  get AUTHENTICATOR_ENABLED() {
    return mockAuthenticatorEnabled
  }
}))

jest.mock('../../utils/designVersion', () => ({
  isV2: jest.fn()
}))

const mockNavigate = jest.fn()

jest.mock('../../context/RouterContext', () => ({
  useRouter: jest.fn()
}))

jest.mock('../../hooks/useRecordMenuItems', () => ({
  useRecordMenuItems: jest.fn()
}))

jest.mock('../../hooks/useCreateOrEditRecord', () => ({
  useCreateOrEditRecord: jest.fn()
}))

jest.mock('../../components/PopupMenu', () => ({
  PopupMenu: ({ children }) => <div data-testid="popup-menu">{children}</div>
}))

jest.mock('../../components/CreateNewCategoryPopupContent', () => ({
  CreateNewCategoryPopupContent: () => (
    <div data-testid="create-new-category-popup" />
  )
}))

jest.mock('../../components/AppHeaderV2', () => {
  const React = require('react')
  return {
    AppHeaderV2: jest.fn((props) =>
      React.createElement(
        'div',
        { 'data-testid': 'app-header-v2-mock' },
        React.createElement('input', {
          'data-testid': 'mock-search',
          value: props.searchValue,
          onChange: (e) => props.onSearchChange(e.target.value)
        }),
        React.createElement(
          'button',
          {
            type: 'button',
            'data-testid': 'mock-import',
            onClick: props.onImportClick
          },
          'Import'
        ),
        props.addItemControl
      )
    ),
    AppHeaderAddItemTrigger: () =>
      React.createElement(
        'button',
        { type: 'button', 'data-testid': 'add-item-trigger' },
        'Add'
      )
  }
})

import { AppHeaderContainer } from './AppHeaderContainer'
import { AppHeaderV2 } from '../../components/AppHeaderV2'
import { AppHeaderContextProvider } from '../../context/AppHeaderContext'
import { useRouter } from '../../context/RouterContext'
import { useCreateOrEditRecord } from '../../hooks/useCreateOrEditRecord'
import { useRecordMenuItems } from '../../hooks/useRecordMenuItems'
import { isV2 } from '../../utils/designVersion'

const renderWithHeaderContext = (ui) =>
  render(<AppHeaderContextProvider>{ui}</AppHeaderContextProvider>)

describe('AppHeaderContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthenticatorEnabled = false
    isV2.mockReturnValue(true)
    mockNavigate.mockReset()
    useRouter.mockReturnValue({
      currentPage: 'vault',
      data: { folder: 'folder-1', recordType: 'login' },
      navigate: mockNavigate
    })
    useRecordMenuItems.mockReturnValue({
      categoriesItems: [],
      defaultItems: [],
      popupItems: []
    })
    useCreateOrEditRecord.mockReturnValue({
      handleCreateOrEditRecord: jest.fn()
    })
  })

  it('returns null when design is not v2', () => {
    isV2.mockReturnValue(false)

    const { container } = renderWithHeaderContext(<AppHeaderContainer />)

    expect(container.firstChild).toBeNull()
    expect(AppHeaderV2).not.toHaveBeenCalled()
  })

  it('returns null when current page is not vault', () => {
    useRouter.mockReturnValue({
      currentPage: 'settings',
      data: {},
      navigate: mockNavigate
    })

    const { container } = renderWithHeaderContext(<AppHeaderContainer />)

    expect(container.firstChild).toBeNull()
    expect(AppHeaderV2).not.toHaveBeenCalled()
  })

  it('returns null on authenticator vault when AUTHENTICATOR_ENABLED', () => {
    mockAuthenticatorEnabled = true
    useRouter.mockReturnValue({
      currentPage: 'vault',
      data: { recordType: 'authenticator' },
      navigate: mockNavigate
    })

    const { container } = renderWithHeaderContext(<AppHeaderContainer />)

    expect(container.firstChild).toBeNull()
    expect(AppHeaderV2).not.toHaveBeenCalled()
  })

  it('renders AppHeaderV2 on vault when v2 and not blocked', () => {
    renderWithHeaderContext(<AppHeaderContainer />)

    expect(screen.getByTestId('app-header-v2-mock')).toBeInTheDocument()
    expect(AppHeaderV2).toHaveBeenCalled()
  })

  it('navigates to settings vault tab on import', () => {
    renderWithHeaderContext(<AppHeaderContainer />)

    fireEvent.click(screen.getByTestId('mock-import'))

    expect(mockNavigate).toHaveBeenCalledWith('settings', {
      initialTab: 'vault'
    })
  })

  it('wires search to header context state', () => {
    renderWithHeaderContext(<AppHeaderContainer />)

    fireEvent.change(screen.getByTestId('mock-search'), {
      target: { value: 'find-me' }
    })

    expect(screen.getByTestId('mock-search')).toHaveValue('find-me')
  })
})
