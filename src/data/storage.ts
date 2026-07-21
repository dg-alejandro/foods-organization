import type {
  AppData,
  DayPlan,
  Ingredient,
  MealSlot,
  Person,
  Recipe,
  ShoppingExtra,
  ShoppingState,
  WeekPlan,
} from './types'
import { SEED_INGREDIENTS } from './seed'

export const STORAGE_KEY = 'comidas.app.v1'

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeSlot(value: unknown): MealSlot | undefined {
  if (!isRecord(value) || typeof value.recipeId !== 'string') return undefined
  const servings = value.servings
  if (typeof servings !== 'number' || !Number.isFinite(servings) || servings <= 0) return undefined
  let perPerson: Record<string, number> | undefined
  if (isRecord(value.perPerson)) {
    perPerson = {}
    for (const [id, n] of Object.entries(value.perPerson)) {
      if (typeof n === 'number' && Number.isFinite(n) && n >= 0) perPerson[id] = n
    }
  }
  return { recipeId: value.recipeId, servings, perPerson }
}

function normalizeDay(value: unknown): DayPlan {
  if (!isRecord(value)) return {}
  const day: DayPlan = {}
  for (const meal of ['desayuno', 'almuerzo', 'cena'] as const) {
    const slot = normalizeSlot(value[meal])
    if (slot !== undefined) day[meal] = slot
  }
  if (Array.isArray(value.snacks)) {
    const snacks = value.snacks
      .map(normalizeSlot)
      .filter((s): s is MealSlot => s !== undefined)
    if (snacks.length > 0) day.snacks = snacks
  }
  if (typeof value.note === 'string' && value.note !== '') day.note = value.note
  return day
}

function normalizeShopping(value: unknown): ShoppingState {
  const strings = (x: unknown): string[] =>
    Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string') : []
  const numbers = (x: unknown): Record<string, number> | undefined => {
    if (!isRecord(x)) return undefined
    const out: Record<string, number> = {}
    for (const [id, n] of Object.entries(x)) {
      if (typeof n === 'number' && Number.isFinite(n)) out[id] = n
    }
    return Object.keys(out).length > 0 ? out : undefined
  }
  if (!isRecord(value)) return { checked: [], haveAtHome: [], extras: [] }
  const extras: ShoppingExtra[] = Array.isArray(value.extras)
    ? value.extras.flatMap((e): ShoppingExtra[] =>
        isRecord(e) && typeof e.id === 'string' && typeof e.name === 'string'
          ? [
              {
                id: e.id,
                name: e.name,
                qty: typeof e.qty === 'string' ? e.qty : undefined,
                price: typeof e.price === 'number' && Number.isFinite(e.price) ? e.price : undefined,
                checked: e.checked === true,
              },
            ]
          : [],
      )
    : []
  return {
    checked: strings(value.checked),
    haveAtHome: strings(value.haveAtHome),
    extras,
    qtyOverrides: numbers(value.qtyOverrides),
    atHomeQty: numbers(value.atHomeQty),
  }
}

function normalizeWeek(value: unknown): WeekPlan | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string' || typeof value.weekStart !== 'string') return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.weekStart)) return null
  const rawDays = Array.isArray(value.days) ? value.days : []
  return {
    id: value.id,
    weekStart: value.weekStart,
    days: Array.from({ length: 7 }, (_, i) => normalizeDay(rawDays[i])),
    shopping: normalizeShopping(value.shopping),
  }
}

/**
 * Valida y normaliza datos externos (localStorage o copia de seguridad):
 * semanas siempre con 7 días y compra bien formada, entradas sin forma mínima
 * descartadas. Devuelve null si ni siquiera la estructura raíz es válida.
 * Acepta copias antiguas: todos los campos nuevos son opcionales.
 */
export function normalizeAppData(value: unknown): AppData | null {
  if (!isRecord(value) || value.version !== 1) return null
  if (
    !Array.isArray(value.persons) ||
    !Array.isArray(value.ingredients) ||
    !Array.isArray(value.recipes) ||
    !Array.isArray(value.weeks)
  ) {
    return null
  }
  const named = (x: unknown): boolean =>
    isRecord(x) && typeof x.id === 'string' && typeof x.name === 'string'
  const persons = value.persons.filter(named) as unknown as Person[]
  const ingredients = value.ingredients.filter(named) as unknown as Ingredient[]
  const recipes = value.recipes.filter((r) => named(r) && Array.isArray((r as Recipe).items)) as unknown as Recipe[]
  const weeks = value.weeks
    .map(normalizeWeek)
    .filter((w): w is WeekPlan => w !== null)
  const activeWeekId =
    typeof value.activeWeekId === 'string' && weeks.some((w) => w.id === value.activeWeekId)
      ? value.activeWeekId
      : weeks.length > 0
        ? weeks[weeks.length - 1].id
        : null
  return {
    version: 1,
    persons,
    ingredients,
    recipes,
    weeks,
    activeWeekId,
    seeded: value.seeded === true,
  }
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return defaultData()
    const normalized = normalizeAppData(JSON.parse(raw))
    if (normalized === null) {
      console.warn('Datos guardados con formato inesperado; se parte de cero.')
      return defaultData()
    }
    const seeded = withSeed(normalized)
    if (seeded !== normalized) saveData(seeded)
    return seeded
  } catch {
    return defaultData()
  }
}

let quotaWarned = false

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    quotaWarned = false
  } catch (err) {
    console.error('No se pudieron guardar los datos', err)
    if (!quotaWarned) {
      quotaWarned = true
      window.alert(
        'No se han podido guardar los últimos cambios: el almacenamiento del navegador está lleno. ' +
          'Exporta una copia de seguridad desde Ajustes y libera espacio (por ejemplo, quitando fotos de recetas).',
      )
    }
  }
}

/** Serializa la copia de seguridad completa como JSON legible. */
export function exportBackup(data: AppData): string {
  return JSON.stringify(data, null, 2)
}

/** Valida e interpreta una copia de seguridad. Lanza si no es válida. */
export function importBackup(json: string): AppData {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }
  const normalized = normalizeAppData(parsed)
  if (normalized === null) {
    throw new Error('El archivo no parece una copia de seguridad de esta aplicación.')
  }
  // Mismo tratamiento que loadData: si no, una copia sin `seeded` mostraría
  // un banco distinto antes y después de recargar.
  return withSeed(normalized)
}
