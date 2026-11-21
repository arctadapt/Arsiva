import { api } from '../lib/api.js'
import { useFetch, refreshCounts } from '../lib/hooks.js'
import { waktuLalu } from '../lib/format.js'
import { useToast } from '../context/ToastContext.jsx'
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '../components/ui.jsx'

export default function Notifikasi() {
  const { data, loading, error, reload } = useFetch('/notifications')
  const toast = useToast()
  const list = data?.notifications ?? []

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
      <PageHeader title="Notifikasi" description="Keputusan admin dan kabar peminjaman untukmu.">
        {data?.belum_dibaca > 0 && <button className="btn-quiet btn-sm" onClick={bacaSemua}>Tandai semua dibaca</button>}
      </PageHeader>

      {loading ? <ListSkeleton rows={4} /> : error ? <ErrorState error={error} onRetry={reload} /> : list.length === 0 ? (
        <EmptyState title="Belum ada notifikasi">Kabar soal permintaanmu akan muncul di sini.</EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {list.map((n) => (
            <li key={n.id}>
              <button onClick={() => baca(n)} disabled={n.dibaca}
                className={`flex w-full items-start gap-3 p-4 text-left transition-colors ${n.dibaca ? 'cursor-default' : 'hover:bg-sunken'}`}>
                <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${n.dibaca ? 'bg-transparent' : 'bg-tag'}`} aria-hidden />
                <span className="flex-1">
                  <span className={`block text-[15px] leading-snug ${n.dibaca ? 'text-muted' : 'font-semibold'}`}>
                    {!n.dibaca && <span className="sr-only">Belum dibaca: </span>}
                    {n.pesan}
                  </span>
                  <span className="mt-1 block text-xs text-muted">{waktuLalu(n.dibuat)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
