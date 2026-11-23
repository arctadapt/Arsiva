import { Router } from 'express'
import { query, tx } from '../db.js'
import { HttpError, wrap, text, int } from '../lib/http.js'
import { requireAuth, requireAdmin, isAdmin } from '../middleware/auth.js'
import { notify, notifyAdmins, formatTanggal } from '../lib/notify.js'

const router = Router()
const phoneValid = (s) => /^628[0-9]{7,12}$/.test(String(s || ''))
const validTime = (s) => typeof s === 'string' && !Number.isNaN(Date.parse(s))
// arsiva_v11_final: permintaan kelas dipertahankan untuk jejak audit.
const ACTIVE_CLASS = ['PENDING_ADMIN_CONTACT','WAITING_FOR_PIC','PIC_APPROVED']

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
  let rows
  try {
    ;({ rows } = await query(
    `SELECT q.id_request AS id, 'menunggu' AS status,
            u.nama_lengkap AS peminjam, u.kelas,
            CASE WHEN q.id_ruangan IS NOT NULL THEN 'ruangan' ELSE 'barang' END AS jenis,
            COALESCE(q.id_ruangan, q.id_barang) AS item_id,
            COALESCE(b.nama_barang, r.nama_ruangan) AS nama,
            COALESCE(q.jumlah_barang, 1) AS jumlah,
            q.tanggal_pinjam AS diajukan,
            q.tanggal_mulai, q.tanggal_selesai, q.keperluan, q.catatan, q.workflow_status,
            q.pic_status, q.pic_phone, q.pic_notes, q.pic_contacted_at, q.pic_confirmed_at, q.final_reason,
            b.jumlah_barang AS stok_sekarang,
            COALESCE(r.status_ruangan, true) AS ruangan_tersedia
       FROM request q
       LEFT JOIN users u ON u.id_user = q.id_user
       LEFT JOIN barang b ON b.id_barang = q.id_barang
       LEFT JOIN ruangan r ON r.id_ruangan = q.id_ruangan
      WHERE q.status = false AND (q.id_ruangan IS NULL OR q.workflow_status IS NULL OR q.workflow_status IN ('PENDING_ADMIN_CONTACT','WAITING_FOR_PIC','PIC_APPROVED')) AND ($1::boolean OR q.id_user = $2)
      ORDER BY q.tanggal_pinjam ASC, q.id_request ASC`,
    [isAdmin(req.user.role), req.user.id],
    ))
  } catch (error) {
    if (error.code !== '42703') throw error
    // Database belum dimigrasi: tetap tampilkan permintaan lama tanpa menghilangkan data.
    ;({ rows } = await query(`SELECT q.id_request AS id, 'menunggu' AS status,
      u.nama_lengkap AS peminjam, u.kelas,
      CASE WHEN q.id_ruangan IS NOT NULL THEN 'ruangan' ELSE 'barang' END AS jenis,
      COALESCE(q.id_ruangan, q.id_barang) AS item_id,
      COALESCE(b.nama_barang, r.nama_ruangan) AS nama,
      COALESCE(q.jumlah_barang, 1) AS jumlah, q.tanggal_pinjam AS diajukan,
      b.jumlah_barang AS stok_sekarang,
      COALESCE(r.status_ruangan, true) AS ruangan_tersedia
      FROM request q LEFT JOIN users u ON u.id_user=q.id_user
      LEFT JOIN barang b ON b.id_barang=q.id_barang
      LEFT JOIN ruangan r ON r.id_ruangan=q.id_ruangan
      WHERE q.status=false AND ($1::boolean OR q.id_user=$2)
      ORDER BY q.tanggal_pinjam ASC, q.id_request ASC`,
      [isAdmin(req.user.role), req.user.id]))
  }

  res.json({ requests: rows })
}))

