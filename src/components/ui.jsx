import { CircleAlert } from 'lucide-react'

export function PageHeader({ title, description, children }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">{title}</h1>
        {description && <p className="mt-1.5 max-w-prose text-[15px] leading-relaxed text-muted">{description}</p>}
      </div>
      {children}
    </header>
  )
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center">
      <p className="text-base font-semibold">{title}</p>
      {children && <p className="mx-auto mt-1.5 max-w-sm text-[15px] leading-relaxed text-muted">{children}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-bad/30 bg-bad/5 p-4">
      <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-bad" aria-hidden />
      <div className="flex-1">
        <p className="font-semibold">Data belum bisa dimuat</p>
        <p className="mt-0.5 text-sm text-muted">{error?.message || 'Terjadi kesalahan.'}</p>
      </div>
      {onRetry && <button onClick={onRetry} className="btn-quiet btn-sm">Coba lagi</button>}
    </div>
  )
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <div className="divide-y divide-line rounded-xl border border-line bg-surface" aria-busy="true" aria-label="Memuat data">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <div className="h-6 w-20 rounded bg-sunken motion-safe:animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded bg-sunken motion-safe:animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-sunken motion-safe:animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Tab sederhana (Barang / Ruangan, dst). */
export function Tabs({ value, onChange, items, label }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-lg bg-sunken p-1">
      {items.map((it) => {
        const active = it.value === value
        return (
          <button
            key={it.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.value)}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
              active ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {it.label}
          </button>
        )
      })}
    </div>
  )
}
