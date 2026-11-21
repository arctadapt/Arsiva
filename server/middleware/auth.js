import jwt from 'jsonwebtoken'
import { HttpError } from '../lib/http.js'

const ADMIN_ROLES = ['ADMIN', 'SUPER ADMIN']

function secret() {
  const s = process.env.JWT_SECRET
  if (!s) throw new HttpError(500, 'JWT_SECRET belum diatur di environment variable.')
  return s
}

export const isAdmin = (role) => ADMIN_ROLES.includes(role)

export const signToken = (user) =>
  jwt.sign({ id: user.id_user, role: String(user.role).toUpperCase() }, secret(), { expiresIn: '7d' })

export function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!token) throw new HttpError(401, 'Silakan masuk terlebih dahulu.')
    let payload
    try {
      payload = jwt.verify(token, secret())
    } catch (e) {
      if (e instanceof HttpError) throw e
      throw new HttpError(401, 'Sesi kamu sudah berakhir. Silakan masuk lagi.')
    }
    req.user = { id: payload.id, role: payload.role }
    next()
  } catch (err) {
    next(err)
  }
}

export const requireRole = (...roles) => (req, _res, next) =>
  roles.includes(req.user?.role) ? next() : next(new HttpError(403, 'Kamu tidak punya akses ke fitur ini.'))

/** Hanya ADMIN dan SUPER ADMIN. */
export const requireAdmin = [requireAuth, requireRole(...ADMIN_ROLES)]
