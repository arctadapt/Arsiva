import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Bell, Boxes, Clock3, PackageCheck, Sparkles, TrendingUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useFetch } from '../lib/hooks.js'
import { isAdmin, namaPanggilan, sisaWaktu, tgl, waktuLalu } from '../lib/format.js'
import AssetTag from '../components/AssetTag.jsx'
import ReturnButton from '../components/ReturnButton.jsx'
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '../components/ui.jsx'

function StatCard({ icon: Icon, label, value, note, tone = 'text-ink' }) {
  return (
    <div className="rounded-2xl border border-line/80 bg-surface p-5 shadow-[0_8px_26px_rgba(30,32,30,0.035)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <dt className="text-sm font-medium text-muted">{label}</dt>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sunken text-ink" aria-hidden>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <dd className={`mt-3 text-[34px] font-semibold leading-none tracking-[-0.04em] ${tone}`}>{value}</dd>
      <p className="mt-2 text-xs text-muted">{note}</p>
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
  const mainAction = admin ? '/kelola' : '/katalog'

  return (
    <>
      <PageHeader
        title={`Halo, ${namaPanggilan(user?.nama)}`}
        description={admin ? 'Ringkasan aktivitas inventaris sekolah.' : 'Pantau pinjamanmu dan temukan aset yang kamu perlukan.'}
      >
        <Link to={mainAction} className="btn-primary group">
          {admin ? 'Kelola inventaris' : 'Jelajahi katalog'}
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </PageHeader>

      <section className="relative isolate mb-6 min-h-[250px] overflow-hidden rounded-[26px] bg-[#3C3D37] text-[#ECDFCC] sm:min-h-[280px] sm:rounded-[30px]">
        <img src="/inventory-hero.png" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1E201E]/95 via-[#1E201E]/70 to-[#1E201E]/10" aria-hidden="true" />
        <div className="relative flex min-h-[250px] flex-col justify-between gap-8 p-6 sm:min-h-[280px] sm:p-9 lg:flex-row lg:items-end lg:p-10">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ECDFCC]" aria-hidden />
              SMK Prakarya Internasional
            </span>
            <h2 className="mt-5 max-w-lg text-[30px] font-semibold leading-[1.08] tracking-[-0.035em] text-white sm:text-[38px]">
              Inventaris sekolah, lebih mudah dipantau.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75 sm:text-[15px]">
              Satu tempat untuk melihat aset, menjaga ketersediaan, dan menata peminjaman harian.
            </p>
          </div>
          <div className="flex w-full max-w-[220px] items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#ECDFCC] text-[#1E201E]" aria-hidden>
              <PackageCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-white/70">Total stok tercatat</p>
              <p className="mt-0.5 text-2xl font-semibold tracking-tight text-white">{s?.stok_total ?? '—'}</p>
            </div>
          </div>
        </div>
      </section>

      {admin && s?.menunggu > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-sunken/70 px-5 py-4">
          <p className="font-semibold">{s.menunggu} permintaan menunggu keputusanmu.</p>
          <Link to="/permintaan" className="btn-quiet btn-sm">Tinjau permintaan</Link>
        </div>
      )}

      {stats.error ? <div className="mb-6"><ErrorState error={stats.error} onRetry={stats.reload} /></div> : (
        <dl className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Clock3} label={admin ? 'Menunggu keputusan' : 'Menunggu persetujuan'} value={s?.menunggu ?? '—'} note="Perlu ditinjau" />
          <StatCard icon={Boxes} label={admin ? 'Sedang dipinjam' : 'Sedang kamu pinjam'} value={s?.dipinjam ?? '—'} note="Peminjaman aktif" />
          <StatCard icon={TrendingUp} label="Terlambat" value={s?.terlambat ?? '—'} note="Perlu tindak lanjut" tone={s?.terlambat > 0 ? 'text-bad' : 'text-ink'} />
          <StatCard icon={PackageCheck} label="Stok tersedia" value={s?.stok_total ?? '—'} note="Barang dalam katalog" />
        </dl>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.85fr)]">
        <section aria-labelledby="h-aktif" className="min-w-0 rounded-2xl border border-line/80 bg-surface p-5 shadow-[0_8px_26px_rgba(30,32,30,0.035)] sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Aktivitas</p>
              <h2 id="h-aktif" className="mt-1 text-xl font-semibold tracking-tight">{admin ? 'Sedang dipinjam' : 'Pinjaman aktif'}</h2>
            </div>
            <Link to="/riwayat" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink hover:text-muted">
              Riwayat <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          {loans.loading ? <ListSkeleton rows={3} /> : loans.error ? <ErrorState error={loans.error} onRetry={loans.reload} /> : aktif.length === 0 ? (
            <EmptyState
              title={admin ? 'Tidak ada yang sedang dipinjam' : 'Kamu belum meminjam apa pun'}
              action={<Link to="/katalog" className="btn-quiet btn-sm">Lihat katalog</Link>}
            >
              {admin ? 'Barang dan ruangan yang dipinjam akan muncul di sini.' : 'Pilih barang atau ruangan dari katalog, lalu ajukan ke admin.'}
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line/80 bg-bg/45">
              {aktif.slice(0, 5).map((l) => {
                const sisa = sisaWaktu(l.jatuh_tempo)
                return (
                  <li key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4 first:rounded-t-xl last:rounded-b-xl">
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

        <div className="flex min-w-0 flex-col gap-5">
          <section aria-labelledby="h-asisten" className="relative overflow-hidden rounded-2xl bg-sunken p-6 sm:p-7">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full border-[26px] border-ink/[0.04]" aria-hidden="true" />
            <div className="relative">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-[#ECDFCC]" aria-hidden>
                <Sparkles className="h-5 w-5" />
              </span>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted">Asisten Arsiva</p>
              <h2 id="h-asisten" className="mt-1 max-w-xs text-[22px] font-semibold leading-tight tracking-tight">
                {admin ? 'Semua aset tetap dalam kendali.' : 'Butuh perlengkapan untuk kegiatan?'}
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
                {admin ? 'Tinjau permintaan dan jaga data inventaris sekolah tetap akurat.' : 'Cari barang atau ruangan yang tersedia, lalu kirim permintaan langsung ke admin.'}
              </p>
              <Link to={admin ? '/kelola' : '/katalog'} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#1E201E] px-4 py-2.5 text-sm font-semibold text-[#ECDFCC] transition-transform hover:translate-x-0.5 dark:bg-[#ECDFCC] dark:text-[#1E201E]">
                {admin ? 'Kelola aset' : 'Jelajahi katalog'} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </section>

          <section aria-labelledby="h-notif" className="rounded-2xl border border-line/80 bg-surface p-5 shadow-[0_8px_26px_rgba(30,32,30,0.035)] sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-sunken text-ink" aria-hidden>
                  <Bell className="h-4 w-4" />
                </span>
                <h2 id="h-notif" className="text-base font-semibold">Kabar terbaru</h2>
              </div>
              <Link to="/notifikasi" className="text-sm font-semibold text-ink hover:text-muted">Semua</Link>
            </div>
            {notif.loading ? <ListSkeleton rows={2} /> : terbaru.length === 0 ? (
              <p className="rounded-xl bg-bg/55 px-4 py-5 text-sm text-muted">Belum ada kabar baru. Notifikasi akan muncul di sini.</p>
            ) : (
              <ul className="divide-y divide-line">
                {terbaru.map((n) => (
                  <li key={n.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.dibaca ? 'bg-transparent' : 'bg-[#697565]'}`} aria-label={n.dibaca ? undefined : 'Belum dibaca'} />
                    <div className="min-w-0">
                      <p className="text-sm leading-snug">{n.pesan}</p>
                      <p className="mt-1 text-xs text-muted">{waktuLalu(n.dibuat)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
