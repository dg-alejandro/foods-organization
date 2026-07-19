import { useMemo, useState } from 'react'
import { useAppStore } from '../data/store'
import { newId } from '../data/storage'
import { CATEGORIES, CATEGORY_LABELS } from '../data/types'
import type { Category, Ingredient, Unit } from '../data/types'
import { displayPrice, priceIsStale } from '../lib/nutrition'
import { fmtEuro, fmtNum, parseNum } from '../lib/format'
import { Modal } from '../components/Modal'

const UNIT_LABELS: Record<Unit, string> = { g: 'gramos (g)', ml: 'mililitros (ml)', ud: 'unidades' }
const PACK_SIZE_SUFFIX: Record<Unit, string> = { g: 'g', ml: 'ml', ud: 'ud' }

interface FormState {
  name: string
  category: Category
  unit: Unit
  kcal100: string
  protein100: string
  carbs100: string
  fat100: string
  packPrice: string
  packSize: string
}

function toForm(ing?: Ingredient): FormState {
  const numStr = (n?: number) => (n === undefined ? '' : String(n).replace('.', ','))
  return {
    name: ing?.name ?? '',
    category: ing?.category ?? 'despensa',
    unit: ing?.unit ?? 'g',
    kcal100: numStr(ing?.kcal100),
    protein100: numStr(ing?.protein100),
    carbs100: numStr(ing?.carbs100),
    fat100: numStr(ing?.fat100),
    packPrice: numStr(ing?.packPrice),
    packSize: numStr(ing?.packSize),
  }
}

const inputCls =
  'mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 focus:border-orange-400 focus:outline-none'

function IngredientForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Ingredient
  onSave: (ing: Ingredient) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<FormState>(() => toForm(initial))
  const [error, setError] = useState<string | null>(null)

  const set = (change: Partial<FormState>) => setForm((f) => ({ ...f, ...change }))

  const per = form.unit === 'ud' ? 'por unidad' : form.unit === 'ml' ? 'por 100 ml' : 'por 100 g'

  const previewPrice = (() => {
    const price = parseNum(form.packPrice)
    const size = parseNum(form.packSize)
    if (price === null || size === null || price <= 0 || size <= 0) return null
    return displayPrice({ ...toIngredient(form, initial), packPrice: price, packSize: size })
  })()

  function toIngredient(f: FormState, prev?: Ingredient): Ingredient {
    const num = (raw: string) => parseNum(raw) ?? 0
    const price = parseNum(f.packPrice)
    const size = parseNum(f.packSize)
    const hasPrice = price !== null && price > 0 && size !== null && size > 0
    const priceChanged = prev === undefined || prev.packPrice !== price || prev.packSize !== size
    return {
      id: prev?.id ?? newId(),
      name: f.name.trim(),
      category: f.category,
      unit: f.unit,
      kcal100: num(f.kcal100),
      protein100: num(f.protein100),
      carbs100: num(f.carbs100),
      fat100: num(f.fat100),
      packPrice: hasPrice ? price : undefined,
      packSize: hasPrice ? size : undefined,
      priceUpdatedAt: hasPrice
        ? priceChanged
          ? new Date().toISOString()
          : prev?.priceUpdatedAt
        : undefined,
    }
  }

  const handleSave = () => {
    if (form.name.trim() === '') {
      setError('El nombre es obligatorio.')
      return
    }
    onSave(toIngredient(form, initial))
    onClose()
  }

  return (
    <Modal title={initial === undefined ? 'Nuevo ingrediente' : 'Editar ingrediente'} onClose={onClose}>
      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-stone-600">Nombre</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            className={inputCls}
            autoFocus
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-stone-600">Categoría</span>
            <select
              value={form.category}
              onChange={(e) => set({ category: e.target.value as Category })}
              className={inputCls}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-stone-600">Unidad base</span>
            <select
              value={form.unit}
              onChange={(e) => set({ unit: e.target.value as Unit })}
              className={inputCls}
            >
              {(Object.keys(UNIT_LABELS) as Unit[]).map((u) => (
                <option key={u} value={u}>
                  {UNIT_LABELS[u]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-stone-600">Valores nutricionales ({per})</legend>
          <div className="mt-1 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ['kcal100', 'Kcal'],
                ['protein100', 'Proteínas (g)'],
                ['carbs100', 'Hidratos (g)'],
                ['fat100', 'Grasas (g)'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block">
                <span className="text-xs text-stone-500">{label}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form[key]}
                  onChange={(e) => set({ [key]: e.target.value })}
                  className={`${inputCls} text-right`}
                />
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-stone-600">Precio (opcional)</legend>
          <div className="mt-1 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-stone-500">Precio del envase (€)</span>
              <input
                type="text"
                inputMode="decimal"
                value={form.packPrice}
                onChange={(e) => set({ packPrice: e.target.value })}
                className={`${inputCls} text-right`}
                placeholder="1,95"
              />
            </label>
            <label className="block">
              <span className="text-xs text-stone-500">
                Tamaño del envase ({PACK_SIZE_SUFFIX[form.unit]})
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={form.packSize}
                onChange={(e) => set({ packSize: e.target.value })}
                className={`${inputCls} text-right`}
                placeholder="500"
              />
            </label>
          </div>
          {previewPrice !== null && (
            <p className="mt-1 text-sm text-stone-500">
              Equivale a {fmtNum(previewPrice.value, 2)} {previewPrice.suffix}
            </p>
          )}
        </fieldset>

        {error !== null && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600"
          >
            Guardar
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function IngredientesPage() {
  const { data, update } = useAppStore()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Category | 'todas'>('todas')
  const [editing, setEditing] = useState<Ingredient | 'new' | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('es')
    return data.ingredients
      .filter((i) => (category === 'todas' ? true : i.category === category))
      .filter((i) => (q === '' ? true : i.name.toLocaleLowerCase('es').includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [data.ingredients, search, category])

  const usedBy = (id: string) =>
    data.recipes.filter((r) => r.items.some((it) => it.ingredientId === id))

  const handleSave = (ing: Ingredient) => {
    update((d) => {
      const exists = d.ingredients.some((i) => i.id === ing.id)
      return {
        ...d,
        ingredients: exists
          ? d.ingredients.map((i) => (i.id === ing.id ? ing : i))
          : [...d.ingredients, ing],
      }
    })
  }

  const handleDelete = (ing: Ingredient) => {
    const users = usedBy(ing.id)
    if (users.length > 0) {
      window.alert(
        `No se puede borrar «${ing.name}»: se usa en ${users.length === 1 ? 'la receta' : 'las recetas'} ${users.map((r) => `«${r.name}»`).join(', ')}.`,
      )
      return
    }
    if (window.confirm(`¿Borrar el ingrediente «${ing.name}»?`)) {
      update((d) => ({ ...d, ingredients: d.ingredients.filter((i) => i.id !== ing.id) }))
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold text-stone-800">Ingredientes</h2>
        <span className="text-sm text-stone-400">{data.ingredients.length}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar…"
            className="w-48 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category | 'todas')}
            className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
          >
            <option value="todas">Todas las categorías</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600"
          >
            + Nuevo
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-stone-500">
          No hay ingredientes que coincidan con la búsqueda.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-orange-100 bg-white shadow-sm">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="border-b border-orange-100 text-left text-xs uppercase tracking-wide text-stone-400">
                <th className="px-4 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Categoría</th>
                <th className="px-4 py-3 text-right font-semibold">Kcal</th>
                <th className="px-4 py-3 text-right font-semibold">P</th>
                <th className="px-4 py-3 text-right font-semibold">H</th>
                <th className="px-4 py-3 text-right font-semibold">G</th>
                <th className="px-4 py-3 text-right font-semibold">Precio</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ing) => {
                const price = displayPrice(ing)
                const per = ing.unit === 'ud' ? '/ud' : ing.unit === 'ml' ? '/100ml' : '/100g'
                return (
                  <tr key={ing.id} className="border-b border-orange-50 last:border-0 hover:bg-orange-50/50">
                    <td className="px-4 py-2.5 font-medium text-stone-700">{ing.name}</td>
                    <td className="px-4 py-2.5 text-stone-500">{CATEGORY_LABELS[ing.category]}</td>
                    <td className="px-4 py-2.5 text-right">
                      {fmtNum(ing.kcal100)}
                      <span className="text-xs text-stone-400">{per}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-stone-500">{fmtNum(ing.protein100, 1)}</td>
                    <td className="px-4 py-2.5 text-right text-stone-500">{fmtNum(ing.carbs100, 1)}</td>
                    <td className="px-4 py-2.5 text-right text-stone-500">{fmtNum(ing.fat100, 1)}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {price === null ? (
                        <span className="text-stone-300">—</span>
                      ) : (
                        <span>
                          {fmtNum(price.value, 2)} {price.suffix}
                          {priceIsStale(ing) && (
                            <span
                              title="Precio de hace más de 3 meses"
                              className="ml-1 cursor-help text-amber-500"
                            >
                              ⏳
                            </span>
                          )}
                          {ing.packPrice !== undefined && ing.packSize !== undefined && (
                            <span className="block text-xs text-stone-400">
                              {fmtEuro(ing.packPrice)} · {fmtNum(ing.packSize)}{' '}
                              {PACK_SIZE_SUFFIX[ing.unit]}
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setEditing(ing)}
                        className="rounded px-2 py-1 text-stone-400 hover:bg-orange-100 hover:text-stone-600"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(ing)}
                        className="rounded px-2 py-1 text-stone-400 hover:bg-red-50 hover:text-red-600"
                        title="Borrar"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing !== null && (
        <IngredientForm
          initial={editing === 'new' ? undefined : editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
