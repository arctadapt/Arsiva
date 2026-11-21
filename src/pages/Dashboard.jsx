import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useFetch } from '../lib/hooks.js'
import { isAdmin, namaPanggilan, sisaWaktu, tgl, waktuLalu } from '../lib/format.js'
import AssetTag from '../components/AssetTag.jsx'
import ReturnButton from '../components/ReturnButton.jsx'
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '../components/ui.jsx'

function Stat({ label, value, tone }) {
  return (
    <div className="px-5 py-4 first:pl-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`mt-1 text-[32px] font-bold leading-none tracking-tight ${tone ?? ''}`}>{value ?? '-'}</dd>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const admin = isAdmin(user)
  const stats = useFetch('/stats')
  const loans = useFetch('/loans')
  const notif = useFetch('/notifications')

  const s = stats.data
  const aktif = (loans.data?.loans ?? []).filter((l) => l.status === 'dipinjam' || l.status === 'terlambat')
  const terbaru = (notif.data?.notifications ?? []).slice(0, 4)

  const reloadAll = () => { stats.reload(); loans.reload() }

  return (
    <>
      <PageHeader
        title={`Halo, ${namaPanggilan(user?.nama)}`}
        description={admin
          ? 'Ringkasan peminjaman di sekolah hari ini.'
          : 'Lihat pinjamanmu yang sedang berjalan, atau ajukan peminjaman baru.'}
      >
        <Link to="/katalog" className="btn-primary">Ajukan peminjaman</Link>
      </PageHeader>

      {admin && s?.menunggu > 0 && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-lg border-l-4 border-tag bg-surface p-4">
          <p className="font-semibold">{s.menunggu} permintaan menunggu keputusanmu.</p>
          <Link to="/permintaan" className="btn-quiet btn-sm">Tinjau permintaan</Link>
        </div>
      )}

      {stats.error ? <ErrorState error={stats.error} onRetry={stats.reload} /> : (
        <dl className="mb-12 grid grid-cols-2 divide-x divide-line border-y border-line sm:grid-cols-4">
          <Stat label={admin ? 'Menunggu keputusan' : 'Menunggu persetujuan'} value={s?.menunggu} />
          <Stat label={admin ? 'Sedang dipinjam' : 'Sedang kamu pinjam'} value={s?.dipinjam} />
          <Stat label="Terlambat" value={s?.terlambat} tone={s?.terlambat > 0 ? 'text-bad' : ''} />
          <Stat label="Stok barang tersedia" value={s?.stok_total} />
        </dl>
      )}

      <div className="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="h-aktif">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="h-aktif" className="text-lg font-bold">{admin ? 'Sedang dipinjam' : 'Pinjaman aktif'}</h2>
            <Link to="/riwayat" className="text-sm font-semibold text-primary underline underline-offset-4">Semua riwayat</Link>
          </div>
          {loans.loading ? <ListSkeleton rows={3} /> : loans.error ? <ErrorState error={loans.error} onRetry={loans.reload} /> : aktif.length === 0 ? (
            <EmptyState
              title={admin ? 'Tidak ada yang sedang dipinjam' : 'Kamu belum meminjam apa pun'}
              action={<Link to="/katalog" className="btn-quiet btn-sm">Lihat katalog</Link>}
            >
              {admin ? 'Barang dan ruangan yang dipinjam akan muncul di sini.' : 'Pilih barang atau ruangan dari katalog, lalu ajukan ke admin.'}
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
              {aktif.slice(0, 5).map((l) => {
                const sisa = sisaWaktu(l.jatuh_tempo)
                return (
                  <li key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
                    <AssetTag jenis={l.jenis} id={l.item_id} />
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="truncate font-semibold">{l.nama}{l.jenis === 'barang' && l.jumlah > 1 ? `, ${l.jumlah} buah` : ''}</p>
                      <p className="text-sm text-muted">
                        {admin ? `${l.peminjam}, ${l.kelas}. ` : ''}
                        {l.jatuh_tempo ? `Batas kembali ${tgl(l.jatuh_tempo)}` : `Dipinjam ${tgl(l.tanggal_pinjam)}`}
                        {sisa && <span className={sisa.telat ? 'font-semibold text-bad' : ''}>{`. ${sisa.teks}`}</span>}
                      </p>
                    </div>
                    <ReturnButton loan={l} onDone={reloadAll} />
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="h-notif">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="h-notif" className="text-lg font-bold">Kabar terbaru</h2>
            <Link to="/notifikasi" className="text-sm font-semibold text-primary underline underline-offset-4">Semua</Link>
          </div>
          {notif.loading ? <ListSkeleton rows={3} /> : terbaru.length === 0 ? (
            <EmptyState title="Belum ada kabar">Keputusan admin atas permintaanmu muncul di sini.</EmptyState>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
              {terbaru.map((n) => (
                <li key={n.id} className="flex gap-3 p-4">
                  <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.dibaca ? 'bg-transparent' : 'bg-tag'}`} aria-label={n.dibaca ? undefined : 'Belum dibaca'} />
                  <div>
                    <p className="text-[15px] leading-snug">{n.pesan}</p>
                    <p className="mt-1 text-xs text-muted">{waktuLalu(n.dibuat)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
