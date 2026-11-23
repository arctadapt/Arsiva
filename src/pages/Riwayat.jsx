import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, PackageOpen } from 'lucide-react'
import { api } from '../lib/api.js'
import { useFetch, refreshCounts } from '../lib/hooks.js'
import { STATUS, isAdmin, sisaWaktu, tgl, waktuLalu } from '../lib/format.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import AssetTag from '../components/AssetTag.jsx'
import Modal from '../components/Modal.jsx'
import ReturnButton from '../components/ReturnButton.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '../components/ui.jsx'

const FILTERS = [
  { value: 'semua', label: 'Semua' },
  { value: 'menunggu', label: 'Menunggu' },
  { value: 'aktif', label: 'Dipinjam' },
  { value: 'dikembalikan', label: 'Dikembalikan' },
  { value: 'ditolak', label: 'Ditolak' },
]

const matches = (row, f) =>
  f === 'semua' || (f === 'aktif' ? row.status === 'dipinjam' || row.status === 'terlambat' : row.status === f)

function CancelButton({ row, onDone }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  async function cancel() {
    setBusy(true)
    try {
      await api.del(`/loans/requests/${row.id}`)
      toast.success('Permintaan dibatalkan.')
      setOpen(false)
      refreshCounts()
      onDone()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button className="btn-quiet btn-sm" onClick={() => setOpen(true)}>Batalkan permintaan</button>
      <Modal open={open} onClose={() => !busy && setOpen(false)} title="Batalkan permintaan?"
        footer={
          <>
            <button className="btn-quiet" onClick={() => setOpen(false)} disabled={busy}>Tidak jadi</button>
            <button className="btn-danger" onClick={cancel} disabled={busy} data-autofocus>{busy ? 'Membatalkan...' : 'Ya, batalkan'}</button>
          </>
        }>
        Permintaan pinjam <strong>{row.nama}</strong> akan dihapus. Kamu bisa mengajukannya lagi kapan saja.
      </Modal>
    </>
  )
}

function Detail({ row, admin }) {
  const sisa = sisaWaktu(row.jatuh_tempo)
  return (
    <div className="space-y-0.5 text-sm text-muted">
      {admin && <p>{row.peminjam}, {row.kelas}</p>}
      {row.status === 'menunggu' && <p>Diajukan {waktuLalu(row.diajukan)}</p>}
      {(row.status === 'dipinjam' || row.status === 'terlambat') && (
        <p>
          Dipinjam {tgl(row.tanggal_pinjam)}
          {row.jatuh_tempo && <>, batas kembali {tgl(row.jatuh_tempo)}</>}
          {sisa && <span className={sisa.telat ? 'font-semibold text-bad' : ''}>{`. ${sisa.teks}`}</span>}
        </p>
      )}
      {row.status === 'dikembalikan' && <p>Dipinjam {tgl(row.tanggal_pinjam)}, dikembalikan {tgl(row.tanggal_kembali)}</p>}
      {row.status === 'ditolak' && (
        <>
          <p>Diajukan {tgl(row.tanggal_pinjam)}</p>
          {row.alasan && <p className="text-ink">Alasan: {row.alasan}</p>}
        </>
      )}
    </div>
  )
}

export default function Riwayat() {
  const { user } = useAuth()
  const admin = isAdmin(user)
  const loans = useFetch('/loans')
  const requests = useFetch('/loans/requests')
  const [filter, setFilter] = useState('semua')

  const all = useMemo(() => {
    const pending = (requests.data?.requests ?? []).map((r) => ({ ...r, key: `q${r.id}`, tanggal_pinjam: r.diajukan }))
    const done = (loans.data?.loans ?? []).map((l) => ({ ...l, key: `p${l.id}` }))
    return [...pending, ...done]
  }, [requests.data, loans.data])

  const rows = all.filter((r) => matches(r, filter))
  const count = (f) => all.filter((r) => matches(r, f)).length
  const loading = loans.loading || requests.loading
  const error = loans.error || requests.error
  const reload = () => { loans.reload(); requests.reload() }

  const summary = [
    { label: 'Semua aktivitas', value: all.length, style: 'text-ink' },
    { label: 'Menunggu', value: count('menunggu'), style: 'text-ink' },
    { label: 'Sedang dipinjam', value: count('aktif'), style: 'text-ink' },
    { label: 'Dikembalikan', value: count('dikembalikan'), style: 'text-ok' },
  ]

  return (
    <>
      <PageHeader
        title="Aktivitas peminjaman"
        description={admin ? 'Pantau semua permintaan dan pergerakan aset sekolah.' : 'Semua permintaan dan peminjamanmu tersimpan di satu tempat.'}
      >
        <Link to="/katalog" className="btn-primary group">Lihat katalog <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden /></Link>
      </PageHeader>

      <dl className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {summary.map((item, index) => (
          <div key={item.label} className="rounded-2xl border border-line/80 bg-surface p-4 shadow-[0_8px_26px_rgba(30,32,30,0.035)] sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-xs font-medium text-muted sm:text-sm">{item.label}</dt>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-sunken text-muted" aria-hidden>
                <PackageOpen className="h-4 w-4" />
              </span>
            </div>
            <dd className={`mt-3 text-[30px] font-semibold leading-none tracking-tight ${item.style}`}>{loading ? '—' : item.value}</dd>
            <p className="mt-2 text-xs text-muted">{index === 0 ? 'Catatan peminjaman' : index === 1 ? 'Menanti keputusan' : index === 2 ? 'Masih berlangsung' : 'Selesai dicatat'}</p>
          </div>
        ))}
      </dl>

      <section className="mb-5 rounded-2xl border border-line/80 bg-surface p-3 shadow-[0_8px_26px_rgba(30,32,30,0.035)] sm:p-4" aria-label="Filter riwayat">
        <div className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Saring berdasarkan status</div>
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Saring berdasarkan status">
          {FILTERS.map((f) => (
            <button key={f.value} onClick={() => setFilter(f.value)} aria-pressed={filter === f.value}
              className={`shrink-0 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors ${
                filter === f.value ? 'border-primary bg-primary text-on-primary' : 'border-line bg-bg/50 text-muted hover:bg-sunken hover:text-ink'
              }`}>
              {f.label}
              {!loading && <span className="ml-1.5 font-medium opacity-70">{count(f.value)}</span>}
            </button>
          ))}
        </div>
      </section>

      {loading ? <ListSkeleton rows={5} /> : error ? <ErrorState error={error} onRetry={reload} /> : rows.length === 0 ? (
        <EmptyState
          title={filter === 'semua' ? 'Belum ada riwayat' : `Tidak ada yang berstatus ${STATUS[filter === 'aktif' ? 'dipinjam' : filter].label.toLowerCase()}`}
          action={filter === 'semua' ? <Link to="/katalog" className="btn-primary btn-sm">Ajukan peminjaman</Link> : null}
        >
          {filter === 'semua' ? 'Peminjaman yang kamu ajukan akan tercatat di sini.' : 'Coba pilih status lain.'}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.key} className="rounded-2xl border border-line/80 bg-surface p-4 shadow-[0_8px_26px_rgba(30,32,30,0.035)] transition-shadow hover:shadow-[0_14px_34px_rgba(30,32,30,0.07)] sm:p-5">
              <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sunken text-ink sm:h-12 sm:w-12" aria-hidden>
                  <PackageOpen className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 font-semibold leading-snug">
                      {r.nama ?? 'Item dihapus'}{r.jenis === 'barang' && r.jumlah > 1 ? `, ${r.jumlah} buah` : ''}
                    </p>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <AssetTag jenis={r.jenis} id={r.item_id} />
                    {r.jenis && <span className="text-xs font-medium capitalize text-muted">{r.jenis}</span>}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-end sm:justify-between">
                <Detail row={r} admin={admin} />
                <div className="flex flex-wrap gap-2">
                  {r.status === 'menunggu' && r.peminjam === user.nama && <CancelButton row={r} onDone={reload} />}
                  {(r.status === 'dipinjam' || r.status === 'terlambat') && <ReturnButton loan={r} onDone={reload} />}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
