import { useMemo, useRef, useState } from 'react'
import { useAppStore } from '../data/store'
import { newId } from '../data/storage'
import { MEAL_TYPES, MEAL_TYPE_LABELS } from '../data/types'
import type { Ingredient, MealType, Recipe } from '../data/types'
import {
  ingredientMap,
  recipeCost,
  recipeMacros,
  recipeMacrosPerServing,
  scaleMacros,
} from '../lib/nutrition'
import { fmtEuro, fmtNum, parseNum } from '../lib/format'
import { Modal } from '../components/Modal'

const inputCls =
  'mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 focus:border-orange-400 focus:outline-none'

const MEAL_BADGE: Record<MealType, string> = {
  desayuno: 'bg-sky-100 text-sky-700',
  almuerzo: 'bg-amber-100 text-amber-700',
  cena: 'bg-indigo-100 text-indigo-700',
  snack: 'bg-emerald-100 text-emerald-700',
}

interface FormItem {
  ingredientId: string
  qty: string
}

interface FormState {
  name: string
  mealType: MealType
  servings: string
  items: FormItem[]
  steps: string
  tags: string
  photo: string
}

function toForm(r?: Recipe): FormState {
  return {
    name: r?.name ?? '',
    mealType: r?.mealType ?? 'almuerzo',
    servings: String(r?.servings ?? 2),
    items: (r?.items ?? []).map((it) => ({
      ingredientId: it.ingredientId,
      qty: String(it.qty).replace('.', ','),
    })),
    steps: (r?.steps ?? []).join('\n'),
    tags: (r?.tags ?? []).join(', '),
    photo: r?.photo ?? '',
  }
}

