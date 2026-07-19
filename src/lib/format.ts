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

/** Interpreta un número escrito con coma o punto decimal. Devuelve null si no es válido. */
export function parseNum(raw: string): number | null {
  const cleaned = raw.trim().replace(',', '.')
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}
