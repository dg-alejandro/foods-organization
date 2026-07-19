import type { AppData, Ingredient, Person } from './types'
import { SEED_INGREDIENTS } from './seed'

const STORAGE_KEY = 'comidas.app.v1'

export function newId(): string {
  return crypto.randomUUID()
}

function defaultPersons(): Person[] {
  return [
    { id: newId(), name: 'Persona 1', targets: { kcal: 2200, protein: 130, carbs: 240, fat: 70 } },
    { id: newId(), name: 'Persona 2', targets: { kcal: 1800, protein: 100, carbs: 190, fat: 60 } },
  ]
}

export function defaultData(): AppData {
  return withSeed({
    version: 1,
    persons: defaultPersons(),
    ingredients: [],
    recipes: [],
    weeks: [],
    activeWeekId: null,
  })
}

/**
 * Añade los ingredientes de ejemplo una sola vez (flag `seeded`),
 * sin duplicar los que ya existan por nombre.
 */
function withSeed(data: AppData): AppData {
  if (data.seeded === true) return data
  const existing = new Set(data.ingredients.map((i) => i.name.toLocaleLowerCase('es')))
  const added: Ingredient[] = SEED_INGREDIENTS.filter(
    (s) => !existing.has(s.name.toLocaleLowerCase('es')),
  ).map((s) => ({ ...s, id: newId() }))
  return { ...data, ingredients: [...data.ingredients, ...added], seeded: true }
}

/** Comprobación mínima de forma para no cargar basura. */
function isAppData(value: unknown): value is AppData {
  if (typeof value !== 'object' || value === null) return false
  const d = value as Record<string, unknown>
  return (
    d.version === 1 &&
    Array.isArray(d.persons) &&
    Array.isArray(d.ingredients) &&
    Array.isArray(d.recipes) &&
    Array.isArray(d.weeks)
  )
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return defaultData()
    const parsed: unknown = JSON.parse(raw)
    if (!isAppData(parsed)) {
      console.warn('Datos guardados con formato inesperado; se parte de cero.')
      return defaultData()
    }
    const seeded = withSeed(parsed)
    if (seeded !== parsed) saveData(seeded)
    return seeded
  } catch {
    return defaultData()
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

/** Serializa la copia de seguridad completa como JSON legible. */
export function exportBackup(data: AppData): string {
  return JSON.stringify(data, null, 2)
}

/** Valida e interpreta una copia de seguridad. Lanza si no es válida. */
export function importBackup(json: string): AppData {
  const parsed: unknown = JSON.parse(json)
  if (!isAppData(parsed)) {
    throw new Error('El archivo no parece una copia de seguridad de esta aplicación.')
  }
  return parsed
}
