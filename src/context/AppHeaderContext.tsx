import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction
} from 'react'

export type AppHeaderContextState = {
  searchValue: string
  setSearchValue: Dispatch<SetStateAction<string>>
  isAddMenuOpen: boolean
  setIsAddMenuOpen: Dispatch<SetStateAction<boolean>>
}

const AppHeaderContext = createContext<AppHeaderContextState | null>(null)

export const AppHeaderContextProvider = ({
  children
}: {
  children: ReactNode
}) => {
  const [searchValue, setSearchValue] = useState('')
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)

  const value = useMemo(
    (): AppHeaderContextState => ({
      searchValue,
      setSearchValue,
      isAddMenuOpen,
      setIsAddMenuOpen
    }),
    [searchValue, isAddMenuOpen]
  )

  return (
    <AppHeaderContext.Provider value={value}>
      {children}
    </AppHeaderContext.Provider>
  )
}

export const useAppHeaderContext = (): AppHeaderContextState => {
  const ctx = useContext(AppHeaderContext)
  if (!ctx) {
    throw new Error(
      'useAppHeaderContext must be used within AppHeaderContextProvider'
    )
  }
  return ctx
}
