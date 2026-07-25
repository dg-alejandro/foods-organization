import type { ReactNode } from 'react'

/** Estado vacío homogéneo: tarjeta punteada con título y pista. */
export function EmptyState({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed border-orange-200 bg-white/60 px-6 py-16 text-center">
      <h2 className="text-xl font-semibold text-stone-700">{title}</h2>
      {hint !== undefined && <p className="mt-1 text-sm text-stone-500">{hint}</p>}
      {children !== undefined && <div className="mt-5 flex justify-center gap-3">{children}</div>}
    </div>
  )
}
