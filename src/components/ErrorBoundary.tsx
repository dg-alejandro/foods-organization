import { Component } from 'react'
import type { ReactNode } from 'react'
import { STORAGE_KEY } from '../data/storage'
import { downloadFile } from '../lib/download'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Red de seguridad: si algo revienta al renderizar (p. ej. datos inesperados),
 * en vez de pantalla blanca se ofrece recargar y rescatar los datos guardados.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  handleExport = () => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) {
      window.alert('No hay datos guardados que exportar.')
      return
    }
    const today = new Date().toISOString().slice(0, 10)
    downloadFile(`comidas-rescate-${today}.json`, raw, 'application/json')
  }

  render() {
    if (this.state.error === null) return this.props.children
    return (
      <div className="mx-auto mt-16 max-w-md rounded-2xl border border-orange-100 bg-white p-6 text-center shadow-sm">
        <div className="text-4xl">🥲</div>
        <h1 className="mt-3 text-xl font-bold text-stone-800">Algo ha salido mal</h1>
        <p className="mt-2 text-sm text-stone-500">
          La aplicación se ha encontrado con un error inesperado. Tus datos siguen guardados en
          este dispositivo; puedes descargar una copia por si acaso y recargar.
        </p>
        <p className="mt-2 text-xs text-stone-400">{this.state.error.message}</p>
        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            onClick={this.handleExport}
            className="rounded-lg border border-orange-300 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50"
          >
            Descargar mis datos
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600"
          >
            Recargar
          </button>
        </div>
      </div>
    )
  }
}
