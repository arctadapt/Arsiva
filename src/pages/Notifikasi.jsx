import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Bell, Check } from 'lucide-react'
import { api } from '../lib/api.js'
import { useFetch, refreshCounts } from '../lib/hooks.js'
import { waktuLalu } from '../lib/format.js'
import { useToast } from '../context/ToastContext.jsx'
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '../components/ui.jsx'

export default function Notifikasi() {
  const { id } = useParams()
  const { data, loading, error, reload } = useFetch('/notifications')
  const toast = useToast()
  const list = data?.notifications ?? []
  const selected = id ? list.find((notification) => String(notification.id) === id) : null

  async function baca(n) {
    if (n.dibaca) return
    try {
      await api.put(`/notifications/${n.id}/read`)
      reload()
      refreshCounts()
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function bacaSemua() {
    try {
      await api.post('/notifications/read-all')
      reload()
      refreshCounts()
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <>
      <PageHeader
        title={id ? 'Detail notifikasi' : 'Pusat notifikasi'}
        description={id ? 'Baca rincian kabar peminjaman dan status aset.' : 'Keputusan admin dan kabar peminjaman untukmu.'}
      >
        {id ? (
          <Link to="/notifikasi" className="btn-quiet btn-sm"><ArrowLeft className="h-4 w-4" aria-hidden /> Kembali</Link>
        ) : data?.belum_dibaca > 0 ? (
          <button className="btn-quiet btn-sm" onClick={bacaSemua}>Tandai semua dibaca</button>
        ) : null}
      </PageHeader>

      {id ? (
        loading ? <ListSkeleton rows={2} /> : error ? <ErrorState error={error} onRetry={reload} /> : !selected ? (
          <EmptyState title="Notifikasi tidak ditemukan" action={<Link to="/notifikasi" className="btn-quiet btn-sm">Kembali ke notifikasi</Link>}>
            Kabar ini mungkin sudah tidak tersedia.
          </EmptyState>
        ) : (
          <article className="overflow-hidden rounded-3xl border border-line/80 bg-surface shadow-[0_12px_36px_rgba(30,32,30,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-sunken/50 px-5 py-4 sm:px-7">
              <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-ink">
                <span className={`h-2 w-2 rounded-full ${selected.dibaca ? 'bg-muted/50' : 'bg-[#697565]'}`} aria-hidden />
                {selected.dibaca ? 'Sudah dibaca' : 'Belum dibaca'}
              </span>
              <span className="text-sm text-muted">{waktuLalu(selected.dibuat)}</span>
            </div>
            <div className="p-6 sm:p-8 lg:p-10">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sunken text-ink" aria-hidden>
                <Bell className="h-6 w-6" />
              </span>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-muted">Kabar peminjaman</p>
              <h2 className="mt-2 max-w-3xl text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">Rincian notifikasi</h2>
              <p className="mt-5 max-w-3xl whitespace-pre-wrap text-base leading-7 text-ink">{selected.pesan}</p>
              <div className="mt-8 flex flex-wrap gap-3 border-t border-line pt-6">
                {!selected.dibaca && (
                  <button className="btn-primary" onClick={() => baca(selected)}>
                    <Check className="h-4 w-4" aria-hidden /> Tandai dibaca
                  </button>
                )}
                <Link to="/riwayat" className="btn-quiet">Lihat riwayat peminjaman <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              </div>
            </div>
          </article>
        )
      ) : loading ? <ListSkeleton rows={4} /> : error ? <ErrorState error={error} onRetry={reload} /> : list.length === 0 ? (
        <EmptyState title="Belum ada notifikasi">Kabar soal permintaanmu akan muncul di sini.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {list.map((notification) => (
            <li key={notification.id}>
              <Link to={`/notifikasi/${notification.id}`} className="flex items-start gap-3 rounded-2xl border border-line/80 bg-surface p-4 shadow-[0_8px_26px_rgba(30,32,30,0.035)] transition-all hover:-translate-y-0.5 hover:border-[#697565]/50 hover:shadow-[0_12px_30px_rgba(30,32,30,0.08)] sm:gap-4 sm:p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sunken text-ink" aria-hidden>
                  <Bell className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    {!notification.dibaca && <span className="h-2 w-2 rounded-full bg-[#697565]" aria-label="Belum dibaca" />}
                    <span className={`text-sm leading-snug ${notification.dibaca ? 'text-muted' : 'font-semibold text-ink'}`}>
                      {notification.pesan}
                    </span>
                  </span>
                  <span className="mt-1.5 block text-xs text-muted">{waktuLalu(notification.dibuat)}</span>
                </span>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
