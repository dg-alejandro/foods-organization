import type { DayPlan, MealSlot, MealType, Recipe, WeekPlan } from '../data/types'
import { newId } from '../data/storage'
import { ZERO_MACROS, addMacros, recipeMacrosPerServing, scaleMacros } from './nutrition'
import type { IngredientMap, Macros } from './nutrition'

export const MAIN_MEALS = ['desayuno', 'almuerzo', 'cena'] as const
export type MainMeal = (typeof MAIN_MEALS)[number]

export function emptyWeek(weekStart: string): WeekPlan {
  return {
    id: newId(),
    weekStart,
    days: Array.from({ length: 7 }, () => ({})),
    shopping: { checked: [], haveAtHome: [], extras: [] },
  }
}

/** Copia los platos de una semana como punto de partida (sin notas ni compra). */
export function duplicateWeek(week: WeekPlan, weekStart: string): WeekPlan {
  return {
    ...emptyWeek(weekStart),
    days: week.days.map((d) => ({
      desayuno: d.desayuno,
      almuerzo: d.almuerzo,
      cena: d.cena,
      snacks: d.snacks !== undefined && d.snacks.length > 0 ? [...d.snacks] : undefined,
    })),
  }
}

/** Referencia a un hueco del planificador; snackIdx undefined = snack nuevo. */
export interface SlotRef {
  dayIdx: number
  meal: MealType
  snackIdx?: number
}

export function sameSlotRef(a: SlotRef, b: SlotRef): boolean {
  return a.dayIdx === b.dayIdx && a.meal === b.meal && a.snackIdx === b.snackIdx
}

export function slotAt(week: WeekPlan, ref: SlotRef): MealSlot | undefined {
  const day = week.days[ref.dayIdx]
  if (day === undefined) return undefined
  if (ref.meal === 'snack') {
    return ref.snackIdx !== undefined ? day.snacks?.[ref.snackIdx] : undefined
  }
  return day[ref.meal]
}

/** Copia independiente de un hueco, para que el reparto no quede compartido. */
export function cloneSlot(slot: MealSlot): MealSlot {
  return {
    ...slot,
    perPerson: slot.perPerson === undefined ? undefined : { ...slot.perPerson },
  }
}

/** Asigna un plato al hueco; en snacks sin índice (o fuera de rango) añade. */
export function setSlot(day: DayPlan, ref: SlotRef, slot: MealSlot): DayPlan {
  if (ref.meal === 'snack') {
    const snacks = [...(day.snacks ?? [])]
    if (ref.snackIdx !== undefined && ref.snackIdx < snacks.length) snacks[ref.snackIdx] = slot
    else snacks.push(slot)
    return { ...day, snacks }
  }
  return { ...day, [ref.meal]: slot }
}

export function clearSlot(day: DayPlan, ref: SlotRef): DayPlan {
  if (ref.meal === 'snack') {
    const snacks = (day.snacks ?? []).filter((_, i) => i !== ref.snackIdx)
    return { ...day, snacks: snacks.length > 0 ? snacks : undefined }
  }
  const copy = { ...day }
  delete copy[ref.meal]
  return copy
}

/**
 * Mueve (o copia, con copy=true) el plato de un hueco a otro de la misma
 * semana. Sobre un hueco principal ocupado sobrescribe; sobre la celda de
 * snacks (to sin snackIdx) añade. Si el origen está vacío no hace nada.
 */
export function transferSlot(week: WeekPlan, from: SlotRef, to: SlotRef, copy: boolean): WeekPlan {
  const slot = slotAt(week, from)
  if (slot === undefined) return week
  if (!copy && sameSlotRef(from, to)) return week
  let days = week.days
  if (!copy) days = days.map((day, i) => (i === from.dayIdx ? clearSlot(day, from) : day))
  days = days.map((day, i) => (i === to.dayIdx ? setSlot(day, to, cloneSlot(slot)) : day))
  return { ...week, days }
}

