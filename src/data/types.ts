/** Unidad base de un ingrediente. */
export type Unit = 'g' | 'ml' | 'ud'

export const CATEGORIES = [
  'fruteria',
  'carniceria',
  'pescaderia',
  'lacteos',
  'despensa',
  'panaderia',
  'congelados',
  'bebidas',
  'otros',
] as const

export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_LABELS: Record<Category, string> = {
  fruteria: 'Frutería',
  carniceria: 'Carnicería',
  pescaderia: 'Pescadería',
  lacteos: 'Lácteos y huevos',
  despensa: 'Despensa',
  panaderia: 'Panadería',
  congelados: 'Congelados',
  bebidas: 'Bebidas',
  otros: 'Otros',
}

/**
 * Valores nutricionales y precio referidos a la unidad base:
 * por 100 g, por 100 ml o por unidad según `unit`.
 */
export interface Ingredient {
  id: string
  name: string
  category: Category
  unit: Unit
  kcal100: number
  protein100: number
  carbs100: number
  fat100: number
  fiber100?: number
  sugar100?: number
  /** Precio del envase en €, tal como se ve en el súper. */
  packPrice?: number
  /** Tamaño del envase en la unidad base (g, ml o unidades). */
  packSize?: number
  /** Fecha ISO de la última actualización del precio. */
  priceUpdatedAt?: string
}

export const MEAL_TYPES = ['desayuno', 'almuerzo', 'cena', 'snack'] as const
export type MealType = (typeof MEAL_TYPES)[number]

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  cena: 'Cena',
  snack: 'Snack',
}

export interface RecipeItem {
  ingredientId: string
  qty: number
  unit: Unit
}

export interface Recipe {
  id: string
  name: string
  mealType: MealType
  /** Raciones que salen con las cantidades indicadas. */
  servings: number
  items: RecipeItem[]
  steps?: string[]
  tags?: string[]
  /** URL o data-URL base64. */
  photo?: string
}

/** Asignación de una receta a un hueco del planificador. */
export interface MealSlot {
  recipeId: string
  /** Raciones totales de esta comida (por defecto 2). */
  servings: number
  /** Reparto por persona; si falta, se divide a partes iguales. */
  perPerson?: Record<string, number>
}

export interface DayPlan {
  desayuno?: MealSlot
  almuerzo?: MealSlot
  cena?: MealSlot
  snacks?: MealSlot[]
  note?: string
}

/** Línea extra de la compra añadida a mano. */
export interface ShoppingExtra {
  id: string
  name: string
  qty?: string
  price?: number
  checked: boolean
}

/** Estado de la lista de la compra asociado a una semana. */
export interface ShoppingState {
  /** Claves de línea (ingredientId) marcadas como compradas. */
  checked: string[]
  /** Claves de línea marcadas como "ya lo tenemos en casa". */
  haveAtHome: string[]
  extras: ShoppingExtra[]
}

export interface WeekPlan {
  id: string
  /** Lunes de la semana, fecha ISO `yyyy-mm-dd`. */
  weekStart: string
  /** Índices 0 (lunes) a 6 (domingo). */
  days: DayPlan[]
  shopping: ShoppingState
}

export interface MacroTargets {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface Person {
  id: string
  name: string
  targets?: MacroTargets
}

/** Estado completo de la aplicación (lo que se persiste y se exporta). */
export interface AppData {
  version: 1
  persons: Person[]
  ingredients: Ingredient[]
  recipes: Recipe[]
  weeks: WeekPlan[]
  /** Semana que se está planificando ahora mismo. */
  activeWeekId: string | null
  /** Si ya se sembraron los ingredientes de ejemplo. */
  seeded?: boolean
}
