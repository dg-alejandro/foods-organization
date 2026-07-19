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
      <div className="bg-blob left-[-10%] top-[-15%] h-96 w-96 bg-orange-300" />
      <div
        className="bg-blob right-[-8%] top-[35%] h-80 w-80 bg-amber-200"
        style={{ animationDelay: '-11s' }}
      />

      <header className="sticky top-0 z-10 border-b border-orange-100 bg-white/70 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <h1 className="bg-gradient-to-r from-orange-700 via-orange-500 to-amber-500 bg-clip-text text-xl font-black text-transparent">
            🍽️ Comidas de la semana
          </h1>
          <nav className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                  tab === t.key
                    ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/30 scale-105'
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

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div key={tab} className="animate-rise">
          {tab === 'semana' && <SemanaPage />}
          {tab === 'recetas' && <RecetasPage />}
          {tab === 'ingredientes' && <IngredientesPage />}
          {tab === 'compra' && <CompraPage />}
          {tab === 'ajustes' && <AjustesPage />}
        </div>
      </main>
    </div>
  )
}

export default App
