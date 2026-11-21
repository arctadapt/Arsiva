import { Router } from 'express'
import { query } from '../db.js'
import { wrap, int } from '../lib/http.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Notifikasi milik pengguna yang sedang masuk.
router.get('/', requireAuth, wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT id_notif AS id, message AS pesan, created_at AS dibuat, COALESCE(is_read, false) AS dibaca
       FROM notifikasi WHERE id_user = $1 ORDER BY created_at DESC, id_notif DESC LIMIT 100`,
    [req.user.id],
  )
  res.json({ notifications: rows, belum_dibaca: rows.filter((n) => !n.dibaca).length })
}))

router.post('/read-all', requireAuth, wrap(async (req, res) => {
  await query('UPDATE notifikasi SET is_read = true WHERE id_user = $1 AND NOT COALESCE(is_read, false)', [req.user.id])
  res.json({ message: 'Semua notifikasi ditandai dibaca.' })
}))

router.put('/:id/read', requireAuth, wrap(async (req, res) => {
  const id = int(req.params.id, 'ID notifikasi')
  await query('UPDATE notifikasi SET is_read = true WHERE id_notif = $1 AND id_user = $2', [id, req.user.id])
  res.json({ message: 'Ditandai dibaca.' })
}))

export default router
