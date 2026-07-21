import type { Ingredient, MealSlot, Person, Recipe, WeekPlan } from '../data/types'
import { ingredientMap, recipeMacrosPerServing } from './nutrition'
import {
  MAIN_MEALS,
  cloneSlot,
  daySlots,
  recipeMap,
  setSlot,
  slotServingsForPerson,
} from './planner'
import type { SlotRef } from './planner'

export interface FillResult {
  week: WeekPlan
  /** Huecos que el autorrelleno ha rellenado (nunca toca lo ya asignado). */
  filled: SlotRef[]
}

/** Misma receta a menos de 2 días de distancia (día contiguo o el mismo). */
const ADJACENT_PENALTY = 8
/** Cada uso previo de la receta en la semana. */
const REUSE_PENALTY = 2
/** Azar máximo añadido a la puntuación, para que dos pulsaciones no coincidan. */
const JITTER = 1.2
const PROTEIN_WEIGHT = 0.5

/**
 * Propone recetas para los huecos vacíos de la semana: desayuno, almuerzo y
 * cena sin plato, y la celda de snacks si está vacía (máximo un snack, y solo
 * si acerca el día a los objetivos). Puntuación por candidato (menor gana):
 * distancia al "presupuesto" de kcal y proteína que le falta al día repartido
 * entre los huecos pendientes, más penalizaciones por repetición y algo de
 * azar. Raciones por defecto: las del último uso de la receta, o 1 por persona.
 */
