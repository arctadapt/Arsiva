import { Router } from 'express'
import { query } from '../db.js'
import { wrap } from '../lib/http.js'
import { requireAuth, isAdmin } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, wrap(async (req, res) => {
  const { rows: [s] } = await query(
    `SELECT
       (SELECT COALESCE(SUM(jumlah_barang), 0) FROM barang)::int AS stok_total,
       (SELECT COUNT(*) FROM barang WHERE jumlah_barang > 0)::int AS jenis_tersedia,
       (SELECT COUNT(*) FROM ruangan WHERE COALESCE(status_ruangan, true))::int AS ruangan_tersedia,
       (SELECT COUNT(*) FROM request WHERE status = false AND (id_ruangan IS NULL OR workflow_status IS NULL OR workflow_status IN ('PENDING_ADMIN_CONTACT','WAITING_FOR_PIC','PIC_APPROVED')) AND ($1::boolean OR id_user = $2))::int AS menunggu,
       (SELECT COUNT(*) FROM pinjam WHERE status_pinjam AND tanggal_kembali IS NULL
          AND ($1::boolean OR id_user = $2))::int AS dipinjam,
       (SELECT COUNT(*) FROM pinjam WHERE status_pinjam AND tanggal_kembali IS NULL AND jatuh_tempo < NOW()
          AND ($1::boolean OR id_user = $2))::int AS terlambat`,
    [isAdmin(req.user.role), req.user.id],
  )
  res.json(s)
}))

export default router
