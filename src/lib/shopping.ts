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
  /** Cantidad efectiva (ajuste manual si existe, si no la calculada). */
  qty: number
  /** Coste estimado de `qty`, o null si el ingrediente no tiene precio. */
  cost: number | null
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
  const lines: ShoppingLine[] = []
  for (const [ingredientId, computedQty] of totals) {
    const ing = ingredients.get(ingredientId)
    if (ing === undefined) continue
    const qty = overrides[ingredientId] ?? computedQty
    const perBase = pricePerBase(ing)
    lines.push({
      ingredientId,
      name: ing.name,
      category: ing.category,
      unit: ing.unit,
      computedQty,
      qty,
      cost: perBase === null ? null : perBase * qty,
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
  /** Total estimado en € (sin líneas "ya lo tenemos"). */
  total: number
  /** Líneas contadas en el total que no tienen precio. */
  linesWithoutPrice: number
}

export function shoppingTotals(
  lines: ShoppingLine[],
  week: WeekPlan,
): ShoppingTotals {
  const haveAtHome = new Set(week.shopping.haveAtHome)
  let total = 0
  let linesWithoutPrice = 0
  for (const line of lines) {
    if (haveAtHome.has(line.ingredientId)) continue
    if (line.cost === null) linesWithoutPrice += 1
    else total += line.cost
  }
  for (const extra of week.shopping.extras) {
    if (extra.price !== undefined) total += extra.price
  }
  return { total, linesWithoutPrice }
}
