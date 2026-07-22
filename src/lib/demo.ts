import type { AppData } from '../data/types'
import { importBackup } from '../data/storage'

/** Descarga y valida la semana de ejemplo empaquetada con la app. */
export async function fetchDemoBackup(): Promise<AppData> {
  const resp = await fetch(`${import.meta.env.BASE_URL}demo-semana.json`)
  if (!resp.ok) throw new Error('No se encontró el archivo de ejemplo.')
  return importBackup(await resp.text())
}
