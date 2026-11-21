export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

/** Bungkus handler async supaya error masuk ke error handler Express. */
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

export function text(value, label, { min = 1, max = 255 } = {}) {
  const s = typeof value === 'string' ? value.trim() : ''
  if (s.length < min) throw new HttpError(400, min <= 1 ? `${label} wajib diisi.` : `${label} minimal ${min} karakter.`)
  if (s.length > max) throw new HttpError(400, `${label} maksimal ${max} karakter.`)
  return s
}

export function int(value, label, { min = 1, max = 100_000 } = {}) {
  const n = Number(value)
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new HttpError(400, `${label} harus berupa angka bulat antara ${min} dan ${max}.`)
  }
  return n
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) return res.status(err.status).json({ message: err.message })
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ message: 'Format data yang dikirim tidak valid.' })
  if (err?.code === '23505') return res.status(409).json({ message: 'Data tersebut sudah ada.' })
  console.error(err)
  res.status(500).json({ message: 'Terjadi kesalahan di server. Coba lagi sebentar lagi.' })
}