export function fillWeek(
  week: WeekPlan,
  allWeeks: WeekPlan[],
  recipes: Recipe[],
  ingredients: Ingredient[],
  persons: Person[],
  random: () => number = Math.random,
): FillResult {
  const byIngredient = ingredientMap(ingredients)
  const recipesById = recipeMap(recipes)
  const personCount = persons.length

  // Último uso de cada receta (semanas en orden cronológico, gana el más reciente).
  const lastUse = new Map<string, MealSlot>()
  for (const w of [...allWeeks].sort((a, b) => a.weekStart.localeCompare(b.weekStart))) {
    for (const day of w.days) {
      for (const slot of daySlots(day)) lastUse.set(slot.recipeId, slot)
    }
  }
  const defaultSlot = (recipeId: string): MealSlot => {
    const prev = lastUse.get(recipeId)
    if (prev !== undefined) {
      // Conservar solo el reparto de personas que sigan existiendo.
      const perPerson: Record<string, number> = {}
      for (const p of persons) {
        const n = prev.perPerson?.[p.id]
        if (n !== undefined) perPerson[p.id] = n
      }
      if (Object.keys(perPerson).length > 0) {
        const total = Object.values(perPerson).reduce((a, b) => a + b, 0)
        if (total > 0) return { recipeId, servings: total, perPerson }
      }
      if (prev.perPerson === undefined) return cloneSlot(prev)
    }
    const perPerson: Record<string, number> = {}
    for (const p of persons) perPerson[p.id] = 1
    return { recipeId, servings: Math.max(personCount, 1), perPerson }
  }

  // Usos y días de cada receta en la semana, actualizados según se rellena.
  const useCount = new Map<string, number>()
  const recipeDays = new Map<string, Set<number>>()
  const noteUse = (recipeId: string, dayIdx: number) => {
    useCount.set(recipeId, (useCount.get(recipeId) ?? 0) + 1)
    const days = recipeDays.get(recipeId) ?? new Set<number>()
    days.add(dayIdx)
    recipeDays.set(recipeId, days)
  }
  week.days.forEach((day, i) => {
    for (const slot of daySlots(day)) noteUse(slot.recipeId, i)
  })

  /** kcal y proteína que un candidato aporta a cada persona. */
  const contribution = (slot: MealSlot, recipe: Recipe) => {
    const per = recipeMacrosPerServing(recipe, byIngredient)
    return persons.map((p) => {
      const servings = slotServingsForPerson(slot, p.id, personCount)
      return { kcal: per.kcal * servings, protein: per.protein * servings }
    })
  }

  /** Total de kcal y proteína que lleva el día cada persona. */
  const dayTotals = (dayIdx: number) =>
    persons.map((p) => {
      let kcal = 0
      let protein = 0
      for (const slot of daySlots(current.days[dayIdx])) {
        const recipe = recipesById.get(slot.recipeId)
        if (recipe === undefined) continue
        const per = recipeMacrosPerServing(recipe, byIngredient)
        const servings = slotServingsForPerson(slot, p.id, personCount)
        kcal += per.kcal * servings
        protein += per.protein * servings
      }
      return { kcal, protein }
    })

  /** Distancia del aporte de un candidato al presupuesto restante del día. */
  const fitScore = (
    totals: { kcal: number; protein: number }[],
    contrib: { kcal: number; protein: number }[] | null,
    holesLeft: number,
  ) => {
    let score = 0
    persons.forEach((p, pi) => {
      const t = p.targets
      if (t === undefined) return
      const budgetKcal = Math.max(t.kcal - totals[pi].kcal, 0) / holesLeft
      const budgetProt = Math.max(t.protein - totals[pi].protein, 0) / holesLeft
      const c = contrib === null ? { kcal: 0, protein: 0 } : contrib[pi]
      score += Math.abs(c.kcal - budgetKcal) / Math.max(budgetKcal, 150)
      score += (PROTEIN_WEIGHT * Math.abs(c.protein - budgetProt)) / Math.max(budgetProt, 10)
    })
    return score
  }

  const repeatPenalty = (recipeId: string, dayIdx: number) => {
    let penalty = (useCount.get(recipeId) ?? 0) * REUSE_PENALTY
    const days = recipeDays.get(recipeId)
    if (days !== undefined && [dayIdx - 1, dayIdx, dayIdx + 1].some((d) => days.has(d))) {
      penalty += ADJACENT_PENALTY
    }
    return penalty
  }

  let current = week
  const filled: SlotRef[] = []

  for (let dayIdx = 0; dayIdx < current.days.length; dayIdx++) {
    // Comidas principales: se reparte el presupuesto entre los huecos pendientes.
    let holesLeft = MAIN_MEALS.filter((m) => current.days[dayIdx][m] === undefined).length
    for (const meal of MAIN_MEALS) {
      if (current.days[dayIdx][meal] !== undefined) continue
      const totals = dayTotals(dayIdx)
      let best: { slot: MealSlot; score: number } | null = null
      for (const recipe of recipes) {
        if (recipe.mealType !== meal) continue
        const slot = defaultSlot(recipe.id)
        const score =
          fitScore(totals, contribution(slot, recipe), holesLeft) +
          repeatPenalty(recipe.id, dayIdx) +
          random() * JITTER
        if (best === null || score < best.score) best = { slot, score }
      }
      if (best !== null) {
        const ref: SlotRef = { dayIdx, meal }
        current = {
          ...current,
          days: current.days.map((d, i) => (i === dayIdx ? setSlot(d, ref, best.slot) : d)),
        }
        noteUse(best.slot.recipeId, dayIdx)
        filled.push(ref)
      }
      holesLeft = Math.max(holesLeft - 1, 1)
    }

    // Snack: solo si la celda está vacía y mejora el ajuste frente a no poner nada.
    if ((current.days[dayIdx].snacks ?? []).length === 0) {
      const totals = dayTotals(dayIdx)
      const emptyScore = fitScore(totals, null, 1)
      let best: { slot: MealSlot; score: number } | null = null
      for (const recipe of recipes) {
        if (recipe.mealType !== 'snack') continue
        const slot = defaultSlot(recipe.id)
        const score =
          fitScore(totals, contribution(slot, recipe), 1) +
          repeatPenalty(recipe.id, dayIdx) +
          random() * JITTER
        if (best === null || score < best.score) best = { slot, score }
      }
      if (best !== null && best.score < emptyScore) {
        const ref: SlotRef = { dayIdx, meal: 'snack' }
        current = {
          ...current,
          days: current.days.map((d, i) => (i === dayIdx ? setSlot(d, ref, best.slot) : d)),
        }
        noteUse(best.slot.recipeId, dayIdx)
        filled.push({ ...ref, snackIdx: 0 })
      }
    }
  }

  return { week: current, filled }
}
