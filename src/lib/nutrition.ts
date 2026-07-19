import type { Ingredient, Recipe } from '../data/types'

export interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 }

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  }
}

export function scaleMacros(m: Macros, factor: number): Macros {
  return {
    kcal: m.kcal * factor,
    protein: m.protein * factor,
    carbs: m.carbs * factor,
    fat: m.fat * factor,
  }
}

/**
 * Macros de una cantidad de ingrediente expresada en su unidad base:
 * gramos, mililitros (valores por 100) o unidades (valores por unidad).
 */
export function ingredientMacros(ing: Ingredient, qty: number): Macros {
  const factor = ing.unit === 'ud' ? qty : qty / 100
  return {
    kcal: ing.kcal100 * factor,
    protein: ing.protein100 * factor,
    carbs: ing.carbs100 * factor,
    fat: ing.fat100 * factor,
  }
}

/** Precio por unidad base (€/g, €/ml o €/ud), o null si falta el precio. */
export function pricePerBase(ing: Ingredient): number | null {
  if (
    ing.packPrice === undefined ||
    ing.packSize === undefined ||
    ing.packPrice <= 0 ||
    ing.packSize <= 0
  ) {
    return null
  }
  return ing.packPrice / ing.packSize
}

/** Precio en la unidad de venta habitual: €/kg, €/L o €/ud. */
export function displayPrice(ing: Ingredient): { value: number; suffix: string } | null {
  const base = pricePerBase(ing)
  if (base === null) return null
  if (ing.unit === 'g') return { value: base * 1000, suffix: '€/kg' }
  if (ing.unit === 'ml') return { value: base * 1000, suffix: '€/L' }
  return { value: base, suffix: '€/ud' }
}

const STALE_PRICE_MS = 1000 * 60 * 60 * 24 * 30 * 3

/** True si el precio se actualizó hace más de 3 meses. */
export function priceIsStale(ing: Ingredient): boolean {
  if (ing.priceUpdatedAt === undefined || pricePerBase(ing) === null) return false
  const updated = Date.parse(ing.priceUpdatedAt)
  return Number.isFinite(updated) && Date.now() - updated > STALE_PRICE_MS
}

export type IngredientMap = Map<string, Ingredient>

export function ingredientMap(ingredients: Ingredient[]): IngredientMap {
  return new Map(ingredients.map((i) => [i.id, i]))
}

/** Macros de la receta completa (todas las raciones). */
export function recipeMacros(recipe: Recipe, byId: IngredientMap): Macros {
  let total = ZERO_MACROS
  for (const item of recipe.items) {
    const ing = byId.get(item.ingredientId)
    if (ing === undefined) continue
    total = addMacros(total, ingredientMacros(ing, item.qty))
  }
  return total
}

/** Macros por ración. */
export function recipeMacrosPerServing(recipe: Recipe, byId: IngredientMap): Macros {
  const servings = recipe.servings > 0 ? recipe.servings : 1
  return scaleMacros(recipeMacros(recipe, byId), 1 / servings)
}

export interface RecipeCost {
  /** Coste de los ingredientes con precio conocido. */
  total: number
  /** Nombres de los ingredientes sin precio. */
  missingPrices: string[]
}

/** Coste estimado de la receta completa. */
export function recipeCost(recipe: Recipe, byId: IngredientMap): RecipeCost {
  let total = 0
  const missingPrices: string[] = []
  for (const item of recipe.items) {
    const ing = byId.get(item.ingredientId)
    if (ing === undefined) continue
    const perBase = pricePerBase(ing)
    if (perBase === null) {
      missingPrices.push(ing.name)
    } else {
      total += perBase * item.qty
    }
  }
  return { total, missingPrices }
}
