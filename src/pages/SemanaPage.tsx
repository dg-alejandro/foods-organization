import { useMemo, useState } from 'react'
import { useAppStore } from '../data/store'
import { MEAL_TYPES, MEAL_TYPE_LABELS } from '../data/types'
import type { DayPlan, MealSlot, MealType, Person, WeekPlan } from '../data/types'
import { calorieSplit, ingredientMap, recipeMacrosPerServing } from '../lib/nutrition'
import { addDays, dayLabel, mondayOf, parseISODate, toISODate, weekLabel } from '../lib/dates'
import {
  MAIN_MEALS,
  dayIsPlanned,
  dayMacrosForPerson,
  duplicateWeek,
  emptyWeek,
  recipeMap,
  targetStatus,
  weekMacrosForPerson,
} from '../lib/planner'
import type { TargetStatus } from '../lib/planner'
import { fmtNum, parseNum } from '../lib/format'
import { buildWeekExportHtml } from '../lib/exportHtml'
import { Modal } from '../components/Modal'

const STATUS_TEXT: Record<TargetStatus, string> = {
  ok: 'text-green-600',
  warn: 'text-amber-600',
  bad: 'text-red-600',
  none: 'text-stone-700',
}

const STATUS_CHIP: Record<TargetStatus, string> = {
  ok: 'bg-green-100 text-green-700',
  warn: 'bg-amber-100 text-amber-800',
  bad: 'bg-red-100 text-red-700',
  none: 'bg-stone-100 text-stone-600',
}

const MEAL_ROW_LABELS: Record<MealType, string> = {
  desayuno: '🥐 Desayuno',
  almuerzo: '🍲 Almuerzo',
  cena: '🌙 Cena',
  snack: '🍎 Snacks',
}

/** Referencia a un hueco del planificador; snackIdx undefined = snack nuevo. */
interface SlotRef {
  dayIdx: number
  meal: MealType
  snackIdx?: number
}

