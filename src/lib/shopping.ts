import { CATEGORIES } from '../data/types'
import type { Category, Unit, WeekPlan } from '../data/types'
import { pricePerBase } from './nutrition'
import type { IngredientMap } from './nutrition'
import type { RecipeMap } from './planner'
import { daySlots } from './planner'

export interface ShoppingLine {
  ingredientId: string
  name: string
  category: Category
  unit: Unit
  /** Cantidad calculada a partir de las recetas de la semana. */
  computedQty: number
  /** Cantidad necesaria (ajuste manual si existe, si no la calculada). */
  neededQty: number
  /** Cantidad que ya hay en casa. */
  atHomeQty: number
  /** Cantidad a comprar: necesaria menos lo que hay en casa. */
  toBuyQty: number
  /** Coste de lo necesario, o null si el ingrediente no tiene precio. */
  costNeeded: number | null
  /** Coste de lo que hay que comprar, o null si no tiene precio. */
  costToBuy: number | null
}

/** Suma los ingredientes de todas las comidas planificadas de la semana. */
export function aggregateWeek(
  week: WeekPlan,
  recipes: RecipeMap,
  ingredients: IngredientMap,
): ShoppingLine[] {
  const totals = new Map<string, number>()
  for (const day of week.days) {
    for (const slot of daySlots(day)) {
      const recipe = recipes.get(slot.recipeId)
      if (recipe === undefined || recipe.servings <= 0) continue
      const factor = slot.servings / recipe.servings
      for (const item of recipe.items) {
        totals.set(item.ingredientId, (totals.get(item.ingredientId) ?? 0) + item.qty * factor)
      }
    }
  }

  const overrides = week.shopping.qtyOverrides ?? {}
  const atHome = week.shopping.atHomeQty ?? {}
  const legacyHome = new Set(week.shopping.haveAtHome)

  const lines: ShoppingLine[] = []
  for (const [ingredientId, computedQty] of totals) {
    const ing = ingredients.get(ingredientId)
    if (ing === undefined) continue
    const neededQty = overrides[ingredientId] ?? computedQty
    const atHomeQty = atHome[ingredientId] ?? (legacyHome.has(ingredientId) ? neededQty : 0)
    const toBuyQty = Math.max(0, neededQty - atHomeQty)
    const perBase = pricePerBase(ing)
    lines.push({
      ingredientId,
      name: ing.name,
      category: ing.category,
      unit: ing.unit,
      computedQty,
      neededQty,
      atHomeQty,
      toBuyQty,
      costNeeded: perBase === null ? null : perBase * neededQty,
      costToBuy: perBase === null ? null : perBase * toBuyQty,
    })
  }
  return lines.sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

/** Líneas agrupadas por categoría en el orden de los pasillos del súper. */
export function groupByCategory(lines: ShoppingLine[]): { category: Category; lines: ShoppingLine[] }[] {
  return CATEGORIES.map((category) => ({
    category,
    lines: lines.filter((l) => l.category === category),
  })).filter((g) => g.lines.length > 0)
}

export interface ShoppingTotals {
  /** Coste de todo lo que pide la semana, sin descontar la despensa. */
  totalNeeded: number
  /** Coste de lo que hay que comprar (necesario menos lo de casa). */
  totalToBuy: number
  /** Líneas pendientes de comprar que no tienen precio. */
  linesWithoutPrice: number
}

export function shoppingTotals(lines: ShoppingLine[], week: WeekPlan): ShoppingTotals {
  let totalNeeded = 0
  let totalToBuy = 0
  let linesWithoutPrice = 0
  for (const line of lines) {
    if (line.costNeeded !== null) totalNeeded += line.costNeeded
    if (line.costToBuy !== null) totalToBuy += line.costToBuy
    if (line.costToBuy === null && line.toBuyQty > 0) linesWithoutPrice += 1
  }
  for (const extra of week.shopping.extras) {
    if (extra.price !== undefined) {
      totalNeeded += extra.price
      totalToBuy += extra.price
    }
  }
  return { totalNeeded, totalToBuy, linesWithoutPrice }
}
