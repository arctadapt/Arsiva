import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { query } from '../db.js'
import { HttpError, wrap, text } from '../lib/http.js'
import { requireAuth, signToken } from '../middleware/auth.js'

const router = Router()

const publicUser = (u) => ({
  id: u.id_user,
  nama: u.nama_lengkap,
  kelas: u.kelas,
  role: String(u.role).toUpperCase(),
})

const isHash = (s) => /^\$2[aby]\$/.test(s)

function passwordField(value, label = 'Password') {
  if (typeof value !== 'string' || value.length < 6) throw new HttpError(400, `${label} minimal 6 karakter.`)
  if (value.length > 72) throw new HttpError(400, `${label} maksimal 72 karakter.`)
  return value
}

/** Cek password. Akun lama masih menyimpan password polos; akan di-hash otomatis saat berhasil masuk. */
async function checkPassword(user, input) {
  if (typeof input !== 'string' || !input) return false
  if (isHash(user.password)) return bcrypt.compare(input, user.password)
  if (user.password !== input) return false
  await query('UPDATE users SET password = $1 WHERE id_user = $2', [await bcrypt.hash(input, 10), user.id_user])
  return true
}

router.post('/register', wrap(async (req, res) => {
  const nama = text(req.body.nama_lengkap, 'Nama lengkap', { min: 3, max: 100 })
  const kelas = text(req.body.kelas, 'Kelas', { max: 100 })
  const password = passwordField(req.body.password)

  const dup = await query('SELECT 1 FROM users WHERE LOWER(nama_lengkap) = LOWER($1)', [nama])
  if (dup.rowCount) {
    throw new HttpError(409, 'Nama itu sudah terdaftar. Coba masuk, atau tambahkan inisial kelas di belakang namamu.')
  }

  // Role selalu USER. Admin dibuat lewat `npm run create-admin` atau oleh SUPER ADMIN.
  const { rows: [user] } = await query(
    `INSERT INTO users (nama_lengkap, kelas, password, role) VALUES ($1, $2, $3, 'USER') RETURNING *`,
    [nama, kelas, await bcrypt.hash(password, 10)],
  )
  res.status(201).json({ token: signToken(user), user: publicUser(user) })
}))

router.post('/login', wrap(async (req, res) => {
  const nama = text(req.body.nama_lengkap, 'Nama lengkap')
  const { rows: [user] } = await query(
    'SELECT * FROM users WHERE LOWER(nama_lengkap) = LOWER($1) ORDER BY id_user LIMIT 1',
    [nama],
  )
  if (!user || !(await checkPassword(user, req.body.password))) {
    throw new HttpError(401, 'Nama lengkap atau password salah.')
  }
  res.json({ token: signToken(user), user: publicUser(user) })
}))

router.get('/me', requireAuth, wrap(async (req, res) => {
  const { rows: [user] } = await query('SELECT * FROM users WHERE id_user = $1', [req.user.id])
  if (!user) throw new HttpError(401, 'Akun tidak ditemukan. Silakan masuk lagi.')
  res.json({ user: publicUser(user) })
}))

router.put('/password', requireAuth, wrap(async (req, res) => {
  const baru = passwordField(req.body.password_baru, 'Password baru')
  const { rows: [user] } = await query('SELECT * FROM users WHERE id_user = $1', [req.user.id])
  if (!user) throw new HttpError(401, 'Akun tidak ditemukan.')
  if (!(await checkPassword(user, req.body.password_lama))) throw new HttpError(400, 'Password lama tidak cocok.')
  await query('UPDATE users SET password = $1 WHERE id_user = $2', [await bcrypt.hash(baru, 10), user.id_user])
  res.json({ message: 'Password diperbarui.' })
}))

export default router