function IngredientPicker({
  ingredients,
  excludeIds,
  onPick,
}: {
  ingredients: Ingredient[]
  excludeIds: Set<string>
  onPick: (ing: Ingredient) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const matches = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('es')
    if (q === '') return []
    return ingredients
      .filter((i) => !excludeIds.has(i.id) && i.name.toLocaleLowerCase('es').includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
      .slice(0, 8)
  }, [ingredients, excludeIds, query])

  return (
    <div className="relative">
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Añadir ingrediente…"
        className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-stone-200 bg-white shadow-lg">
          {matches.map((ing) => (
            <li key={ing.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(ing)
                  setQuery('')
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-orange-50"
              >
                <span>{ing.name}</span>
                <span className="text-xs text-stone-400">
                  {fmtNum(ing.kcal100)} kcal{ing.unit === 'ud' ? '/ud' : `/100${ing.unit}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function RecipeForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Recipe
  onSave: (r: Recipe) => void
  onClose: () => void
}) {
  const { data } = useAppStore()
  const [form, setForm] = useState<FormState>(() => toForm(initial))
  const [error, setError] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const byId = useMemo(() => ingredientMap(data.ingredients), [data.ingredients])
  const set = (change: Partial<FormState>) => setForm((f) => ({ ...f, ...change }))

  function toRecipe(f: FormState, prev?: Recipe): Recipe {
    const steps = f.steps
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s !== '')
    const tags = f.tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t !== '')
    return {
      id: prev?.id ?? newId(),
      name: f.name.trim(),
      mealType: f.mealType,
      servings: Math.max(parseNum(f.servings) ?? 1, 0.5),
      items: f.items
        .map((it) => {
          const ing = byId.get(it.ingredientId)
          return {
            ingredientId: it.ingredientId,
            qty: parseNum(it.qty) ?? 0,
            unit: ing?.unit ?? ('g' as const),
          }
        })
        .filter((it) => it.qty > 0),
      steps: steps.length > 0 ? steps : undefined,
      tags: tags.length > 0 ? tags : undefined,
      photo: f.photo.trim() !== '' ? f.photo.trim() : undefined,
    }
  }

  const preview = toRecipe(form, initial)
  const totalMacros = recipeMacros(preview, byId)
  const perServing = scaleMacros(totalMacros, 1 / (preview.servings > 0 ? preview.servings : 1))
  const cost = recipeCost(preview, byId)

  const handlePhotoFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') set({ photo: reader.result })
    }
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    if (form.name.trim() === '') {
      setError('El nombre es obligatorio.')
      return
    }
    const recipe = toRecipe(form, initial)
    if (recipe.items.length === 0) {
      setError('Añade al menos un ingrediente con cantidad.')
      return
    }
    onSave(recipe)
    onClose()
  }

  return (
    <Modal title={initial === undefined ? 'Nueva receta' : 'Editar receta'} onClose={onClose} wide>
      <div className="grid gap-5 sm:grid-cols-2">
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
              <span className="text-sm font-medium text-stone-600">Tipo</span>
              <select
                value={form.mealType}
                onChange={(e) => set({ mealType: e.target.value as MealType })}
                className={inputCls}
              >
                {MEAL_TYPES.map((m) => (
                  <option key={m} value={m}>
                    {MEAL_TYPE_LABELS[m]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-stone-600">Raciones</span>
              <input
                type="text"
                inputMode="decimal"
                value={form.servings}
                onChange={(e) => set({ servings: e.target.value })}
                className={`${inputCls} text-right`}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-stone-600">Etiquetas (separadas por comas)</span>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => set({ tags: e.target.value })}
              placeholder="rápida, tupper, fitness"
              className={inputCls}
            />
          </label>

          <div>
            <span className="text-sm font-medium text-stone-600">Foto (opcional)</span>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={form.photo.startsWith('data:') ? '(imagen subida)' : form.photo}
                onChange={(e) => set({ photo: e.target.value })}
                placeholder="URL de la imagen…"
                readOnly={form.photo.startsWith('data:')}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="shrink-0 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50"
              >
                Subir…
              </button>
              {form.photo !== '' && (
                <button
                  type="button"
                  onClick={() => set({ photo: '' })}
                  className="shrink-0 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50"
                  title="Quitar foto"
                >
                  ✕
                </button>
              )}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file !== undefined) handlePhotoFile(file)
                  e.target.value = ''
                }}
              />
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-stone-600">Pasos (uno por línea, opcional)</span>
            <textarea
              value={form.steps}
              onChange={(e) => set({ steps: e.target.value })}
              rows={5}
              className={inputCls}
            />
          </label>
        </div>

        <div className="space-y-4">
          <div>
            <span className="text-sm font-medium text-stone-600">Ingredientes</span>
            <div className="mt-1 space-y-2">
              <IngredientPicker
                ingredients={data.ingredients}
                excludeIds={new Set(form.items.map((it) => it.ingredientId))}
                onPick={(ing) =>
                  set({
                    items: [
                      ...form.items,
                      { ingredientId: ing.id, qty: ing.unit === 'ud' ? '1' : '100' },
                    ],
                  })
                }
              />
              {form.items.length === 0 && (
                <p className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-stone-500">
                  Busca arriba para añadir ingredientes.
                </p>
              )}
              {form.items.map((it, idx) => {
                const ing = byId.get(it.ingredientId)
                if (ing === undefined) return null
                return (
                  <div key={it.ingredientId} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm text-stone-700">{ing.name}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={it.qty}
                      onChange={(e) =>
                        set({
                          items: form.items.map((x, i) =>
                            i === idx ? { ...x, qty: e.target.value } : x,
                          ),
                        })
                      }
                      className="w-20 rounded-lg border border-stone-200 px-2 py-1.5 text-right text-sm focus:border-orange-400 focus:outline-none"
                    />
                    <span className="w-6 text-sm text-stone-400">{ing.unit}</span>
                    <button
                      type="button"
                      onClick={() => set({ items: form.items.filter((_, i) => i !== idx) })}
                      className="rounded px-1.5 py-1 text-stone-400 hover:bg-red-50 hover:text-red-600"
                      title="Quitar"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl bg-orange-50 p-4 text-sm">
            <p className="font-semibold text-stone-700">
              Por ración ({fmtNum(preview.servings, preview.servings % 1 === 0 ? 0 : 1)} raciones):
            </p>
            <p className="mt-1 text-stone-600">
              {fmtNum(perServing.kcal)} kcal · P {fmtNum(perServing.protein, 1)} g · H{' '}
              {fmtNum(perServing.carbs, 1)} g · G {fmtNum(perServing.fat, 1)} g
            </p>
            <p className="mt-2 text-stone-600">
              Coste receta: <strong>{fmtEuro(cost.total)}</strong> ·{' '}
              {fmtEuro(cost.total / (preview.servings > 0 ? preview.servings : 1))}/ración
            </p>
            {cost.missingPrices.length > 0 && (
              <p className="mt-1 text-xs text-amber-700">
                ⚠️ Sin precio: {cost.missingPrices.join(', ')}. El coste real será mayor.
              </p>
            )}
          </div>

          {error !== null && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3">
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
      </div>
    </Modal>
  )
}

export function RecetasPage() {
  const { data, update } = useAppStore()
  const [search, setSearch] = useState('')
  const [mealType, setMealType] = useState<MealType | 'todos'>('todos')
  const [tag, setTag] = useState<string>('todas')
  const [editing, setEditing] = useState<Recipe | 'new' | null>(null)

  const byId = useMemo(() => ingredientMap(data.ingredients), [data.ingredients])

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    for (const r of data.recipes) for (const t of r.tags ?? []) tags.add(t)
    return [...tags].sort((a, b) => a.localeCompare(b, 'es'))
  }, [data.recipes])

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('es')
    return data.recipes
      .filter((r) => (mealType === 'todos' ? true : r.mealType === mealType))
      .filter((r) => (tag === 'todas' ? true : (r.tags ?? []).includes(tag)))
      .filter((r) => (q === '' ? true : r.name.toLocaleLowerCase('es').includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [data.recipes, search, mealType, tag])

  const handleSave = (recipe: Recipe) => {
    update((d) => {
      const exists = d.recipes.some((r) => r.id === recipe.id)
      return {
        ...d,
        recipes: exists
          ? d.recipes.map((r) => (r.id === recipe.id ? recipe : r))
          : [...d.recipes, recipe],
      }
    })
  }

  const handleDuplicate = (recipe: Recipe) => {
    const copy: Recipe = { ...recipe, id: newId(), name: `${recipe.name} (copia)` }
    update((d) => ({ ...d, recipes: [...d.recipes, copy] }))
    setEditing(copy)
  }

  const handleDelete = (recipe: Recipe) => {
    if (window.confirm(`¿Borrar la receta «${recipe.name}»?`)) {
      update((d) => ({ ...d, recipes: d.recipes.filter((r) => r.id !== recipe.id) }))
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold text-stone-800">Recetas</h2>
        <span className="text-sm text-stone-400">{data.recipes.length}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar…"
            className="w-44 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
          />
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value as MealType | 'todos')}
            className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
          >
            <option value="todos">Todos los tipos</option>
            {MEAL_TYPES.map((m) => (
              <option key={m} value={m}>
                {MEAL_TYPE_LABELS[m]}
              </option>
            ))}
          </select>
          {allTags.length > 0 && (
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
            >
              <option value="todas">Todas las etiquetas</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600"
          >
            + Nueva
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-orange-200 bg-white/60 px-6 py-14 text-center">
          <div className="text-4xl">🍳</div>
          <p className="mt-3 text-stone-600">
            {data.recipes.length === 0
              ? 'Aún no hay recetas. Crea la primera con «+ Nueva».'
              : 'Ninguna receta coincide con los filtros.'}
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => {
            const per = recipeMacrosPerServing(r, byId)
            const cost = recipeCost(r, byId)
            const servings = r.servings > 0 ? r.servings : 1
            return (
              <div
                key={r.id}
                className="flex flex-col rounded-2xl border border-orange-100 bg-white shadow-sm overflow-hidden"
              >
                {r.photo !== undefined && (
                  <img src={r.photo} alt="" className="h-32 w-full object-cover" />
                )}
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-stone-800">{r.name}</h3>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${MEAL_BADGE[r.mealType]}`}
                    >
                      {MEAL_TYPE_LABELS[r.mealType]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-stone-600">
                    <strong>{fmtNum(per.kcal)}</strong> kcal/ración · P {fmtNum(per.protein, 1)} · H{' '}
                    {fmtNum(per.carbs, 1)} · G {fmtNum(per.fat, 1)}
                  </p>
                  <p className="mt-1 text-sm text-stone-500">
                    {fmtEuro(cost.total / servings)}/ración
                    {cost.missingPrices.length > 0 && (
                      <span
                        title={`Sin precio: ${cost.missingPrices.join(', ')}`}
                        className="ml-1 cursor-help text-amber-600"
                      >
                        ⚠️{' '}
                        {cost.missingPrices.length === 1
                          ? 'falta 1 precio'
                          : `faltan ${cost.missingPrices.length} precios`}
                      </span>
                    )}
                  </p>
                  {(r.tags ?? []).length > 0 && (
                    <p className="mt-2 flex flex-wrap gap-1">
                      {(r.tags ?? []).map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500"
                        >
                          {t}
                        </span>
                      ))}
                    </p>
                  )}
                  <div className="mt-auto flex justify-end gap-1 pt-3">
                    <button
                      type="button"
                      onClick={() => setEditing(r)}
                      className="rounded px-2 py-1 text-sm text-stone-400 hover:bg-orange-100 hover:text-stone-600"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(r)}
                      className="rounded px-2 py-1 text-sm text-stone-400 hover:bg-orange-100 hover:text-stone-600"
                      title="Duplicar"
                    >
                      📋
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(r)}
                      className="rounded px-2 py-1 text-sm text-stone-400 hover:bg-red-50 hover:text-red-600"
                      title="Borrar"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing !== null && (
        <RecipeForm
          initial={editing === 'new' ? undefined : editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
