import type { Ingredient } from './types'

export type SeedIngredient = Omit<Ingredient, 'id'>

/**
 * Ingredientes comunes de supermercado español con macros aproximadas
 * (por 100 g, 100 ml o unidad según corresponda). Sin precio: se rellena a mano.
 */
export const SEED_INGREDIENTS: SeedIngredient[] = [
  // Frutería
  { name: 'Plátano', category: 'fruteria', unit: 'g', kcal100: 89, protein100: 1.1, carbs100: 23, fat100: 0.3 },
  { name: 'Manzana', category: 'fruteria', unit: 'g', kcal100: 52, protein100: 0.3, carbs100: 14, fat100: 0.2 },
  { name: 'Naranja', category: 'fruteria', unit: 'g', kcal100: 47, protein100: 0.9, carbs100: 12, fat100: 0.1 },
  { name: 'Fresas', category: 'fruteria', unit: 'g', kcal100: 32, protein100: 0.7, carbs100: 7.7, fat100: 0.3 },
  { name: 'Aguacate', category: 'fruteria', unit: 'g', kcal100: 160, protein100: 2, carbs100: 8.5, fat100: 14.7 },
  { name: 'Tomate', category: 'fruteria', unit: 'g', kcal100: 18, protein100: 0.9, carbs100: 3.9, fat100: 0.2 },
  { name: 'Cebolla', category: 'fruteria', unit: 'g', kcal100: 40, protein100: 1.1, carbs100: 9.3, fat100: 0.1 },
  { name: 'Ajo', category: 'fruteria', unit: 'g', kcal100: 149, protein100: 6.4, carbs100: 33, fat100: 0.5 },
  { name: 'Pimiento rojo', category: 'fruteria', unit: 'g', kcal100: 31, protein100: 1, carbs100: 6, fat100: 0.3 },
  { name: 'Calabacín', category: 'fruteria', unit: 'g', kcal100: 17, protein100: 1.2, carbs100: 3.1, fat100: 0.3 },
  { name: 'Zanahoria', category: 'fruteria', unit: 'g', kcal100: 41, protein100: 0.9, carbs100: 9.6, fat100: 0.2 },
  { name: 'Patata', category: 'fruteria', unit: 'g', kcal100: 77, protein100: 2, carbs100: 17, fat100: 0.1 },
  { name: 'Lechuga', category: 'fruteria', unit: 'g', kcal100: 15, protein100: 1.4, carbs100: 2.9, fat100: 0.2 },
  { name: 'Espinacas', category: 'fruteria', unit: 'g', kcal100: 23, protein100: 2.9, carbs100: 3.6, fat100: 0.4 },
  { name: 'Brócoli', category: 'fruteria', unit: 'g', kcal100: 34, protein100: 2.8, carbs100: 6.6, fat100: 0.4 },
  { name: 'Limón', category: 'fruteria', unit: 'g', kcal100: 29, protein100: 1.1, carbs100: 9.3, fat100: 0.3 },

  // Carnicería
  { name: 'Pechuga de pollo', category: 'carniceria', unit: 'g', kcal100: 110, protein100: 23, carbs100: 0, fat100: 1.5 },
  { name: 'Muslo de pollo', category: 'carniceria', unit: 'g', kcal100: 175, protein100: 18, carbs100: 0, fat100: 11 },
  { name: 'Ternera magra', category: 'carniceria', unit: 'g', kcal100: 131, protein100: 21, carbs100: 0, fat100: 5 },
  { name: 'Lomo de cerdo', category: 'carniceria', unit: 'g', kcal100: 143, protein100: 21, carbs100: 0, fat100: 6.2 },
  { name: 'Carne picada mixta', category: 'carniceria', unit: 'g', kcal100: 220, protein100: 18, carbs100: 0, fat100: 16 },
  { name: 'Pechuga de pavo', category: 'carniceria', unit: 'g', kcal100: 105, protein100: 24, carbs100: 0, fat100: 1 },
  { name: 'Jamón serrano', category: 'carniceria', unit: 'g', kcal100: 241, protein100: 31, carbs100: 0.1, fat100: 13 },
  { name: 'Jamón cocido', category: 'carniceria', unit: 'g', kcal100: 110, protein100: 18, carbs100: 1.5, fat100: 3.5 },

  // Pescadería
  { name: 'Merluza', category: 'pescaderia', unit: 'g', kcal100: 72, protein100: 15.9, carbs100: 0, fat100: 0.9 },
  { name: 'Salmón', category: 'pescaderia', unit: 'g', kcal100: 208, protein100: 20, carbs100: 0, fat100: 13 },
  { name: 'Atún fresco', category: 'pescaderia', unit: 'g', kcal100: 130, protein100: 28, carbs100: 0, fat100: 1.3 },
  { name: 'Gambas', category: 'pescaderia', unit: 'g', kcal100: 85, protein100: 20, carbs100: 0.2, fat100: 0.5 },
  { name: 'Dorada', category: 'pescaderia', unit: 'g', kcal100: 96, protein100: 19.8, carbs100: 0, fat100: 1.8 },

  // Lácteos y huevos
  { name: 'Leche semidesnatada', category: 'lacteos', unit: 'ml', kcal100: 46, protein100: 3.1, carbs100: 4.7, fat100: 1.6 },
  { name: 'Huevo', category: 'lacteos', unit: 'ud', kcal100: 70, protein100: 6.3, carbs100: 0.4, fat100: 4.8 },
  { name: 'Yogur natural', category: 'lacteos', unit: 'ud', kcal100: 57, protein100: 4.1, carbs100: 5.5, fat100: 2 },
  { name: 'Queso fresco batido 0%', category: 'lacteos', unit: 'g', kcal100: 47, protein100: 8, carbs100: 4, fat100: 0.2 },
  { name: 'Queso curado', category: 'lacteos', unit: 'g', kcal100: 402, protein100: 25, carbs100: 1.3, fat100: 33 },
  { name: 'Mantequilla', category: 'lacteos', unit: 'g', kcal100: 717, protein100: 0.9, carbs100: 0.1, fat100: 81 },
  { name: 'Nata para cocinar', category: 'lacteos', unit: 'ml', kcal100: 189, protein100: 2.5, carbs100: 3.8, fat100: 18 },

  // Despensa
  { name: 'Arroz', category: 'despensa', unit: 'g', kcal100: 360, protein100: 7, carbs100: 79, fat100: 0.9 },
  { name: 'Pasta', category: 'despensa', unit: 'g', kcal100: 371, protein100: 13, carbs100: 74, fat100: 1.5 },
  { name: 'Lentejas secas', category: 'despensa', unit: 'g', kcal100: 352, protein100: 24.6, carbs100: 60, fat100: 1.1 },
  { name: 'Garbanzos cocidos (bote)', category: 'despensa', unit: 'g', kcal100: 139, protein100: 7.7, carbs100: 20, fat100: 2.6 },
  { name: 'Atún en lata (escurrido)', category: 'despensa', unit: 'g', kcal100: 190, protein100: 26, carbs100: 0, fat100: 9 },
  { name: 'Tomate frito', category: 'despensa', unit: 'g', kcal100: 78, protein100: 1.5, carbs100: 8.5, fat100: 4.2 },
  { name: 'Aceite de oliva virgen extra', category: 'despensa', unit: 'ml', kcal100: 884, protein100: 0, carbs100: 0, fat100: 100 },
  { name: 'Harina de trigo', category: 'despensa', unit: 'g', kcal100: 364, protein100: 10, carbs100: 76, fat100: 1 },
  { name: 'Azúcar', category: 'despensa', unit: 'g', kcal100: 387, protein100: 0, carbs100: 100, fat100: 0 },
  { name: 'Copos de avena', category: 'despensa', unit: 'g', kcal100: 389, protein100: 16.9, carbs100: 66, fat100: 6.9 },
  { name: 'Chocolate negro 85%', category: 'despensa', unit: 'g', kcal100: 584, protein100: 9.8, carbs100: 22.9, fat100: 46.4 },
  { name: 'Nueces', category: 'despensa', unit: 'g', kcal100: 654, protein100: 15.2, carbs100: 13.7, fat100: 65.2 },
  { name: 'Miel', category: 'despensa', unit: 'g', kcal100: 304, protein100: 0.3, carbs100: 82, fat100: 0 },

  // Panadería
  { name: 'Pan de barra', category: 'panaderia', unit: 'g', kcal100: 265, protein100: 8, carbs100: 52, fat100: 1.6 },
  { name: 'Pan de molde integral', category: 'panaderia', unit: 'g', kcal100: 244, protein100: 11, carbs100: 41, fat100: 3.5 },

  // Congelados
  { name: 'Guisantes congelados', category: 'congelados', unit: 'g', kcal100: 81, protein100: 5.4, carbs100: 14, fat100: 0.4 },
  { name: 'Salteado de verduras congelado', category: 'congelados', unit: 'g', kcal100: 45, protein100: 2.1, carbs100: 7.5, fat100: 0.7 },

  // Bebidas
  { name: 'Cerveza', category: 'bebidas', unit: 'ml', kcal100: 43, protein100: 0.5, carbs100: 3.6, fat100: 0 },
  { name: 'Vino tinto', category: 'bebidas', unit: 'ml', kcal100: 85, protein100: 0.1, carbs100: 2.6, fat100: 0 },

  // Otros
  { name: 'Tofu', category: 'otros', unit: 'g', kcal100: 76, protein100: 8, carbs100: 1.9, fat100: 4.8 },
  { name: 'Hummus', category: 'otros', unit: 'g', kcal100: 166, protein100: 7.9, carbs100: 14.3, fat100: 9.6 },
]
