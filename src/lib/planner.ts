import type { DayPlan, MealSlot, Recipe, WeekPlan } from '../data/types'
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

/** Media diaria de la semana contando solo los días con algo planificado. */
export function weekAvgForPerson(
  week: WeekPlan,
  personId: string,
  personCount: number,
  recipes: RecipeMap,
  ingredients: IngredientMap,
): { avg: Macros; daysPlanned: number } {
  const planned = week.days.filter(dayIsPlanned)
  if (planned.length === 0) return { avg: ZERO_MACROS, daysPlanned: 0 }
  let total = ZERO_MACROS
  for (const day of planned) {
    total = addMacros(total, dayMacrosForPerson(day, personId, personCount, recipes, ingredients))
  }
  return { avg: scaleMacros(total, 1 / planned.length), daysPlanned: planned.length }
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
