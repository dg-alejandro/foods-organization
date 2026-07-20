export const DAY_NAMES = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const

export const DAY_NAMES_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const

/** Interpreta `yyyy-mm-dd` como fecha local (sin sorpresas de zona horaria). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toISODate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/** Lunes de la semana a la que pertenece la fecha. */
export function mondayOf(date: Date): Date {
  const shift = (date.getDay() + 6) % 7
  return addDays(date, -shift)
}

/** Ej.: «Semana del 20 al 26 de julio de 2026». */
export function weekLabel(weekStart: string): string {
  const start = parseISODate(weekStart)
  const end = addDays(start, 6)
  const month = (d: Date) => d.toLocaleDateString('es-ES', { month: 'long' })
  const year = end.getFullYear()
  if (start.getFullYear() !== year) {
    return `Semana del ${start.getDate()} de ${month(start)} de ${start.getFullYear()} al ${end.getDate()} de ${month(end)} de ${year}`
  }
  if (start.getMonth() === end.getMonth()) {
    return `Semana del ${start.getDate()} al ${end.getDate()} de ${month(end)} de ${year}`
  }
  return `Semana del ${start.getDate()} de ${month(start)} al ${end.getDate()} de ${month(end)} de ${year}`
}

/** Ej.: «Lun 20». */
export function dayLabel(weekStart: string, dayIdx: number): string {
  const d = addDays(parseISODate(weekStart), dayIdx)
  return `${DAY_NAMES_SHORT[dayIdx]} ${d.getDate()}`
}
