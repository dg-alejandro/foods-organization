/**
 * Genera `demo-semana.json` en la raíz del proyecto: una copia de seguridad
 * de ejemplo con precios orientativos, 14 recetas y una semana completa
 * planificada. Se importa desde Ajustes → Importar JSON.
 *
 * Uso: npx tsx scripts/generar-demo.ts
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { SEED_INGREDIENTS } from '../src/data/seed'
import type { AppData, Ingredient, MealSlot, MealType, Recipe, WeekPlan } from '../src/data/types'

const id = () => crypto.randomUUID()
const now = new Date().toISOString()

const ingredients: Ingredient[] = SEED_INGREDIENTS.map((s) => ({ ...s, id: id() }))
const byName = new Map(ingredients.map((i) => [i.name, i]))

const PRICES: [string, number, number][] = [
  ['Copos de avena', 1.1, 500],
  ['Leche semidesnatada', 0.98, 1000],
  ['Plátano', 2.29, 1000],
  ['Nueces', 2.2, 200],
  ['Miel', 3.5, 500],
  ['Pan de molde integral', 1.55, 460],
  ['Aguacate', 2.5, 500],
  ['Huevo', 2.5, 12],
  ['Aceite de oliva virgen extra', 7.5, 1000],
  ['Yogur natural', 1.8, 8],
  ['Fresas', 2.2, 500],
  ['Muslo de pollo', 3.2, 1000],
  ['Pechuga de pollo', 5.95, 1000],
  ['Patata', 2.7, 3000],
  ['Cebolla', 1.5, 1000],
  ['Ajo', 1.2, 250],
  ['Lentejas secas', 1.89, 1000],
  ['Zanahoria', 0.95, 1000],
  ['Pimiento rojo', 2.2, 1000],
  ['Tomate frito', 0.85, 400],
  ['Pasta', 1.05, 500],
  ['Atún en lata (escurrido)', 2.5, 156],
  ['Ternera magra', 9.5, 1000],
  ['Salteado de verduras congelado', 1.8, 750],
  ['Arroz', 1.15, 1000],
  ['Merluza', 8.9, 1000],
  ['Brócoli', 1.85, 500],
  ['Limón', 1.6, 1000],
  ['Lechuga', 1.1, 500],
  ['Tomate', 1.95, 1000],
  ['Salmón', 11.5, 1000],
  ['Espinacas', 1.3, 300],
  ['Garbanzos cocidos (bote)', 0.7, 400],
  ['Tofu', 1.85, 250],
  ['Dorada', 7.5, 1000],
  ['Calabacín', 1.45, 1000],
  ['Pan de barra', 0.55, 250],
  ['Hummus', 1.45, 240],
]

for (const [name, packPrice, packSize] of PRICES) {
  const ing = byName.get(name)
  if (ing === undefined) throw new Error(`Ingrediente no encontrado: ${name}`)
  ing.packPrice = packPrice
  ing.packSize = packSize
  ing.priceUpdatedAt = now
}

function receta(
  name: string,
  mealType: MealType,
  servings: number,
  items: [string, number][],
  steps?: string[],
  tags?: string[],
): Recipe {
  return {
    id: id(),
    name,
    mealType,
    servings,
    items: items.map(([n, qty]) => {
      const ing = byName.get(n)
      if (ing === undefined) throw new Error(`Ingrediente no encontrado: ${n}`)
      return { ingredientId: ing.id, qty, unit: ing.unit }
    }),
    steps,
    tags,
  }
}

const R = {
  arrozPollo: receta('Arroz con pollo', 'almuerzo', 2, [
    ['Pechuga de pollo', 300],
    ['Arroz', 200],
  ]),
  avena: receta(
    'Avena con plátano y nueces',
    'desayuno',
    2,
    [
      ['Copos de avena', 80],
      ['Leche semidesnatada', 400],
      ['Plátano', 200],
      ['Nueces', 30],
      ['Miel', 20],
    ],
    ['Calentar la leche y cocer la avena 5 min.', 'Servir con el plátano, las nueces y la miel.'],
    ['rápida'],
  ),
  tostadas: receta(
    'Tostadas de aguacate con huevo',
    'desayuno',
    2,
    [
      ['Pan de molde integral', 120],
      ['Aguacate', 200],
      ['Huevo', 2],
      ['Aceite de oliva virgen extra', 10],
    ],
    ['Tostar el pan.', 'Machacar el aguacate y repartirlo.', 'Huevos a la plancha y montar.'],
    ['rápida'],
  ),
  yogurFresas: receta(
    'Yogur con fresas y avena',
    'desayuno',
    2,
    [
      ['Yogur natural', 2],
      ['Fresas', 250],
      ['Copos de avena', 40],
      ['Miel', 15],
    ],
    ['Trocear las fresas.', 'Mezclar todo en un bol.'],
    ['rápida', 'sin cocinar'],
  ),
  polloHorno: receta(
    'Pollo al horno con patatas',
    'almuerzo',
    2,
    [
      ['Muslo de pollo', 500],
      ['Patata', 500],
      ['Cebolla', 150],
      ['Ajo', 10],
      ['Aceite de oliva virgen extra', 30],
    ],
    [
      'Precalentar el horno a 200 °C.',
      'Cortar patata y cebolla, salpimentar todo.',
      'Hornear 45-50 min dándole la vuelta a mitad.',
    ],
    ['horno'],
  ),
  lentejas: receta(
    'Lentejas estofadas',
    'almuerzo',
    4,
    [
      ['Lentejas secas', 300],
      ['Patata', 300],
      ['Zanahoria', 200],
      ['Cebolla', 150],
      ['Pimiento rojo', 150],
      ['Ajo', 10],
      ['Tomate frito', 100],
      ['Aceite de oliva virgen extra', 30],
    ],
    ['Sofreír la verdura picada.', 'Añadir lentejas y cubrir con agua.', 'Cocer 35-40 min.'],
    ['batch', 'tupper'],
  ),
  pastaAtun: receta(
    'Pasta con atún y tomate',
    'almuerzo',
    2,
    [
      ['Pasta', 200],
      ['Atún en lata (escurrido)', 120],
      ['Tomate frito', 200],
      ['Cebolla', 100],
      ['Aceite de oliva virgen extra', 20],
    ],
    ['Cocer la pasta.', 'Sofreír cebolla, añadir tomate y atún.', 'Mezclar y servir.'],
    ['rápida'],
  ),
  ternera: receta(
    'Salteado de ternera con arroz',
    'almuerzo',
    2,
    [
      ['Ternera magra', 300],
      ['Salteado de verduras congelado', 400],
      ['Arroz', 180],
      ['Aceite de oliva virgen extra', 20],
    ],
    ['Cocer el arroz.', 'Saltear la ternera, añadir la verdura.', 'Servir sobre el arroz.'],
    ['rápida'],
  ),
  merluza: receta(
    'Merluza a la plancha con brócoli',
    'cena',
    2,
    [
      ['Merluza', 400],
      ['Brócoli', 400],
      ['Patata', 300],
      ['Aceite de oliva virgen extra', 25],
      ['Limón', 50],
    ],
    ['Cocer patata y brócoli al vapor.', 'Merluza a la plancha 3 min por lado.', 'Aliñar.'],
    ['ligera'],
  ),
  tortilla: receta(
    'Tortilla de patatas con ensalada',
    'cena',
    2,
    [
      ['Huevo', 6],
      ['Patata', 500],
      ['Cebolla', 150],
      ['Aceite de oliva virgen extra', 40],
      ['Lechuga', 150],
      ['Tomate', 200],
    ],
    ['Pochar patata y cebolla.', 'Cuajar la tortilla.', 'Acompañar con ensalada.'],
    ['clásica'],
  ),
  salmon: receta(
    'Salmón con espinacas salteadas',
    'cena',
    2,
    [
      ['Salmón', 350],
      ['Espinacas', 300],
      ['Ajo', 5],
      ['Aceite de oliva virgen extra', 20],
    ],
    ['Salmón a la plancha 4 min por lado.', 'Saltear las espinacas con ajo.'],
    ['ligera', 'rápida'],
  ),
  garbanzos: receta(
    'Ensalada de garbanzos con tofu',
    'cena',
    2,
    [
      ['Garbanzos cocidos (bote)', 400],
      ['Tofu', 200],
      ['Tomate', 200],
      ['Pimiento rojo', 100],
      ['Aceite de oliva virgen extra', 20],
    ],
    ['Dorar el tofu en dados.', 'Mezclar todo y aliñar.'],
    ['sin cocinar', 'veggie'],
  ),
  dorada: receta(
    'Dorada al horno con calabacín',
    'cena',
    2,
    [
      ['Dorada', 500],
      ['Calabacín', 400],
      ['Patata', 300],
      ['Aceite de oliva virgen extra', 25],
      ['Limón', 50],
    ],
    ['Horno a 190 °C.', 'Cama de patata y calabacín, la dorada encima.', 'Hornear 25 min.'],
    ['horno'],
  ),
  snackYogur: receta(
    'Yogur con nueces y miel',
    'snack',
    2,
    [
      ['Yogur natural', 2],
      ['Nueces', 20],
      ['Miel', 15],
    ],
    undefined,
    ['rápida'],
  ),
  snackHummus: receta(
    'Tosta de hummus',
    'snack',
    2,
    [
      ['Pan de barra', 100],
      ['Hummus', 100],
    ],
    undefined,
    ['rápida'],
  ),
}

const persons = [
  { id: id(), name: 'Alejandro', targets: { kcal: 2200, protein: 130, carbs: 240, fat: 70 } },
  { id: id(), name: 'Persona 2', targets: { kcal: 1800, protein: 100, carbs: 190, fat: 60 } },
]
const [p1, p2] = persons.map((p) => p.id)

const slot = (r: Recipe, a: number, b: number): MealSlot => ({
  recipeId: r.id,
  servings: a + b,
  perPerson: { [p1]: a, [p2]: b },
})

const week: WeekPlan = {
  id: id(),
  weekStart: '2026-08-03',
  days: [
    {
      desayuno: slot(R.avena, 1, 1),
      almuerzo: slot(R.lentejas, 1.5, 1),
      cena: slot(R.merluza, 1, 1),
      snacks: [slot(R.snackYogur, 1, 1)],
      note: 'entreno por la tarde',
    },
    {
      desayuno: slot(R.tostadas, 1, 1),
      almuerzo: slot(R.pastaAtun, 1.5, 1),
      cena: slot(R.salmon, 1, 1),
    },
    {
      desayuno: slot(R.avena, 1, 1),
      almuerzo: slot(R.polloHorno, 1.5, 1),
      cena: slot(R.tortilla, 1, 1),
      snacks: [slot(R.snackHummus, 1, 1)],
    },
    {
      desayuno: slot(R.yogurFresas, 1, 1),
      almuerzo: slot(R.lentejas, 1.5, 1),
      cena: slot(R.dorada, 1, 1),
      note: 'las lentejas ya están hechas del lunes',
    },
    {
      desayuno: slot(R.tostadas, 1, 1),
      almuerzo: slot(R.ternera, 1.5, 1),
      cena: slot(R.garbanzos, 1, 1),
    },
    {
      desayuno: slot(R.yogurFresas, 1, 1),
      almuerzo: slot(R.arrozPollo, 1.5, 1),
      cena: slot(R.tortilla, 1, 1),
      snacks: [slot(R.snackYogur, 1, 1)],
      note: 'vermut con amigos al mediodía',
    },
    {
      desayuno: slot(R.tostadas, 1, 1),
      almuerzo: slot(R.polloHorno, 1.5, 1),
      cena: slot(R.salmon, 1, 1),
      note: 'preparar tuppers para la semana',
    },
  ],
  shopping: { checked: [], haveAtHome: [], extras: [] },
}

const data: AppData = {
  version: 1,
  persons,
  ingredients,
  recipes: Object.values(R),
  weeks: [week],
  activeWeekId: week.id,
  seeded: true,
}

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'demo-semana.json')
writeFileSync(out, JSON.stringify(data, null, 2), 'utf8')
console.log(`Escrito ${out} (${data.recipes.length} recetas, ${data.ingredients.length} ingredientes)`)
