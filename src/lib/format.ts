/** Formato numérico español: coma decimal, punto de miles. */
export function fmtNum(value: number, decimals = 0): string {
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** Euros con dos decimales: `12,50 €`. */
export function fmtEuro(value: number): string {
  return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

/**
 * Valor para rellenar un input editable: coma decimal y SIN separador de
 * miles (fmtNum pondría «15.000», que parseNum leería como 15).
 */
export function fmtInput(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return String(rounded).replace('.', ',')
}

/**
 * Interpreta un número escrito al estilo es-ES: coma o punto decimal y,
 * opcionalmente, miles con punto («1.234,56»). Rechaza cualquier otra cosa
 * (hex, exponentes, texto) devolviendo null.
 */
export function parseNum(raw: string): number | null {
  let cleaned = raw.trim()
  if (cleaned === '') return null
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned)) {
    cleaned = cleaned.replaceAll('.', '').replace(',', '.')
  } else if (/^-?\d+([.,]\d+)?$/.test(cleaned)) {
    cleaned = cleaned.replace(',', '.')
  } else {
    return null
  }
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/** Normaliza texto para búsquedas es-ES (recorte + minúsculas locales). */
export function normalizeSearch(text: string): string {
  return text.trim().toLocaleLowerCase('es')
}
