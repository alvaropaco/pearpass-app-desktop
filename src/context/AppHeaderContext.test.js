import React from 'react'

import '@testing-library/jest-dom'
import { render, screen, act } from '@testing-library/react'
import { renderHook } from '@testing-library/react'

import {
  AppHeaderContextProvider,
  useAppHeaderContext
} from './AppHeaderContext'

const Consumer = () => {
  const { searchValue, setSearchValue, isAddMenuOpen, setIsAddMenuOpen } =
    useAppHeaderContext()

  return (
    <div>
      <span data-testid="search">{searchValue}</span>
      <span data-testid="menu-open">{String(isAddMenuOpen)}</span>
      <button
        type="button"
        data-testid="set-search"
        onClick={() => setSearchValue('hello')}
      >
        set
      </button>
      <button
        type="button"
        data-testid="toggle-menu"
        onClick={() => setIsAddMenuOpen((open) => !open)}
      >
        toggle
      </button>
    </div>
  )
}

describe('AppHeaderContext', () => {
  it('throws when useAppHeaderContext is used outside AppHeaderContextProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useAppHeaderContext())
    }).toThrow(
      'useAppHeaderContext must be used within AppHeaderContextProvider'
    )

    spy.mockRestore()
  })

  it('provides default state', () => {
    render(
      <AppHeaderContextProvider>
        <Consumer />
      </AppHeaderContextProvider>
    )

    expect(screen.getByTestId('search')).toHaveTextContent('')
    expect(screen.getByTestId('menu-open')).toHaveTextContent('false')
  })

  it('updates searchValue and isAddMenuOpen via setters', () => {
    render(
      <AppHeaderContextProvider>
        <Consumer />
      </AppHeaderContextProvider>
    )

    act(() => {
      screen.getByTestId('set-search').click()
    })
    expect(screen.getByTestId('search')).toHaveTextContent('hello')

    act(() => {
      screen.getByTestId('toggle-menu').click()
    })
    expect(screen.getByTestId('menu-open')).toHaveTextContent('true')

    act(() => {
      screen.getByTestId('toggle-menu').click()
    })
    expect(screen.getByTestId('menu-open')).toHaveTextContent('false')
  })
})
