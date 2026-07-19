import { useMemo, useState } from 'react'
import { useAppStore } from '../data/store'
import { newId } from '../data/storage'
import { CATEGORY_LABELS } from '../data/types'
import type { ShoppingState, WeekPlan } from '../data/types'
import { ingredientMap } from '../lib/nutrition'
import { recipeMap } from '../lib/planner'
import { aggregateWeek, groupByCategory, shoppingTotals } from '../lib/shopping'
import type { ShoppingLine } from '../lib/shopping'
import { weekLabel } from '../lib/dates'
import { fmtEuro, fmtNum, parseNum } from '../lib/format'

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-orange-200 bg-white/60 px-6 py-16 text-center">
      <div className="text-4xl">🛒</div>
      <h2 className="mt-3 text-xl font-semibold text-stone-700">{title}</h2>
      <p className="mt-1 text-sm text-stone-500">{hint}</p>
    </div>
  )
}

const qtyInputCls =
  'w-16 rounded border border-transparent px-1 py-0.5 text-right text-sm text-stone-600 hover:border-stone-200 focus:border-orange-400 focus:outline-none'

export function CompraPage() {
  const { data, update } = useAppStore()
  const [extraName, setExtraName] = useState('')
  const [extraQty, setExtraQty] = useState('')
  const [extraPrice, setExtraPrice] = useState('')

  const weeks = useMemo(
    () => [...data.weeks].sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
    [data.weeks],
  )
  const week = data.weeks.find((w) => w.id === data.activeWeekId) ?? weeks[weeks.length - 1]

  const recipesById = useMemo(() => recipeMap(data.recipes), [data.recipes])
  const ingredientsById = useMemo(() => ingredientMap(data.ingredients), [data.ingredients])

  const lines = useMemo(
    () => (week === undefined ? [] : aggregateWeek(week, recipesById, ingredientsById)),
    [week, recipesById, ingredientsById],
  )

  if (week === undefined) {
    return (
      <EmptyState
        title="No hay ninguna semana activa"
        hint="Crea una semana en la pestaña Semana para generar la lista de la compra."
      />
    )
  }

  const updateShopping = (fn: (s: ShoppingState) => ShoppingState) => {
    update((d) => ({
      ...d,
      weeks: d.weeks.map((w: WeekPlan) =>
        w.id === week.id ? { ...w, shopping: fn(w.shopping) } : w,
      ),
    }))
  }

  const toggleChecked = (key: string) => {
    updateShopping((s) => {
      const set = new Set(s.checked)
      if (set.has(key)) set.delete(key)
      else set.add(key)
      return { ...s, checked: [...set] }
    })
  }

  const setNeeded = (line: ShoppingLine, raw: string) => {
    const n = parseNum(raw)
    updateShopping((s) => {
      const overrides = { ...(s.qtyOverrides ?? {}) }
      if (n === null || n < 0 || n === line.computedQty) delete overrides[line.ingredientId]
      else overrides[line.ingredientId] = n
      return { ...s, qtyOverrides: overrides }
    })
  }

  const setAtHome = (line: ShoppingLine, value: number) => {
    updateShopping((s) => {
      const atHomeQty = { ...(s.atHomeQty ?? {}) }
      if (value <= 0) delete atHomeQty[line.ingredientId]
      else atHomeQty[line.ingredientId] = value
      return {
        ...s,
        atHomeQty,
        haveAtHome: s.haveAtHome.filter((id) => id !== line.ingredientId),
      }
    })
  }

  const addExtra = () => {
    const name = extraName.trim()
    if (name === '') return
    const price = parseNum(extraPrice)
    updateShopping((s) => ({
      ...s,
      extras: [
        ...s.extras,
        {
          id: newId(),
          name,
          qty: extraQty.trim() !== '' ? extraQty.trim() : undefined,
          price: price !== null && price > 0 ? price : undefined,
          checked: false,
        },
      ],
    }))
    setExtraName('')
    setExtraQty('')
    setExtraPrice('')
  }

  const groups = groupByCategory(lines)
  const totals = shoppingTotals(lines, week)
  const checked = new Set(week.shopping.checked)

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-xl font-bold text-stone-800">Lista de la compra</h2>
        <span className="text-sm text-stone-500">{weekLabel(week.weekStart)}</span>
      </div>

      {lines.length === 0 && week.shopping.extras.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="La semana activa no tiene comidas planificadas"
            hint="Asigna recetas en la pestaña Semana y la lista se generará sola."
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {groups.map((g) => (
              <section
                key={g.category}
                className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm"
              >
                <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                  {CATEGORY_LABELS[g.category]}
                </h3>
                <table className="mt-1 w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wide text-stone-300">
                      <th className="py-1 text-left font-semibold" colSpan={2}></th>
                      <th className="py-1 text-right font-semibold">Necesario</th>
                      <th className="py-1 text-right font-semibold">En casa</th>
                      <th className="py-1 text-right font-semibold">A comprar</th>
                      <th className="py-1 text-right font-semibold">Precio</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-50">
                    {g.lines.map((line) => {
                      const isChecked = checked.has(line.ingredientId)
                      const covered = line.toBuyQty <= 0
                      const fullAtHome = line.atHomeQty >= line.neededQty && line.neededQty > 0
                      return (
                        <tr key={line.ingredientId} className={covered ? 'opacity-45' : ''}>
                          <td className="w-6 py-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleChecked(line.ingredientId)}
                              className="size-4 accent-orange-500"
                            />
                          </td>
                          <td
                            className={`max-w-0 truncate py-2 pr-2 ${
                              isChecked ? 'text-stone-400 line-through' : 'text-stone-700'
                            }`}
                          >
                            {line.name}
                          </td>
                          <td className="py-2 text-right whitespace-nowrap">
                            <input
                              key={`n-${line.ingredientId}-${line.neededQty}`}
                              type="text"
                              inputMode="decimal"
                              defaultValue={fmtNum(line.neededQty, line.neededQty % 1 === 0 ? 0 : 1)}
                              onBlur={(e) => setNeeded(line, e.target.value)}
                              className={qtyInputCls}
                              title={
                                line.neededQty !== line.computedQty
                                  ? `Calculado por las recetas: ${fmtNum(line.computedQty, 1)}`
                                  : undefined
                              }
                            />
                            <span className="ml-0.5 text-xs text-stone-400">{line.unit}</span>
                          </td>
                          <td className="py-2 text-right whitespace-nowrap">
                            <input
                              key={`h-${line.ingredientId}-${line.atHomeQty}`}
                              type="text"
                              inputMode="decimal"
                              defaultValue={
                                line.atHomeQty === 0
                                  ? ''
                                  : fmtNum(line.atHomeQty, line.atHomeQty % 1 === 0 ? 0 : 1)
                              }
                              placeholder="0"
                              onBlur={(e) => setAtHome(line, parseNum(e.target.value) ?? 0)}
                              className={qtyInputCls}
                            />
                            <span className="ml-0.5 text-xs text-stone-400">{line.unit}</span>
                          </td>
                          <td className="py-2 text-right font-semibold whitespace-nowrap text-stone-700">
                            {covered ? (
                              <span className="font-normal text-stone-400">nada 🎉</span>
                            ) : (
                              `${fmtNum(line.toBuyQty, line.toBuyQty % 1 === 0 ? 0 : 1)} ${line.unit}`
                            )}
                          </td>
                          <td className="w-16 py-2 text-right whitespace-nowrap text-stone-500">
                            {covered ? (
                              '—'
                            ) : line.costToBuy === null ? (
                              <span title="Sin precio en Ingredientes" className="cursor-help text-amber-500">
                                sin €
                              </span>
                            ) : (
                              fmtEuro(line.costToBuy)
                            )}
                          </td>
                          <td className="w-8 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => setAtHome(line, fullAtHome ? 0 : line.neededQty)}
                              title={
                                fullAtHome
                                  ? 'Quitar el descuento de despensa'
                                  : 'Lo tengo todo en casa'
                              }
                              className={`rounded-lg px-1.5 py-0.5 text-sm ${
                                fullAtHome ? 'bg-stone-200' : 'hover:bg-orange-100'
                              }`}
                            >
                              🏠
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </section>
            ))}

            <section className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                Extras
              </h3>
              {week.shopping.extras.length > 0 && (
                <ul className="mt-2 divide-y divide-orange-50">
                  {week.shopping.extras.map((extra) => (
                    <li key={extra.id} className="flex items-center gap-3 py-2">
                      <input
                        type="checkbox"
                        checked={extra.checked}
                        onChange={() =>
                          updateShopping((s) => ({
                            ...s,
                            extras: s.extras.map((x) =>
                              x.id === extra.id ? { ...x, checked: !x.checked } : x,
                            ),
                          }))
                        }
                        className="size-4 shrink-0 accent-orange-500"
                      />
                      <span
                        className={`min-w-0 flex-1 truncate text-sm ${
                          extra.checked ? 'text-stone-400 line-through' : 'text-stone-700'
                        }`}
                      >
                        {extra.name}
                        {extra.qty !== undefined && (
                          <span className="ml-1 text-xs text-stone-400">({extra.qty})</span>
                        )}
                      </span>
                      <span className="w-16 shrink-0 text-right text-sm text-stone-500">
                        {extra.price === undefined ? '—' : fmtEuro(extra.price)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateShopping((s) => ({
                            ...s,
                            extras: s.extras.filter((x) => x.id !== extra.id),
                          }))
                        }
                        title="Quitar"
                        className="shrink-0 rounded px-1.5 py-0.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  type="text"
                  value={extraName}
                  onChange={(e) => setExtraName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addExtra()
                  }}
                  placeholder="Producto extra…"
                  className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                />
                <input
                  type="text"
                  value={extraQty}
                  onChange={(e) => setExtraQty(e.target.value)}
                  placeholder="Cantidad"
                  className="w-24 rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  value={extraPrice}
                  onChange={(e) => setExtraPrice(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addExtra()
                  }}
                  placeholder="€"
                  className="w-20 rounded-lg border border-stone-200 px-3 py-2 text-right text-sm focus:border-orange-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addExtra}
                  className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600"
                >
                  Añadir
                </button>
              </div>
            </section>
          </div>

          <div>
            <div className="sticky top-20 rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-stone-700">Total a comprar</h3>
              <p className="mt-1 text-3xl font-bold text-orange-600">{fmtEuro(totals.totalToBuy)}</p>
              {totals.totalNeeded !== totals.totalToBuy && (
                <p className="mt-1 text-xs text-stone-500">
                  La semana necesita {fmtEuro(totals.totalNeeded)}; te ahorras{' '}
                  {fmtEuro(totals.totalNeeded - totals.totalToBuy)} con lo que ya hay en casa.
                </p>
              )}
              {totals.linesWithoutPrice > 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  ⚠️{' '}
                  {totals.linesWithoutPrice === 1
                    ? '1 línea sin precio no cuenta en el total.'
                    : `${totals.linesWithoutPrice} líneas sin precio no cuentan en el total.`}{' '}
                  Añade los precios en Ingredientes.
                </p>
              )}
              <p className="mt-3 text-xs text-stone-400">
                Todo lo que pide la semana cuenta; escribe en «En casa» lo que ya tengas y se
                descuenta de lo que hay que comprar. El checkbox es para marcar en el súper.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
