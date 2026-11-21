/** Simpan notifikasi untuk satu pengguna. Dipanggil di dalam transaksi (client dari tx()). */
export async function notify(client, userId, message) {
  const { rows: [n] } = await client.query(
    'INSERT INTO notifikasi (id_user, message) VALUES ($1, $2) RETURNING id_notif',
    [userId, message],
  )
  return n.id_notif
}

/** Kirim notifikasi ke semua admin. */
export async function notifyAdmins(client, message) {
  await client.query(
    `INSERT INTO notifikasi (id_user, message) SELECT id_user, $1 FROM users WHERE UPPER(role) IN ('ADMIN', 'SUPER ADMIN')`,
    [message],
  )
}

export const formatTanggal = (d) =>
  new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })
