import { Router } from 'express'
import { query, tx } from '../db.js'
import { HttpError, wrap, text, int } from '../lib/http.js'
import { requireAuth, requireAdmin, isAdmin } from '../middleware/auth.js'
import { notify, notifyAdmins, formatTanggal } from '../lib/notify.js'

const router = Router()

const STATUS_SQL = `CASE
  WHEN NOT COALESCE(p.status_pinjam, false) THEN 'ditolak'
  WHEN p.tanggal_kembali IS NOT NULL THEN 'dikembalikan'
  WHEN p.jatuh_tempo IS NOT NULL AND p.jatuh_tempo < NOW() THEN 'terlambat'
  ELSE 'dipinjam' END`

// Riwayat peminjaman. Admin melihat semua, pengguna hanya miliknya sendiri.
router.get('/', requireAuth, wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT p.id_pinjam AS id, ${STATUS_SQL} AS status,
            u.nama_lengkap AS peminjam, u.kelas,
            CASE WHEN p.id_ruangan IS NOT NULL THEN 'ruangan' ELSE 'barang' END AS jenis,
            COALESCE(p.id_ruangan, p.id_barang) AS item_id,
            COALESCE(b.nama_barang, r.nama_ruangan) AS nama,
            COALESCE(p.jumlah_barang, 1) AS jumlah,
            p.tanggal_pinjam, p.jatuh_tempo, p.tanggal_kembali, p.alasan
       FROM pinjam p
       LEFT JOIN users u ON u.id_user = p.id_user
       LEFT JOIN barang b ON b.id_barang = p.id_barang
       LEFT JOIN ruangan r ON r.id_ruangan = p.id_ruangan
      WHERE ($1::boolean OR p.id_user = $2)
      ORDER BY p.tanggal_pinjam DESC NULLS LAST, p.id_pinjam DESC
      LIMIT 300`,
    [isAdmin(req.user.role), req.user.id],
  )
  res.json({ loans: rows })
}))

// Permintaan yang menunggu keputusan. Admin melihat semua (terlama dulu), pengguna hanya miliknya.
router.get('/requests', requireAuth, wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT q.id_request AS id, 'menunggu' AS status,
            u.nama_lengkap AS peminjam, u.kelas,
            CASE WHEN q.id_ruangan IS NOT NULL THEN 'ruangan' ELSE 'barang' END AS jenis,
            COALESCE(q.id_ruangan, q.id_barang) AS item_id,
            COALESCE(b.nama_barang, r.nama_ruangan) AS nama,
            COALESCE(q.jumlah_barang, 1) AS jumlah,
            q.tanggal_pinjam AS diajukan,
            b.jumlah_barang AS stok_sekarang,
            COALESCE(r.status_ruangan, true) AS ruangan_tersedia
       FROM request q
       LEFT JOIN users u ON u.id_user = q.id_user
       LEFT JOIN barang b ON b.id_barang = q.id_barang
       LEFT JOIN ruangan r ON r.id_ruangan = q.id_ruangan
      WHERE q.status = false AND ($1::boolean OR q.id_user = $2)
      ORDER BY q.tanggal_pinjam ASC, q.id_request ASC`,
    [isAdmin(req.user.role), req.user.id],
  )
  res.json({ requests: rows })
}))

// Ajukan peminjaman barang atau ruangan.
router.post('/requests', requireAuth, wrap(async (req, res) => {
  const jenis = req.body.jenis
  if (jenis !== 'barang' && jenis !== 'ruangan') throw new HttpError(400, 'Jenis peminjaman harus barang atau ruangan.')
  const id = int(req.body.id, 'Item')

  await tx(async (c) => {
    const { rows: [me] } = await c.query('SELECT nama_lengkap, kelas FROM users WHERE id_user = $1', [req.user.id])
    if (!me) throw new HttpError(401, 'Akun tidak ditemukan. Silakan masuk lagi.')
    let nama

    if (jenis === 'barang') {
      const jumlah = int(req.body.jumlah ?? 1, 'Jumlah', { max: 1000 })
      const { rows: [b] } = await c.query('SELECT nama_barang, jumlah_barang FROM barang WHERE id_barang = $1', [id])
      if (!b) throw new HttpError(404, 'Barang tidak ditemukan.')
      if (b.jumlah_barang < 1) throw new HttpError(409, `${b.nama_barang} sedang habis.`)
      if (jumlah > b.jumlah_barang) throw new HttpError(409, `Stok ${b.nama_barang} tinggal ${b.jumlah_barang}. Kurangi jumlahnya.`)
      await c.query(
        'INSERT INTO request (id_user, id_barang, jumlah_barang, kelas) VALUES ($1, $2, $3, $4)',
        [req.user.id, id, jumlah, me.kelas],
      )
      nama = `${b.nama_barang} (${jumlah})`
    } else {
      const { rows: [r] } = await c.query('SELECT nama_ruangan, status_ruangan FROM ruangan WHERE id_ruangan = $1', [id])
      if (!r) throw new HttpError(404, 'Ruangan tidak ditemukan.')
      if (!r.status_ruangan) throw new HttpError(409, `${r.nama_ruangan} sedang dipakai.`)
      const dup = await c.query(
        'SELECT 1 FROM request WHERE id_ruangan = $1 AND id_user = $2 AND status = false', [id, req.user.id])
      if (dup.rowCount) throw new HttpError(409, `Kamu sudah mengajukan ${r.nama_ruangan} dan masih menunggu keputusan.`)
      await c.query('INSERT INTO request (id_user, id_ruangan, kelas) VALUES ($1, $2, $3)', [req.user.id, id, me.kelas])
      nama = r.nama_ruangan
    }
    await notifyAdmins(c, `Permintaan baru dari ${me.nama_lengkap} (${me.kelas}): ${nama}.`)
  })
  res.status(201).json({ message: 'Permintaan terkirim.' })
}))

// Batalkan permintaan milik sendiri yang belum diputuskan.
router.delete('/requests/:id', requireAuth, wrap(async (req, res) => {
  const id = int(req.params.id, 'ID permintaan')
  const r = await query(
    'DELETE FROM request WHERE id_request = $1 AND id_user = $2 AND status = false RETURNING id_request',
    [id, req.user.id],
  )
  if (!r.rowCount) throw new HttpError(404, 'Permintaan tidak ditemukan atau sudah diproses.')
  res.json({ message: 'Permintaan dibatalkan.' })
}))

// Setujui permintaan: kurangi stok / tandai ruangan dipakai, catat peminjaman.
router.post('/requests/:id/approve', requireAdmin, wrap(async (req, res) => {
  const id = int(req.params.id, 'ID permintaan')
  const durasi = int(req.body.durasi_hari ?? 7, 'Lama peminjaman', { min: 1, max: 60 })

  await tx(async (c) => {
    const { rows: [q] } = await c.query('SELECT * FROM request WHERE id_request = $1 AND status = false FOR UPDATE', [id])
    if (!q) throw new HttpError(404, 'Permintaan tidak ditemukan atau sudah diproses.')

    let nama
    let jumlah = 1
    if (q.id_barang) {
      const { rows: [b] } = await c.query('SELECT nama_barang, jumlah_barang FROM barang WHERE id_barang = $1 FOR UPDATE', [q.id_barang])
      if (!b) throw new HttpError(404, 'Barang ini sudah dihapus dari inventaris.')
      jumlah = q.jumlah_barang || 1
      if (b.jumlah_barang < jumlah) {
        throw new HttpError(409, `Stok ${b.nama_barang} tinggal ${b.jumlah_barang}, kurang dari yang diminta (${jumlah}).`)
      }
      await c.query('UPDATE barang SET jumlah_barang = jumlah_barang - $1 WHERE id_barang = $2', [jumlah, q.id_barang])
      nama = b.nama_barang
    } else if (q.id_ruangan) {
      const { rows: [r] } = await c.query('SELECT nama_ruangan, status_ruangan FROM ruangan WHERE id_ruangan = $1 FOR UPDATE', [q.id_ruangan])
      if (!r) throw new HttpError(404, 'Ruangan ini sudah dihapus.')
      if (!r.status_ruangan) throw new HttpError(409, `${r.nama_ruangan} sedang dipakai peminjam lain.`)
      await c.query('UPDATE ruangan SET status_ruangan = false, updatedat = NOW() WHERE id_ruangan = $1', [q.id_ruangan])
      nama = r.nama_ruangan
    } else {
      throw new HttpError(400, 'Permintaan ini tidak punya barang atau ruangan.')
    }

    const jatuhTempo = new Date(Date.now() + durasi * 86_400_000)
    const notifId = await notify(
      c, q.id_user,
      `Permintaan pinjam ${nama} disetujui. Kembalikan paling lambat ${formatTanggal(jatuhTempo)}.`,
    )
    await c.query(
      `INSERT INTO pinjam (id_user, id_barang, id_ruangan, tanggal_pinjam, status_pinjam, jenis_peminjaman,
                           id_notif, jumlah_barang, jatuh_tempo)
       VALUES ($1, $2, $3, NOW(), true, $4, $5, $6, $7)`,
      [q.id_user, q.id_barang, q.id_ruangan, q.id_barang ? 'barang' : 'ruangan', notifId, jumlah, jatuhTempo],
    )
    await c.query('DELETE FROM request WHERE id_request = $1', [id])
  })
  res.json({ message: 'Permintaan disetujui.' })
}))