function SlotEditor({
  slotRef,
  weekStart,
  slot,
  onSave,
  onRemove,
  onClose,
}: {
  slotRef: SlotRef
  weekStart: string
  slot?: MealSlot
  onSave: (slot: MealSlot) => void
  onRemove?: () => void
  onClose: () => void
}) {
  const { data } = useAppStore()
  const byId = useMemo(() => ingredientMap(data.ingredients), [data.ingredients])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<MealType | 'todos'>(slotRef.meal)
  const [recipeId, setRecipeId] = useState<string | null>(slot?.recipeId ?? null)
  const [error, setError] = useState<string | null>(null)
  const [servings, setServings] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {}
    for (const p of data.persons) {
      const value =
        slot === undefined
          ? 1
          : (slot.perPerson?.[p.id] ?? slot.servings / Math.max(data.persons.length, 1))
      out[p.id] = String(value).replace('.', ',')
    }
    return out
  })

  const matches = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('es')
    return data.recipes
      .filter((r) => (typeFilter === 'todos' ? true : r.mealType === typeFilter))
      .filter((r) => (q === '' ? true : r.name.toLocaleLowerCase('es').includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
      .slice(0, 30)
  }, [data.recipes, search, typeFilter])

  const handleSave = () => {
    if (recipeId === null) {
      setError('Elige una receta.')
      return
    }
    const perPerson: Record<string, number> = {}
    let total = 0
    for (const p of data.persons) {
      const n = parseNum(servings[p.id] ?? '') ?? 0
      const clamped = n > 0 ? n : 0
      perPerson[p.id] = clamped
      total += clamped
    }
    if (total <= 0) {
      setError('Las raciones tienen que sumar más de cero.')
      return
    }
    onSave({ recipeId, servings: total, perPerson })
    onClose()
  }

  return (
    <Modal
      title={`${MEAL_ROW_LABELS[slotRef.meal]} · ${dayLabel(weekStart, slotRef.dayIdx)}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar receta…"
            autoFocus
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as MealType | 'todos')}
            className="shrink-0 rounded-lg border border-stone-200 px-2 py-2 text-sm focus:border-orange-400 focus:outline-none"
          >
            <option value="todos">Todos</option>
            {MEAL_TYPES.map((m) => (
              <option key={m} value={m}>
                {MEAL_TYPE_LABELS[m]}
              </option>
            ))}
          </select>
        </div>

        <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-stone-100 p-1">
          {matches.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-stone-500">
              No hay recetas de este tipo. Créalas en la pestaña Recetas.
            </p>
          )}
          {matches.map((r) => {
            const per = recipeMacrosPerServing(r, byId)
            const selected = r.id === recipeId
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setRecipeId(r.id)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                  selected ? 'bg-orange-500 text-white' : 'hover:bg-orange-50'
                }`}
              >
                <span className="truncate">{r.name}</span>
                <span className={`shrink-0 text-xs ${selected ? 'text-orange-100' : 'text-stone-400'}`}>
                  {fmtNum(per.kcal)} kcal/rac.
                </span>
              </button>
            )
          })}
        </div>

        <div>
          <span className="text-sm font-medium text-stone-600">Raciones por persona</span>
          <div className="mt-1 grid grid-cols-2 gap-3">
            {data.persons.map((p) => (
              <label key={p.id} className="block">
                <span className="text-xs text-stone-500">{p.name}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={servings[p.id] ?? ''}
                  onChange={(e) => setServings((s) => ({ ...s, [p.id]: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-right focus:border-orange-400 focus:outline-none"
                />
              </label>
            ))}
          </div>
        </div>

        {error !== null && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-between gap-3 pt-1">
          {onRemove !== undefined ? (
            <button
              type="button"
              onClick={() => {
                onRemove()
                onClose()
              }}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Quitar del plan
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
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

export function SemanaPage() {
  const { data, update } = useAppStore()
  const weeks = useMemo(
    () => [...data.weeks].sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
    [data.weeks],
  )
  const [viewedId, setViewedId] = useState<string | null>(null)
  const [editor, setEditor] = useState<SlotRef | null>(null)

  const recipesById = useMemo(() => recipeMap(data.recipes), [data.recipes])
  const ingredientsById = useMemo(() => ingredientMap(data.ingredients), [data.ingredients])

  const week = weeks.find((w) => w.id === viewedId) ?? weeks[weeks.length - 1]
  const weekIdx = week !== undefined ? weeks.findIndex((w) => w.id === week.id) : -1
  const personCount = data.persons.length

  const nextWeekStart = (): string =>
    weeks.length === 0
      ? toISODate(mondayOf(new Date()))
      : toISODate(addDays(parseISODate(weeks[weeks.length - 1].weekStart), 7))

  const addWeek = (w: WeekPlan) => {
    update((d) => ({ ...d, weeks: [...d.weeks, w], activeWeekId: w.id }))
    setViewedId(w.id)
  }

  const updateDay = (dayIdx: number, fn: (day: DayPlan) => DayPlan) => {
    if (week === undefined) return
    update((d) => ({
      ...d,
      weeks: d.weeks.map((w) =>
        w.id === week.id
          ? { ...w, days: w.days.map((day, i) => (i === dayIdx ? fn(day) : day)) }
          : w,
      ),
    }))
  }

  const saveSlot = (ref: SlotRef, slot: MealSlot) => {
    updateDay(ref.dayIdx, (day) => {
      if (ref.meal === 'snack') {
        const snacks = [...(day.snacks ?? [])]
        if (ref.snackIdx !== undefined) snacks[ref.snackIdx] = slot
        else snacks.push(slot)
        return { ...day, snacks }
      }
      return { ...day, [ref.meal]: slot }
    })
  }

  const removeSlot = (ref: SlotRef) => {
    updateDay(ref.dayIdx, (day) => {
      if (ref.meal === 'snack') {
        const snacks = (day.snacks ?? []).filter((_, i) => i !== ref.snackIdx)
        return { ...day, snacks: snacks.length > 0 ? snacks : undefined }
      }
      const copy = { ...day }
      delete copy[ref.meal as 'desayuno' | 'almuerzo' | 'cena']
      return copy
    })
  }

  if (week === undefined) {
    return (
      <div className="rounded-2xl border border-dashed border-orange-200 bg-white/60 px-6 py-16 text-center">
        <div className="text-4xl">📅</div>
        <h2 className="mt-3 text-xl font-semibold text-stone-700">Aún no hay ninguna semana</h2>
        <p className="mt-1 text-sm text-stone-500">Crea la primera para empezar a planificar.</p>
        <button
          type="button"
          onClick={() => addWeek(emptyWeek(nextWeekStart()))}
          className="mt-5 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-orange-600"
        >
          Crear semana
        </button>
      </div>
    )
  }

  const currentSlot = (ref: SlotRef): MealSlot | undefined => {
    const day = week.days[ref.dayIdx]
    if (ref.meal === 'snack') {
      return ref.snackIdx !== undefined ? day.snacks?.[ref.snackIdx] : undefined
    }
    return day[ref.meal]
  }

  const slotButton = (slot: MealSlot | undefined, onClick: () => void, compact = false) => {
    if (slot === undefined) {
      return (
        <button
          type="button"
          onClick={onClick}
          className={`w-full rounded-lg border border-dashed border-stone-200 text-stone-300 hover:border-orange-300 hover:text-orange-400 ${compact ? 'py-1 text-xs' : 'min-h-12 text-lg'}`}
        >
          +
        </button>
      )
    }
    const recipe = recipesById.get(slot.recipeId)
    const perKcal =
      recipe === undefined ? null : recipeMacrosPerServing(recipe, ingredientsById).kcal
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-lg bg-orange-50 px-2 py-1.5 text-left hover:bg-orange-100"
      >
        <span className="line-clamp-2 text-xs font-medium text-stone-700">
          {recipe?.name ?? '(receta borrada)'}
        </span>
        <span className="text-[10px] text-stone-400">
          {fmtNum(slot.servings, slot.servings % 1 === 0 ? 0 : 1)} rac.
          {perKcal !== null && ` · ${fmtNum(perKcal)} kcal/rac.`}
        </span>
      </button>
    )
  }

  const summaryFor = (p: Person) =>
    weekMacrosForPerson(week, p.id, personCount, recipesById, ingredientsById)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={weekIdx <= 0}
            onClick={() => setViewedId(weeks[weekIdx - 1].id)}
            className="rounded-lg px-2.5 py-1.5 text-stone-500 hover:bg-orange-100 disabled:opacity-30"
            title="Semana anterior"
          >
            ◀
          </button>
          <h2 className="text-lg font-bold text-stone-800">{weekLabel(week.weekStart)}</h2>
          <button
            type="button"
            disabled={weekIdx >= weeks.length - 1}
            onClick={() => setViewedId(weeks[weekIdx + 1].id)}
            className="rounded-lg px-2.5 py-1.5 text-stone-500 hover:bg-orange-100 disabled:opacity-30"
            title="Semana siguiente"
          >
            ▶
          </button>
        </div>
        {week.id === (data.activeWeekId ?? weeks[weeks.length - 1].id) && (
          <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
            🛒 semana activa
          </span>
        )}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => {
              const html = buildWeekExportHtml(data, week)
              const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `semana-${week.weekStart}.html`
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="rounded-lg border border-orange-300 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50"
            title="Descarga un HTML para consultar el plan desde el móvil"
          >
            📱 Exportar
          </button>
          <button
            type="button"
            onClick={() => addWeek(duplicateWeek(week, nextWeekStart()))}
            className="rounded-lg border border-orange-300 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50"
            title="Copia los platos de esta semana como semana nueva"
          >
            Duplicar semana
          </button>
          <button
            type="button"
            onClick={() => addWeek(emptyWeek(nextWeekStart()))}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600"
          >
            + Nueva semana
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {data.persons.map((p) => {
          const { avg, total, daysPlanned } = summaryFor(p)
          const t = p.targets
          const split = calorieSplit(avg)
          const stats = [
            { label: 'kcal', value: avg.kcal, total: total.kcal, target: t?.kcal },
            { label: 'P (g)', value: avg.protein, total: total.protein, target: t?.protein },
            { label: 'H (g)', value: avg.carbs, total: total.carbs, target: t?.carbs },
            { label: 'G (g)', value: avg.fat, total: total.fat, target: t?.fat },
          ]
          return (
            <div key={p.id} className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold text-stone-800">{p.name}</h3>
                <span className="text-xs text-stone-400">
                  {daysPlanned === 0
                    ? 'sin días planificados'
                    : `media de ${daysPlanned} ${daysPlanned === 1 ? 'día' : 'días'}`}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                {stats.map((s) => {
                  const status = daysPlanned === 0 ? 'none' : targetStatus(s.value, s.target)
                  const target = s.target !== undefined && s.target > 0 ? s.target : null
                  const pct = target !== null ? Math.round((s.value / target) * 100) : null
                  return (
                    <div key={s.label} className="rounded-lg bg-stone-50 px-1 py-2">
                      <div className={`text-sm font-bold ${STATUS_TEXT[status]}`}>
                        {fmtNum(s.value)}
                      </div>
                      <div className="text-[10px] text-stone-400">
                        {s.label}
                        {target !== null && ` / ${fmtNum(target)}`}
                      </div>
                      <div className="mt-0.5 text-[9px] text-stone-400">
                        sem. {fmtNum(s.total)}
                        {pct !== null && daysPlanned > 0 && (
                          <span className={STATUS_TEXT[status]}> · {fmtNum(pct)} %</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              {split !== null && daysPlanned > 0 && (
                <div className="mt-3">
                  <div className="flex h-1.5 overflow-hidden rounded-full bg-stone-100">
                    <div className="bg-rose-300" style={{ width: `${split.protein}%` }} />
                    <div className="bg-amber-300" style={{ width: `${split.carbs}%` }} />
                    <div className="bg-sky-300" style={{ width: `${split.fat}%` }} />
                  </div>
                  <p className="mt-1 text-[10px] text-stone-400">
                    Reparto calórico:{' '}
                    <span className="text-rose-400">●</span> P {fmtNum(split.protein)} % ·{' '}
                    <span className="text-amber-400">●</span> H {fmtNum(split.carbs)} % ·{' '}
                    <span className="text-sky-400">●</span> G {fmtNum(split.fat)} %
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-orange-100 bg-white shadow-sm">
        <table className="w-full min-w-220 table-fixed text-sm">
          <thead>
            <tr className="border-b border-orange-100">
              <th className="w-24 px-3 py-2"></th>
              {week.days.map((_, i) => (
                <th key={i} className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  {dayLabel(week.weekStart, i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MAIN_MEALS.map((meal) => (
              <tr key={meal} className="border-b border-orange-50">
                <th className="px-3 py-2 text-left text-xs font-medium text-stone-500 whitespace-nowrap">
                  {MEAL_ROW_LABELS[meal]}
                </th>
                {week.days.map((day, i) => (
                  <td key={i} className="px-1.5 py-1.5 align-top">
                    {slotButton(day[meal], () => setEditor({ dayIdx: i, meal }))}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-b border-orange-50">
              <th className="px-3 py-2 text-left text-xs font-medium text-stone-500">
                {MEAL_ROW_LABELS.snack}
              </th>
              {week.days.map((day, i) => (
                <td key={i} className="space-y-1 px-1.5 py-1.5 align-top">
                  {(day.snacks ?? []).map((s, si) =>
                    <div key={si}>{slotButton(s, () => setEditor({ dayIdx: i, meal: 'snack', snackIdx: si }))}</div>,
                  )}
                  {slotButton(undefined, () => setEditor({ dayIdx: i, meal: 'snack' }), true)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-orange-50 bg-orange-50/40">
              <th className="px-3 py-2 text-left text-xs font-medium text-stone-500">Totales</th>
              {week.days.map((day, i) => (
                <td key={i} className="px-1.5 py-2 text-center align-top">
                  {!dayIsPlanned(day) ? (
                    <span className="text-stone-300">—</span>
                  ) : (
                    <div className="space-y-1.5">
                      {data.persons.map((p) => {
                        const macros = dayMacrosForPerson(
                          day,
                          p.id,
                          personCount,
                          recipesById,
                          ingredientsById,
                        )
                        const status = targetStatus(macros.kcal, p.targets?.kcal)
                        return (
                          <div key={p.id}>
                            <div
                              className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium ${STATUS_CHIP[status]}`}
                            >
                              {p.name.slice(0, 3)} {fmtNum(macros.kcal)}
                            </div>
                            <div className="mt-0.5 text-[9px] leading-tight text-stone-400">
                              P {fmtNum(macros.protein)} · H {fmtNum(macros.carbs)} · G{' '}
                              {fmtNum(macros.fat)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-stone-500">📝 Nota</th>
              {week.days.map((day, i) => (
                <td key={i} className="px-1.5 py-1.5 align-top">
                  <input
                    type="text"
                    value={day.note ?? ''}
                    onChange={(e) =>
                      updateDay(i, (d) => ({
                        ...d,
                        note: e.target.value === '' ? undefined : e.target.value,
                      }))
                    }
                    placeholder="—"
                    className="w-full rounded border-0 bg-transparent px-1 py-1 text-xs text-stone-600 placeholder:text-stone-300 focus:bg-white focus:ring-1 focus:ring-orange-300 focus:outline-none"
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {editor !== null && (
        <SlotEditor
          slotRef={editor}
          weekStart={week.weekStart}
          slot={currentSlot(editor)}
          onSave={(slot) => saveSlot(editor, slot)}
          onRemove={currentSlot(editor) !== undefined ? () => removeSlot(editor) : undefined}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  )
}
