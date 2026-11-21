import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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

  return (
    <>
      <PageHeader
        title="Riwayat"
        description={admin ? 'Seluruh peminjaman di sekolah, dari yang terbaru.' : 'Semua permintaan dan peminjamanmu, dari yang terbaru.'}
      />

      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Saring berdasarkan status">
        {FILTERS.map((f) => (
          <button key={f.value} onClick={() => setFilter(f.value)} aria-pressed={filter === f.value}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              filter === f.value ? 'border-primary bg-primary text-on-primary' : 'border-line bg-surface hover:bg-sunken'
            }`}>
            {f.label}
            {!loading && <span className="ml-1.5 font-medium opacity-70">{count(f.value)}</span>}
          </button>
        ))}
      </div>

      {loading ? <ListSkeleton rows={5} /> : error ? <ErrorState error={error} onRetry={reload} /> : rows.length === 0 ? (
        <EmptyState
          title={filter === 'semua' ? 'Belum ada riwayat' : `Tidak ada yang berstatus ${STATUS[filter === 'aktif' ? 'dipinjam' : filter].label.toLowerCase()}`}
          action={filter === 'semua' ? <Link to="/katalog" className="btn-primary btn-sm">Ajukan peminjaman</Link> : null}
        >
          {filter === 'semua' ? 'Peminjaman yang kamu ajukan akan tercatat di sini.' : 'Coba pilih status lain.'}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {rows.map((r) => (
            <li key={r.key} className="p-4">
              <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                <AssetTag jenis={r.jenis} id={r.item_id} />
                <p className="min-w-0 flex-1 basis-40 font-semibold">
                  {r.nama ?? 'Item dihapus'}{r.jenis === 'barang' && r.jumlah > 1 ? `, ${r.jumlah} buah` : ''}
                </p>
                <StatusBadge status={r.status} />
              </div>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-3 sm:pl-[5.5rem]">
                <Detail row={r} admin={admin} />
                <div>
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