// Tolak permintaan dengan alasan; peminjam mendapat notifikasi.
router.post('/requests/:id/reject', requireAdmin, wrap(async (req, res) => {
  const id = int(req.params.id, 'ID permintaan')
  const alasan = text(req.body.alasan, 'Alasan penolakan', { min: 3, max: 300 })

  await tx(async (c) => {
    const { rows: [q] } = await c.query(
      `SELECT q.*, COALESCE(b.nama_barang, r.nama_ruangan) AS nama
         FROM request q
         LEFT JOIN barang b ON b.id_barang = q.id_barang
         LEFT JOIN ruangan r ON r.id_ruangan = q.id_ruangan
        WHERE q.id_request = $1 AND q.status = false FOR UPDATE OF q`, [id])
    if (!q) throw new HttpError(404, 'Permintaan tidak ditemukan atau sudah diproses.')

    const notifId = await notify(c, q.id_user, `Permintaan pinjam ${q.nama ?? 'kamu'} ditolak. Alasan: ${alasan}`)
    await c.query(
      `INSERT INTO pinjam (id_user, id_barang, id_ruangan, tanggal_pinjam, status_pinjam, jenis_peminjaman,
                           id_notif, jumlah_barang, alasan)
       VALUES ($1, $2, $3, $4, false, $5, $6, $7, $8)`,
      [q.id_user, q.id_barang, q.id_ruangan, q.tanggal_pinjam, q.id_barang ? 'barang' : 'ruangan',
        notifId, q.jumlah_barang || 1, alasan],
    )
    await c.query('DELETE FROM request WHERE id_request = $1', [id])
  })
  res.json({ message: 'Permintaan ditolak.' })
}))

// Catat pengembalian. Boleh dilakukan peminjamnya sendiri atau admin.
router.post('/:id/return', requireAuth, wrap(async (req, res) => {
  const id = int(req.params.id, 'ID peminjaman')
  await tx(async (c) => {
    const { rows: [p] } = await c.query('SELECT * FROM pinjam WHERE id_pinjam = $1 FOR UPDATE', [id])
    if (!p) throw new HttpError(404, 'Data peminjaman tidak ditemukan.')
    if (!isAdmin(req.user.role) && p.id_user !== req.user.id) throw new HttpError(403, 'Ini bukan peminjamanmu.')
    if (!p.status_pinjam || p.tanggal_kembali) throw new HttpError(409, 'Peminjaman ini sudah selesai.')

    await c.query('UPDATE pinjam SET tanggal_kembali = NOW() WHERE id_pinjam = $1', [id])
    let nama = 'item'
    if (p.id_barang) {
      const { rows: [b] } = await c.query(
        'UPDATE barang SET jumlah_barang = jumlah_barang + $1 WHERE id_barang = $2 RETURNING nama_barang',
        [p.jumlah_barang || 1, p.id_barang])
      nama = b?.nama_barang ?? nama
    }
    if (p.id_ruangan) {
      const { rows: [r] } = await c.query(
        'UPDATE ruangan SET status_ruangan = true, updatedat = NOW() WHERE id_ruangan = $1 RETURNING nama_ruangan',
        [p.id_ruangan])
      nama = r?.nama_ruangan ?? nama
    }
    if (p.id_user !== req.user.id) await notify(c, p.id_user, `Pengembalian ${nama} sudah dicatat. Terima kasih!`)
  })
  res.json({ message: 'Pengembalian dicatat.' })
}))

export default router
