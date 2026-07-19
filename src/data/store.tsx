import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppData } from './types'
import { loadData, saveData } from './storage'

interface AppStore {
  data: AppData
  /** Aplica un cambio inmutable y lo persiste en localStorage. */
  update: (fn: (data: AppData) => AppData) => void
  /** Sustituye todo el estado (importación de copia de seguridad). */
  replaceAll: (data: AppData) => void
}

const AppStoreContext = createContext<AppStore | null>(null)

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(loadData)

  const update = useCallback((fn: (data: AppData) => AppData) => {
    setData((prev) => {
      const next = fn(prev)
      saveData(next)
      return next
    })
  }, [])

  const replaceAll = useCallback((next: AppData) => {
    saveData(next)
    setData(next)
  }, [])

  return (
    <AppStoreContext.Provider value={{ data, update, replaceAll }}>
      {children}
    </AppStoreContext.Provider>
  )
}

export function useAppStore(): AppStore {
  const store = useContext(AppStoreContext)
  if (store === null) throw new Error('useAppStore debe usarse dentro de AppStoreProvider')
  return store
}
