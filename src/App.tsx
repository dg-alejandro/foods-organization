import { useState } from 'react'
import { SemanaPage } from './pages/SemanaPage'
import { RecetasPage } from './pages/RecetasPage'
import { IngredientesPage } from './pages/IngredientesPage'
import { CompraPage } from './pages/CompraPage'
import { AjustesPage } from './pages/AjustesPage'

const TABS = [
  { key: 'semana', label: 'Semana' },
  { key: 'recetas', label: 'Recetas' },
  { key: 'ingredientes', label: 'Ingredientes' },
  { key: 'compra', label: 'Compra' },
  { key: 'ajustes', label: 'Ajustes' },
] as const

type TabKey = (typeof TABS)[number]['key']

function App() {
  const [tab, setTab] = useState<TabKey>('semana')

  return (
    <div className="min-h-screen">
      <div className="bg-blob left-[-10%] top-[-15%] h-96 w-96 bg-orange-300" />
      <div
        className="bg-blob right-[-8%] top-[35%] h-80 w-80 bg-orange-200"
        style={{ animationDelay: '-11s' }}
      />

      <header className="sticky top-0 z-10 border-b border-orange-100 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1.5 px-4 py-3">
          <h1 className="bg-gradient-to-r from-orange-800 via-orange-600 to-orange-400 bg-clip-text text-xl font-black text-transparent">
            Comidas de la semana
          </h1>
          {/* min-w-0 + overflow-x-auto: en pantallas estrechas la barra se
              desplaza dentro de sí misma en vez de desbordar la página */}
          <nav className="-mx-1 flex min-w-0 max-w-full gap-0.5 overflow-x-auto px-1 sm:gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`shrink-0 rounded-full px-2 py-1.5 text-xs font-medium whitespace-nowrap transition-all duration-200 sm:px-3 sm:text-sm ${
                  tab === t.key
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/25'
                    : 'text-stone-600 hover:bg-orange-100'
                }`}
              >
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