// Riwayat keputusan kelas, termasuk pembatalan dan penolakan PIC.
router.get('/class-history', requireAuth, wrap(async (req, res) => {
  let rows
  try {
    ;({ rows } = await query(`SELECT q.id_request AS id,q.workflow_status,q.pic_status,q.pic_notes,q.final_reason,
      q.tanggal_mulai,q.tanggal_selesai,q.keperluan,q.catatan,q.tanggal_pinjam AS diajukan,
      u.nama_lengkap AS peminjam,q.kelas,r.nama_ruangan AS nama,q.id_ruangan AS item_id
      FROM request q JOIN users u ON u.id_user=q.id_user JOIN ruangan r ON r.id_ruangan=q.id_ruangan
      WHERE q.id_ruangan IS NOT NULL AND q.status=true AND ($1::boolean OR q.id_user=$2)
      ORDER BY q.id_request DESC LIMIT 300`,[isAdmin(req.user.role),req.user.id]))
  } catch (error) {
    if (error.code !== '42703') throw error
    // Riwayat lama tetap dapat dibaca sebelum migrasi skema v1.1.
    rows = []
  }
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
        "SELECT 1 FROM request WHERE id_ruangan = $1 AND id_user = $2 AND status = false AND workflow_status IN ('PENDING_ADMIN_CONTACT','WAITING_FOR_PIC','PIC_APPROVED')", [id, req.user.id])
      if (dup.rowCount) throw new HttpError(409, `Kamu sudah mengajukan ${r.nama_ruangan} dan masih menunggu keputusan.`)
      const { tanggal_mulai, tanggal_selesai } = req.body
      const keperluan = text(req.body.keperluan, 'Keperluan', { min: 3, max: 500 })
      const catatan = String(req.body.catatan || '').trim().slice(0, 500)
      if (!validTime(tanggal_mulai) || !validTime(tanggal_selesai) ||
          new Date(tanggal_mulai) >= new Date(tanggal_selesai) || new Date(tanggal_mulai) <= new Date()) {
        throw new HttpError(400, 'Jadwal tidak valid. Pilih waktu mulai di masa depan dan waktu selesai setelahnya.')
      }
      // Beri pesan yang dapat ditindaklanjuti bila skema v1.1 belum tersedia.
      const { rows: [schema] } = await c.query(`SELECT
        COUNT(*) FILTER (WHERE column_name IN ('tanggal_mulai','tanggal_selesai','keperluan','catatan','workflow_status'))::int AS columns_ready
        FROM information_schema.columns WHERE table_schema='public' AND table_name='request'`)
      const { rows: [audit] } = await c.query("SELECT to_regclass('public.arsiva_request_audit') IS NOT NULL AS ready")
      if (schema.columns_ready !== 5 || !audit.ready) throw new HttpError(503,
        'Fitur peminjaman kelas belum aktif: migrasi database Arsiva v1.1 belum lengkap. Hubungi admin.')
      await c.query('SELECT pg_advisory_xact_lock($1)', [id])
      const clash = await c.query(`SELECT 1 FROM request WHERE id_ruangan = $1 AND status = false
        AND workflow_status IN ('PENDING_ADMIN_CONTACT','WAITING_FOR_PIC','PIC_APPROVED')
        AND tanggal_mulai < $3 AND tanggal_selesai > $2 LIMIT 1`, [id, tanggal_mulai, tanggal_selesai])
      if (clash.rowCount) throw new HttpError(409, 'Jadwal ruangan bentrok dengan permintaan lain.')
      const booked = await c.query(`SELECT 1 FROM pinjam WHERE id_ruangan=$1 AND status_pinjam=true
        AND tanggal_kembali IS NULL AND (tanggal_mulai IS NULL OR (tanggal_mulai < $3 AND tanggal_selesai > $2)) LIMIT 1`,[id,tanggal_mulai,tanggal_selesai])
      if (booked.rowCount) throw new HttpError(409,'Jadwal ruangan bentrok dengan peminjaman yang disetujui.')
      const { rows: [created] } = await c.query(`INSERT INTO request
        (id_user, id_ruangan, kelas, tanggal_mulai, tanggal_selesai, keperluan, catatan, workflow_status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING_ADMIN_CONTACT') RETURNING id_request`,
        [req.user.id, id, me.kelas, tanggal_mulai, tanggal_selesai, keperluan, catatan])
      await c.query(`INSERT INTO arsiva_request_audit(request_id,actor_id,event)
        VALUES ($1,$2,'SUBMITTED')`, [created.id_request,req.user.id])
      await notify(c, req.user.id, `Permintaan ${r.nama_ruangan} pada ${tanggal_mulai} berhasil diajukan. Menunggu admin menghubungi PIC.`)
      nama = r.nama_ruangan
    }
    await notifyAdmins(c, `Permintaan baru dari ${me.nama_lengkap} (${me.kelas}): ${nama}.`)
  })
  res.status(201).json({ message: 'Permintaan terkirim.' })
}))

