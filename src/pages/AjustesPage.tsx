import { useRef, useState } from 'react'
import { useAppStore } from '../data/store'
import { exportBackup, importBackup } from '../data/storage'
import { parseNum } from '../lib/format'
import type { MacroTargets, Person } from '../data/types'

const TARGET_FIELDS: { key: keyof MacroTargets; label: string; suffix: string }[] = [
  { key: 'kcal', label: 'Calorías', suffix: 'kcal' },
  { key: 'protein', label: 'Proteínas', suffix: 'g' },
  { key: 'carbs', label: 'Hidratos', suffix: 'g' },
  { key: 'fat', label: 'Grasas', suffix: 'g' },
]

const EMPTY_TARGETS: MacroTargets = { kcal: 0, protein: 0, carbs: 0, fat: 0 }

function PersonCard({ person }: { person: Person }) {
  const { update } = useAppStore()
  const targets = person.targets ?? EMPTY_TARGETS

  const updatePerson = (change: Partial<Person>) => {
    update((data) => ({
      ...data,
      persons: data.persons.map((p) => (p.id === person.id ? { ...p, ...change } : p)),
    }))
  }

  return (
    <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Nombre
        </span>
        <input
          type="text"
          value={person.name}
          onChange={(e) => updatePerson({ name: e.target.value })}
          className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-stone-800 focus:border-orange-400 focus:outline-none"
        />
      </label>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-stone-500">
        Objetivos diarios
      </p>
      <div className="mt-1 grid grid-cols-2 gap-3">
        {TARGET_FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="text-sm text-stone-600">{f.label}</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                defaultValue={targets[f.key] > 0 ? String(targets[f.key]).replace('.', ',') : ''}
                onBlur={(e) => {
                  const n = parseNum(e.target.value)
                  updatePerson({ targets: { ...targets, [f.key]: n !== null && n > 0 ? n : 0 } })
                }}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-right focus:border-orange-400 focus:outline-none"
              />
              <span className="w-8 text-sm text-stone-500">{f.suffix}</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}

function BackupCard() {
  const { data, replaceAll } = useAppStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const handleExport = () => {
    const blob = new Blob([exportBackup(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const today = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `comidas-copia-${today}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage({ kind: 'ok', text: 'Copia de seguridad descargada.' })
  }

  const handleImportFile = async (file: File) => {
    try {
      const imported = importBackup(await file.text())
      const ok = window.confirm(
        'Esto sustituirá TODOS los datos actuales por los de la copia. ¿Continuar?',
      )
      if (!ok) return
      replaceAll(imported)
      setMessage({ kind: 'ok', text: 'Copia importada correctamente.' })
    } catch (err) {
      const text = err instanceof Error ? err.message : 'No se pudo leer el archivo.'
      setMessage({ kind: 'error', text })
    }
  }

  return (
    <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-stone-700">Copia de seguridad</h3>
      <p className="mt-1 text-sm text-stone-500">
        Exporta todos los datos (ingredientes, recetas, semanas y ajustes) a un archivo JSON, o
        restaura una copia anterior.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleExport}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600"
        >
          Exportar JSON
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-orange-300 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50"
        >
          Importar JSON…
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file !== undefined) void handleImportFile(file)
            e.target.value = ''
          }}
        />
      </div>
      {message !== null && (
        <p
          className={`mt-3 text-sm ${message.kind === 'ok' ? 'text-green-700' : 'text-red-600'}`}
        >
          {message.text}
        </p>
      )}
    </div>
  )
}

export function AjustesPage() {
  const { data } = useAppStore()

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-bold text-stone-800">Personas y objetivos</h2>
        <p className="mt-1 text-sm text-stone-500">
          Los objetivos diarios se usan en el planificador para el semáforo de cada persona.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {data.persons.map((p) => (
            <PersonCard key={p.id} person={p} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-stone-800">Datos</h2>
        <div className="mt-4">
          <BackupCard />
        </div>
      </section>
    </div>
  )
}
