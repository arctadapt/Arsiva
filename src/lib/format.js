const tanggalFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
const relFmt = new Intl.RelativeTimeFormat('id-ID', { numeric: 'auto' })

export const tgl = (d) => (d ? tanggalFmt.format(new Date(d)) : '-')

/** "5 menit lalu", "kemarin", dst. */
export function waktuLalu(d) {
  const diff = (new Date(d).getTime() - Date.now()) / 1000
  const abs = Math.abs(diff)
  if (abs < 60) return 'baru saja'
  if (abs < 3600) return relFmt.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return relFmt.format(Math.round(diff / 3600), 'hour')
  if (abs < 86400 * 30) return relFmt.format(Math.round(diff / 86400), 'day')
  return tgl(d)
}

/** Sisa waktu menuju batas pengembalian, dalam kalimat. */
export function sisaWaktu(jatuhTempo) {
  if (!jatuhTempo) return null
  const hari = Math.ceil((new Date(jatuhTempo).getTime() - Date.now()) / 86_400_000)
  if (hari < 0) return { teks: `Terlambat ${Math.abs(hari)} hari`, telat: true }
  if (hari === 0) return { teks: 'Batas kembali hari ini', telat: false }
  return { teks: `${hari} hari lagi`, telat: false }
}

/** Kode aset ala stiker inventaris, mis. ARV-B012 (barang) atau ARV-R003 (ruangan). */
export const kodeAset = (jenis, id) => `ARV-${jenis === 'ruangan' ? 'R' : 'B'}${String(id ?? 0).padStart(3, '0')}`

export const isAdmin = (user) => user?.role === 'ADMIN' || user?.role === 'SUPER ADMIN'

export const namaPanggilan = (nama = '') => nama.trim().split(/\s+/)[0] || 'kamu'

export const STATUS = {
  menunggu: { label: 'Menunggu', tone: 'warn' },
  dipinjam: { label: 'Dipinjam', tone: 'primary' },
  terlambat: { label: 'Terlambat', tone: 'bad' },
  dikembalikan: { label: 'Dikembalikan', tone: 'ok' },
  ditolak: { label: 'Ditolak', tone: 'muted' },
}
