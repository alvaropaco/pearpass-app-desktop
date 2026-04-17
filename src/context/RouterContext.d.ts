import type { ReactNode } from 'react'

/** Shape of `data` passed to `navigate` and read from `useRouter().data` */
export type RouterData = {
  recordId?: string
  recordType?: string
  folder?: string
  vaultId?: string
  initialTab?: string
} & Record<string, unknown>

export type RouterContextValue = {
  currentPage: string
  data: RouterData
  navigate: (page: string, data?: RouterData) => void
}

export declare function RouterProvider(props: {
  children: ReactNode
}): ReactNode

export declare function useRouter(): RouterContextValue