// Pengelolaan kontak PIC per kelas.
router.get('/class-pics', requireAdmin, wrap(async (_req, res) => {
  const { rows } = await query('SELECT kelas, phone FROM arsiva_class_pic ORDER BY kelas')
  res.json({ pics: rows })
}))
router.put('/class-pics/:kelas', requireAdmin, wrap(async (req, res) => {
  const kelas = String(req.params.kelas || '').trim()
  const phone = String(req.body.phone || '').trim()
  if (!kelas || kelas.length > 100 || !phoneValid(phone)) throw new HttpError(400, 'Kelas atau nomor PIC tidak valid. Gunakan 628...')
  await query(`INSERT INTO arsiva_class_pic(kelas,phone,updated_by) VALUES ($1,$2,$3)
    ON CONFLICT(kelas) DO UPDATE SET phone=EXCLUDED.phone, updated_by=EXCLUDED.updated_by, updated_at=NOW()`,
    [kelas,phone,req.user.id])
  res.json({ message: 'Kontak PIC disimpan.' })
}))

// Admin membuka WhatsApp secara manual; endpoint hanya mencatat waktu kontak.
router.post('/requests/:id/contact-pic', requireAdmin, wrap(async (req,res) => {
  const id=int(req.params.id,'ID permintaan')
  const phone=String(req.body.phone||'').trim()
  if (!phoneValid(phone)) throw new HttpError(400,'Nomor PIC harus berformat 628...')
  let url
  await tx(async c=>{
    const {rows:[q]}=await c.query(`SELECT q.*,u.nama_lengkap,r.nama_ruangan FROM request q
      JOIN users u ON u.id_user=q.id_user JOIN ruangan r ON r.id_ruangan=q.id_ruangan
      WHERE q.id_request=$1 AND q.status=false FOR UPDATE OF q`,[id])
    if (!q || !q.id_ruangan || !['PENDING_ADMIN_CONTACT','WAITING_FOR_PIC'].includes(q.workflow_status))
      throw new HttpError(409,'Permintaan tidak dapat dihubungi pada status ini.')
    await c.query(`UPDATE request SET pic_phone=$2,pic_contacted_at=NOW(),handled_by=$3,
      workflow_status='WAITING_FOR_PIC' WHERE id_request=$1`,[id,phone,req.user.id])
    await c.query(`INSERT INTO arsiva_request_audit(request_id,actor_id,event,detail)
      VALUES($1,$2,'PIC_CONTACTED',jsonb_build_object('phone',$3::text))`,[id,req.user.id,phone])
    const formatWIB = (value) => new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(new Date(value))
    const msg = [
      '*KONFIRMASI PEMINJAMAN RUANGAN*',
      '',
      `Halo Bapak/Ibu PIC kelas ${q.kelas},`,
      'Mohon konfirmasi permohonan peminjaman ruangan berikut:',
      '',
      `🏫 *Ruangan:* ${q.nama_ruangan}`,
      `👤 *Peminjam:* ${q.nama_lengkap}`,
      `📚 *Kelas peminjam:* ${q.kelas}`,
      `📅 *Mulai:* ${formatWIB(q.tanggal_mulai)} WIB`,
      `📅 *Selesai:* ${formatWIB(q.tanggal_selesai)} WIB`,
      `📝 *Keperluan:* ${q.keperluan}`,
      ...(q.catatan ? [`💬 *Catatan:* ${q.catatan}`] : []),
      '',
      'Apakah permohonan ini *disetujui* atau *ditolak*?',
      'Mohon balas pesan ini dengan keputusan Bapak/Ibu.',
      '',
      'Terima kasih.',
    ].join('\n')
    url=`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
  })
  res.json({url,message:'Kontak PIC dicatat. Kirim pesan WhatsApp secara manual.'})
}))
router.post('/requests/:id/pic-decision', requireAdmin, wrap(async(req,res)=>{
  const id=int(req.params.id,'ID permintaan')
  const decision=req.body.decision
  const notes=String(req.body.notes||'').trim().slice(0,500)
  if (!['APPROVED','REJECTED'].includes(decision)) throw new HttpError(400,'Keputusan PIC tidak valid.')
  await tx(async c=>{
    const {rows:[q]}=await c.query('SELECT * FROM request WHERE id_request=$1 AND status=false FOR UPDATE',[id])
    if (!q || q.workflow_status!=='WAITING_FOR_PIC' || !q.pic_contacted_at) throw new HttpError(409,'PIC belum dihubungi atau keputusan sudah dicatat.')
    await c.query(`UPDATE request SET pic_status=$2,workflow_status=$3,pic_confirmed_at=NOW(),
      pic_notes=$4,handled_by=$5,status=CASE WHEN $2='REJECTED' THEN true ELSE false END,final_decided_at=CASE WHEN $2='REJECTED' THEN NOW() ELSE NULL END WHERE id_request=$1`,[id,decision,decision==='APPROVED'?'PIC_APPROVED':'PIC_REJECTED',notes,req.user.id])
    await c.query(`INSERT INTO arsiva_request_audit(request_id,actor_id,event,detail)
      VALUES($1,$2,'PIC_DECISION',jsonb_build_object('decision',$3::text,'notes',$4::text))`,[id,req.user.id,decision,notes])
    await notify(c,q.id_user,`PIC kelas ${q.kelas} ${decision==='APPROVED'?'menyetujui':'menolak'} permintaan ruangan pada ${q.tanggal_mulai}. ${notes}`)
  })
  res.json({message:'Keputusan PIC dicatat.'})
}))

// Batalkan permintaan milik sendiri yang belum diputuskan.
router.delete('/requests/:id', requireAuth, wrap(async (req, res) => {
  const id = int(req.params.id, 'ID permintaan')
  await tx(async c => {
    const {rows:[q]} = await c.query('SELECT * FROM request WHERE id_request=$1 AND id_user=$2 AND status=false FOR UPDATE',[id,req.user.id])
    if (!q || (q.id_ruangan && !ACTIVE_CLASS.includes(q.workflow_status))) throw new HttpError(404,'Permintaan tidak ditemukan atau sudah diproses.')
    if (q.id_ruangan) {
      await c.query("UPDATE request SET status=true,workflow_status='CANCELLED',final_decided_at=NOW() WHERE id_request=$1",[id])
      await c.query("INSERT INTO arsiva_request_audit(request_id,actor_id,event) VALUES($1,$2,'CANCELLED')",[id,req.user.id])
    } else await c.query('DELETE FROM request WHERE id_request=$1',[id])
  })
  res.json({ message: 'Permintaan dibatalkan.' })
}))

// Setujui permintaan: kurangi stok / tandai ruangan dipakai, catat peminjaman.
router.post('/requests/:id/approve', requireAdmin, wrap(async (req, res) => {
  const id = int(req.params.id, 'ID permintaan')
  const durasi = int(req.body.durasi_hari ?? 7, 'Lama peminjaman', { min: 1, max: 60 })

  await tx(async (c) => {
    const { rows: [q] } = await c.query('SELECT * FROM request WHERE id_request = $1 AND status = false FOR UPDATE', [id])
    if (!q) throw new HttpError(404, 'Permintaan tidak ditemukan atau sudah diproses.')
    if (q.id_ruangan && (q.workflow_status !== 'PIC_APPROVED' || q.pic_status !== 'APPROVED'))
      throw new HttpError(409, 'Persetujuan PIC wajib dicatat sebelum persetujuan admin.')

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
      if (!q.tanggal_mulai || !q.tanggal_selesai || new Date(q.tanggal_mulai) <= new Date())
        throw new HttpError(409,'Jadwal sudah berlalu atau tidak valid.')
      const overlap = await c.query(`SELECT 1 FROM pinjam WHERE id_ruangan=$1 AND status_pinjam=true
        AND tanggal_kembali IS NULL AND (tanggal_mulai IS NULL OR (tanggal_mulai < $3 AND tanggal_selesai > $2)) LIMIT 1`,
        [q.id_ruangan,q.tanggal_mulai,q.tanggal_selesai])
      if (overlap.rowCount) throw new HttpError(409,'Jadwal ruangan sudah dipesan.')
      nama = r.nama_ruangan
    } else {
      throw new HttpError(400, 'Permintaan ini tidak punya barang atau ruangan.')
    }

    if (q.id_ruangan) {
      const notifId=await notify(c,q.id_user,`Peminjaman ${nama} disetujui admin untuk ${q.tanggal_mulai} sampai ${q.tanggal_selesai}.`)
      await c.query(`INSERT INTO pinjam (id_user,id_ruangan,tanggal_pinjam,status_pinjam,jenis_peminjaman,id_notif,jumlah_barang,jatuh_tempo,tanggal_mulai,tanggal_selesai,request_asal_id)
        VALUES($1,$2,NOW(),true,'ruangan',$3,1,$4,$5,$6,$7)`,[q.id_user,q.id_ruangan,notifId,q.tanggal_selesai,q.tanggal_mulai,q.tanggal_selesai,id])
      await c.query("UPDATE request SET status=true,workflow_status='APPROVED',handled_by=$2,final_decided_at=NOW() WHERE id_request=$1",[id,req.user.id])
      await c.query("INSERT INTO arsiva_request_audit(request_id,actor_id,event) VALUES($1,$2,'ADMIN_APPROVED')",[id,req.user.id])
    } else {
      const jatuhTempo = new Date(Date.now() + durasi * 86_400_000)
      const notifId = await notify(c,q.id_user,`Permintaan pinjam ${nama} disetujui. Kembalikan paling lambat ${formatTanggal(jatuhTempo)}.`)
      await c.query(`INSERT INTO pinjam (id_user,id_barang,id_ruangan,tanggal_pinjam,status_pinjam,jenis_peminjaman,id_notif,jumlah_barang,jatuh_tempo)
        VALUES($1,$2,$3,NOW(),true,'barang',$4,$5,$6)`,[q.id_user,q.id_barang,q.id_ruangan,notifId,jumlah,jatuhTempo])
      await c.query('DELETE FROM request WHERE id_request=$1',[id])
    }
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

    const notifId = await notify(c,q.id_user,`Permintaan pinjam ${q.nama ?? 'kamu'} ditolak. Alasan: ${alasan}`)
    if (q.id_ruangan) {
      if (!ACTIVE_CLASS.includes(q.workflow_status)) throw new HttpError(409,'Permintaan telah diputuskan.')
      await c.query("UPDATE request SET status=true,workflow_status='REJECTED_BY_ADMIN',handled_by=$2,final_decided_at=NOW(),final_reason=$3 WHERE id_request=$1",[id,req.user.id,alasan])
      await c.query("INSERT INTO arsiva_request_audit(request_id,actor_id,event,detail) VALUES($1,$2,'ADMIN_REJECTED',jsonb_build_object('reason',$3::text))",[id,req.user.id,alasan])
    } else {
      await c.query(`INSERT INTO pinjam (id_user,id_barang,id_ruangan,tanggal_pinjam,status_pinjam,jenis_peminjaman,id_notif,jumlah_barang,alasan)
        VALUES($1,$2,$3,$4,false,'barang',$5,$6,$7)`,[q.id_user,q.id_barang,q.id_ruangan,q.tanggal_pinjam,notifId,q.jumlah_barang||1,alasan])
      await c.query('DELETE FROM request WHERE id_request=$1',[id])
    }
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
        p.tanggal_mulai ? 'SELECT nama_ruangan FROM ruangan WHERE id_ruangan=$1' : 'UPDATE ruangan SET status_ruangan = true, updatedat = NOW() WHERE id_ruangan = $1 RETURNING nama_ruangan',
        [p.id_ruangan])
      nama = r?.nama_ruangan ?? nama
    }
    if (p.id_user !== req.user.id) await notify(c, p.id_user, `Pengembalian ${nama} sudah dicatat. Terima kasih!`)
  })
  res.json({ message: 'Pengembalian dicatat.' })
}))

export default router
