import { useState } from 'react'
import { SemanaPage } from './pages/SemanaPage'
import { RecetasPage } from './pages/RecetasPage'
import { IngredientesPage } from './pages/IngredientesPage'
import { CompraPage } from './pages/CompraPage'
import { AjustesPage } from './pages/AjustesPage'

const TABS = [
  { key: 'semana', label: 'Semana', icon: '📅' },
  { key: 'recetas', label: 'Recetas', icon: '🍳' },
  { key: 'ingredientes', label: 'Ingredientes', icon: '🥕' },
  { key: 'compra', label: 'Compra', icon: '🛒' },
  { key: 'ajustes', label: 'Ajustes', icon: '⚙️' },
] as const

type TabKey = (typeof TABS)[number]['key']

function App() {
  const [tab, setTab] = useState<TabKey>('semana')

  return (
    <div className="min-h-screen">
      <header className="border-b border-orange-100 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <h1 className="text-lg font-bold text-orange-900">
            🍽️ Comidas de la semana
          </h1>
          <nav className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === t.key
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-stone-600 hover:bg-orange-100'
                }`}
              >
                <span className="mr-1">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {tab === 'semana' && <SemanaPage />}
        {tab === 'recetas' && <RecetasPage />}
        {tab === 'ingredientes' && <IngredientesPage />}
        {tab === 'compra' && <CompraPage />}
        {tab === 'ajustes' && <AjustesPage />}
      </main>
    </div>
  )
}

export default App
