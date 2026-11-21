import { STATUS } from '../lib/format.js'

const TONES = {
  warn: 'bg-warn/15 text-warn',
  primary: 'bg-primary/10 text-primary',
  bad: 'bg-bad/10 text-bad',
  ok: 'bg-ok/10 text-ok',
  muted: 'bg-sunken text-muted',
}

export default function StatusBadge({ status }) {
  const s = STATUS[status] ?? { label: status, tone: 'muted' }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${TONES[s.tone]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {s.label}
    </span>
  )
}
