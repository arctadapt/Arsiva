import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { query } from '../db.js'
import { HttpError, wrap, text } from '../lib/http.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// Hanya SUPER ADMIN yang boleh menambah admin baru.
router.post('/admin', requireAuth, requireRole('SUPER ADMIN'), wrap(async (req, res) => {
  const nama = text(req.body.nama_lengkap, 'Nama lengkap', { min: 3, max: 100 })
  const kelas = text(req.body.kelas || 'Staf', 'Kelas', { max: 100 })
  const password = req.body.password
  if (typeof password !== 'string' || password.length < 6 || password.length > 72) {
    throw new HttpError(400, 'Password harus 6 sampai 72 karakter.')
  }
  const dup = await query('SELECT 1 FROM users WHERE LOWER(nama_lengkap) = LOWER($1)', [nama])
  if (dup.rowCount) throw new HttpError(409, 'Nama itu sudah terdaftar.')

  const { rows: [u] } = await query(
    `INSERT INTO users (nama_lengkap, kelas, password, role) VALUES ($1, $2, $3, 'ADMIN') RETURNING id_user, nama_lengkap, kelas, role`,
    [nama, kelas, await bcrypt.hash(password, 10)],
  )
  res.status(201).json({ user: { id: u.id_user, nama: u.nama_lengkap, kelas: u.kelas, role: u.role } })
}))

export default router
