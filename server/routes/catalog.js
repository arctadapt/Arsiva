import { Router } from 'express'
import { query, tx } from '../db.js'
import { HttpError, wrap, text, int } from '../lib/http.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const router = Router()

const ITEM_COLS = `id_barang AS id, nama_barang AS nama, tipe_barang AS tipe, jumlah_barang AS stok`
const ROOM_COLS = `id_ruangan AS id, nama_ruangan AS nama, tipe_ruangan AS tipe, COALESCE(status_ruangan, true) AS tersedia`

router.get('/items', requireAuth, wrap(async (_req, res) => {
  const { rows } = await query(`SELECT ${ITEM_COLS} FROM barang ORDER BY nama_barang`)
  res.json({ items: rows })
}))

router.get('/rooms', requireAuth, wrap(async (_req, res) => {
  const { rows } = await query(`SELECT ${ROOM_COLS} FROM ruangan ORDER BY nama_ruangan`)
  res.json({ rooms: rows })
}))

router.post('/items', requireAdmin, wrap(async (req, res) => {
  const nama = text(req.body.nama, 'Nama barang', { max: 255 })
  const tipe = text(req.body.tipe || 'Umum', 'Kategori', { max: 255 })
  const stok = int(req.body.stok, 'Stok', { min: 0, max: 100_000 })
  const dup = await query('SELECT 1 FROM barang WHERE LOWER(nama_barang) = LOWER($1)', [nama])
  if (dup.rowCount) throw new HttpError(409, 'Barang dengan nama itu sudah ada. Ubah stoknya saja.')
  const { rows: [item] } = await query(
    `INSERT INTO barang (nama_barang, jumlah_barang, tipe_barang) VALUES ($1, $2, $3) RETURNING ${ITEM_COLS}`,
    [nama, stok, tipe],
  )
  res.status(201).json({ item })
}))

router.patch('/items/:id', requireAdmin, wrap(async (req, res) => {
  const id = int(req.params.id, 'ID barang')
  const stok = req.body.stok === undefined ? null : int(req.body.stok, 'Stok', { min: 0 })
  const nama = req.body.nama === undefined ? null : text(req.body.nama, 'Nama barang')
  const tipe = req.body.tipe === undefined ? null : text(req.body.tipe, 'Kategori')
  const { rows: [item] } = await query(
    `UPDATE barang SET jumlah_barang = COALESCE($2, jumlah_barang), nama_barang = COALESCE($3, nama_barang),
       tipe_barang = COALESCE($4, tipe_barang) WHERE id_barang = $1 RETURNING ${ITEM_COLS}`,
    [id, stok, nama, tipe],
  )
  if (!item) throw new HttpError(404, 'Barang tidak ditemukan.')
  res.json({ item })
}))

router.post('/rooms', requireAdmin, wrap(async (req, res) => {
  const nama = text(req.body.nama, 'Nama ruangan', { max: 100 })
  const tipe = text(req.body.tipe || 'Kelas', 'Jenis ruangan', { max: 100 })
  const dup = await query('SELECT 1 FROM ruangan WHERE LOWER(nama_ruangan) = LOWER($1)', [nama])
  if (dup.rowCount) throw new HttpError(409, 'Ruangan dengan nama itu sudah ada.')
  const { rows: [room] } = await query(
    `INSERT INTO ruangan (nama_ruangan, tipe_ruangan) VALUES ($1, $2) RETURNING ${ROOM_COLS}`,
    [nama, tipe],
  )
  res.status(201).json({ room })
}))

router.patch('/rooms/:id', requireAdmin, wrap(async (req, res) => {
  const id = int(req.params.id, 'ID ruangan')
  const nama = req.body.nama === undefined ? null : text(req.body.nama, 'Nama ruangan', { max: 100 })
  const tipe = req.body.tipe === undefined ? null : text(req.body.tipe, 'Jenis ruangan', { max: 100 })
  const tersedia = typeof req.body.tersedia === 'boolean' ? req.body.tersedia : null

  const room = await tx(async (c) => {
    if (tersedia === true) {
      const active = await c.query(
        `SELECT 1 FROM pinjam WHERE id_ruangan = $1 AND status_pinjam AND tanggal_kembali IS NULL LIMIT 1`, [id])
      if (active.rowCount) throw new HttpError(409, 'Ruangan ini masih dalam peminjaman aktif. Catat pengembaliannya dulu.')
    }
    const { rows: [r] } = await c.query(
      `UPDATE ruangan SET status_ruangan = COALESCE($2, status_ruangan), nama_ruangan = COALESCE($3, nama_ruangan),
         tipe_ruangan = COALESCE($4, tipe_ruangan), updatedat = NOW() WHERE id_ruangan = $1 RETURNING ${ROOM_COLS}`,
      [id, tersedia, nama, tipe],
    )
    return r
  })
  if (!room) throw new HttpError(404, 'Ruangan tidak ditemukan.')
  res.json({ room })
}))

export default router
