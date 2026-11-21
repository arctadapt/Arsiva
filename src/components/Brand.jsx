/** Logo kecil berbentuk label aset dengan lubang gantung. */
export function BrandMark({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#3c3d37" opacity="0" />
      <path d="M22 10h26a4 4 0 0 1 4 4v36a4 4 0 0 1-4 4H22L8 32 22 10z" fill="#697565" />
      <circle cx="24" cy="32" r="5" fill="#1e201e" />
    </svg>
  )
}

export function Wordmark({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark />
      <span className="text-[22px] font-extrabold tracking-tight">Arsiva</span>
    </span>
  )
}

const BARS = [2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 2, 3, 1, 1, 2, 1, 3, 2]

/** Label aset besar yang tergantung. Dipakai sebagai ciri khas halaman masuk. */
export function HangingTag({ code = 'ARV-0001' }) {
  let x = 92
  const bars = BARS.map((w, i) => {
    const bar = { x, w: w * 1.7, key: i }
    x += w * 1.7 + 1.6
    return bar
  })
  const span = x - 1.6 - 92
  const offset = (76 - span) / 2

  return (
    <svg viewBox="0 0 260 380" className="h-auto w-full max-w-[300px] drop-shadow-[0_18px_28px_rgba(0,0,0,0.28)]" role="img" aria-label="Label aset Arsiva">
      <path d="M130 0v62" stroke="#ecdfcc" strokeOpacity="0.55" strokeWidth="2.5" fill="none" />
      <path d="M44 70 92 44h76l48 26v270a18 18 0 0 1-18 18H62a18 18 0 0 1-18-18z" fill="#3c3d37" />
      <circle cx="130" cy="68" r="10.5" fill="#ecdfcc" />
      <circle cx="130" cy="68" r="10.5" fill="none" stroke="#ecdfcc" strokeOpacity="0.2" />
      <text x="130" y="150" textAnchor="middle" fontSize="38" fontWeight="800" fill="#ecdfcc" fontFamily="'Schibsted Grotesk', sans-serif" letterSpacing="-1">
        Arsiva
      </text>
      <text x="130" y="176" textAnchor="middle" fontSize="12.5" fontWeight="500" fill="#ecdfcc" fillOpacity="0.8" fontFamily="'Schibsted Grotesk', sans-serif">
        Inventaris dan aset sekolah
      </text>
      <g transform={`translate(${offset} 0)`} fill="#ecdfcc">
        {bars.map((b) => (
          <rect key={b.key} x={b.x} y="214" width={b.w} height="62" />
        ))}
      </g>
      <text x="130" y="308" textAnchor="middle" fontSize="15" fontWeight="500" fill="#ecdfcc" fontFamily="'IBM Plex Mono', monospace" letterSpacing="1">
        {code}
      </text>
    </svg>
  )
}
