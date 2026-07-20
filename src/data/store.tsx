import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppData } from './types'
import { STORAGE_KEY, loadData, saveData } from './storage'

interface AppStore {
  data: AppData
  /** Aplica un cambio inmutable y lo persiste en localStorage. */
  update: (fn: (data: AppData) => AppData) => void
  /** Sustituye todo el estado (importación de copia de seguridad). */
  replaceAll: (data: AppData) => void
}

const AppStoreContext = createContext<AppStore | null>(null)

/** Milisegundos de espera antes de persistir (agrupa ráfagas de tecleo). */
const SAVE_DELAY = 300

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(loadData)
  // Guardado diferido: el estado cambia síncrono, la escritura (stringify de
  // todo el AppData, fotos incluidas) se agrupa para no bloquear cada tecla.
  const pendingRef = useRef<AppData | null>(null)
  const timerRef = useRef<number | null>(null)

  const flush = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (pendingRef.current !== null) {
      saveData(pendingRef.current)
      pendingRef.current = null
    }
  }, [])

  const update = useCallback(
    (fn: (data: AppData) => AppData) => {
      setData((prev) => {
        const next = fn(prev)
        pendingRef.current = next
        return next
      })
      if (timerRef.current !== null) clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(flush, SAVE_DELAY)
    },
    [flush],
  )

  const replaceAll = useCallback(
    (next: AppData) => {
      pendingRef.current = null
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      saveData(next)
      setData(next)
    },
    [],
  )

  useEffect(() => {
    // Al ocultar/cerrar la página, persistir lo pendiente para no perder nada.
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    // Otra pestaña (o la app instalada) escribió: recargar el estado visible.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || pendingRef.current !== null) return
      setData(loadData())
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('storage', onStorage)
      flush()
    }
  }, [flush])

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
