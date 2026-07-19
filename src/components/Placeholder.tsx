interface PlaceholderProps {
  icon: string
  title: string
  phase: string
}

/** Estado provisional de las secciones aún no construidas. */
export function Placeholder({ icon, title, phase }: PlaceholderProps) {
  return (
    <div className="rounded-2xl border border-dashed border-orange-200 bg-white/60 px-6 py-16 text-center">
      <div className="text-4xl">{icon}</div>
      <h2 className="mt-3 text-xl font-semibold text-stone-700">{title}</h2>
      <p className="mt-1 text-sm text-stone-500">Se construirá en la {phase}.</p>
    </div>
  )
}