/**
 * Vacía los huecos indicados solo si aún contienen la receta esperada
 * (deshacer selectivo del autorrelleno: lo editado a mano no se toca).
 */
export function clearPlacedSlots(
  week: WeekPlan,
  placed: { ref: SlotRef; recipeId: string }[],
): WeekPlan {
  return placed.reduce((acc, { ref, recipeId }) => {
    if (slotAt(acc, ref)?.recipeId !== recipeId) return acc
    return { ...acc, days: acc.days.map((d, i) => (i === ref.dayIdx ? clearSlot(d, ref) : d)) }
  }, week)
}

/** Quita del día todos los huecos que usan una receta (al borrarla del banco). */
export function removeRecipeFromDay(day: DayPlan, recipeId: string): DayPlan {
  const out: DayPlan = { ...day }
  for (const meal of MAIN_MEALS) {
    if (out[meal]?.recipeId === recipeId) delete out[meal]
  }
  if (out.snacks !== undefined) {
    const snacks = out.snacks.filter((s) => s.recipeId !== recipeId)
    out.snacks = snacks.length > 0 ? snacks : undefined
  }
  return out
}

export function daySlots(day: DayPlan): MealSlot[] {
  const slots: MealSlot[] = []
  for (const meal of MAIN_MEALS) {
    const s = day[meal]
    if (s !== undefined) slots.push(s)
  }
  slots.push(...(day.snacks ?? []))
  return slots
}

export function dayIsPlanned(day: DayPlan): boolean {
  return daySlots(day).length > 0
}

/** Raciones de una persona en un hueco: reparto explícito o partes iguales. */
export function slotServingsForPerson(
  slot: MealSlot,
  personId: string,
  personCount: number,
): number {
  const explicit = slot.perPerson?.[personId]
  if (explicit !== undefined) return explicit
  return personCount > 0 ? slot.servings / personCount : 0
}

export type RecipeMap = Map<string, Recipe>

export function recipeMap(recipes: Recipe[]): RecipeMap {
  return new Map(recipes.map((r) => [r.id, r]))
}

export function dayMacrosForPerson(
  day: DayPlan,
  personId: string,
  personCount: number,
  recipes: RecipeMap,
  ingredients: IngredientMap,
): Macros {
  let total = ZERO_MACROS
  for (const slot of daySlots(day)) {
    const recipe = recipes.get(slot.recipeId)
    if (recipe === undefined) continue
    const perServing = recipeMacrosPerServing(recipe, ingredients)
    total = addMacros(total, scaleMacros(perServing, slotServingsForPerson(slot, personId, personCount)))
  }
  return total
}

/**
 * Total semanal y media diaria de la semana,
 * contando solo los días con algo planificado.
 */
export function weekMacrosForPerson(
  week: WeekPlan,
  personId: string,
  personCount: number,
  recipes: RecipeMap,
  ingredients: IngredientMap,
): { avg: Macros; total: Macros; daysPlanned: number } {
  const planned = week.days.filter(dayIsPlanned)
  if (planned.length === 0) return { avg: ZERO_MACROS, total: ZERO_MACROS, daysPlanned: 0 }
  let total = ZERO_MACROS
  for (const day of planned) {
    total = addMacros(total, dayMacrosForPerson(day, personId, personCount, recipes, ingredients))
  }
  return { avg: scaleMacros(total, 1 / planned.length), total, daysPlanned: planned.length }
}

export type TargetStatus = 'ok' | 'warn' | 'bad' | 'none'

/** Verde si se desvía ≤10 % del objetivo, ámbar ≤20 %, rojo más. */
export function targetStatus(actual: number, target: number | undefined): TargetStatus {
  if (target === undefined || target <= 0) return 'none'
  const dev = Math.abs(actual - target) / target
  if (dev <= 0.1) return 'ok'
  if (dev <= 0.2) return 'warn'
  return 'bad'
}
