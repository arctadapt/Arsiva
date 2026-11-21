import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import { api } from '../lib/api.js'
import { useFetch, refreshCounts } from '../lib/hooks.js'
import { waktuLalu } from '../lib/format.js'
import { useToast } from '../context/ToastContext.jsx'
import AssetTag from '../components/AssetTag.jsx'
import Modal from '../components/Modal.jsx'
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '../components/ui.jsx'

const DURASI = [
  { v: 1, t: '1 hari' },
  { v: 3, t: '3 hari' },
  { v: 7, t: '7 hari' },
  { v: 14, t: '14 hari' },
  { v: 30, t: '30 hari' },
]
const ALASAN_CEPAT = ['Stok tidak cukup', 'Sedang dipakai kegiatan lain', 'Jadwal bentrok']

/** Mengembalikan pesan kendala bila permintaan tidak bisa disetujui saat ini. */
function kendala(r) {
  if (r.jenis === 'barang' && r.stok_sekarang < r.jumlah) {
    return `Stok ${r.nama} tinggal ${r.stok_sekarang}, kurang dari yang diminta (${r.jumlah}).`
  }
  if (r.jenis === 'ruangan' && !r.ruangan_tersedia) return `${r.nama} sedang dipakai.`
  return null
}

function Keputusan({ action, onClose, onDone }) {
  const toast = useToast()
  const [durasi, setDurasi] = useState(7)
  const [alasan, setAlasan] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const r = action?.row
  const approve = action?.type === 'approve'
  const blocked = r ? kendala(r) : null

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (approve) await api.post(`/loans/requests/${r.id}/approve`, { durasi_hari: durasi })
      else await api.post(`/loans/requests/${r.id}/reject`, { alasan })
      toast.success(approve ? `Permintaan ${r.peminjam} disetujui.` : `Permintaan ${r.peminjam} ditolak.`)
      refreshCounts()
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={!!action}
      onClose={() => !busy && onClose()}
      title={r ? (approve ? `Setujui ${r.nama}?` : `Tolak permintaan ${r.peminjam}?`) : ''}
      footer={
        <>
          <button type="button" className="btn-quiet" onClick={onClose} disabled={busy}>Batal</button>
          <button type="submit" form="form-keputusan" className={approve ? 'btn-primary' : 'btn-danger'}
            disabled={busy || (approve && !!blocked) || (!approve && alasan.trim().length < 3)}>
            {busy ? 'Menyimpan...' : approve ? 'Setujui' : 'Tolak permintaan'}
          </button>
        </>
      }
    >
      {r && (
        <form id="form-keputusan" onSubmit={submit} className="space-y-4">
          <p>
            <strong>{r.peminjam}</strong> ({r.kelas}) meminta {r.nama}
            {r.jenis === 'barang' ? `, ${r.jumlah} buah` : ''}.
          </p>
          {approve ? (
            blocked ? (
              <p className="flex gap-2 rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />
                <span>{blocked} Tolak permintaan ini atau tunggu stok kembali.</span>
              </p>
            ) : (
              <div>
                <label htmlFor="durasi" className="label">Lama peminjaman</label>
                <select id="durasi" className="input" value={durasi} onChange={(e) => setDurasi(Number(e.target.value))} data-autofocus>
                  {DURASI.map((d) => <option key={d.v} value={d.v}>{d.t}</option>)}
                </select>
                <p className="hint">
                  {r.jenis === 'barang' ? `Stok ${r.nama} berkurang ${r.jumlah}.` : `${r.nama} ditandai sedang dipakai.`}
                </p>
              </div>
            )
          ) : (
            <div>
              <label htmlFor="alasan" className="label">Alasan penolakan</label>
              <textarea id="alasan" className="input min-h-24 resize-y" value={alasan} maxLength={300}
                onChange={(e) => setAlasan(e.target.value)} data-autofocus />
              <div className="mt-2 flex flex-wrap gap-2">
                {ALASAN_CEPAT.map((a) => (
                  <button key={a} type="button" onClick={() => setAlasan(a)}
                    className="rounded-full border border-line px-3 py-1 text-xs font-semibold hover:bg-sunken">
                    {a}
                  </button>
                ))}
              </div>
              <p className="hint">Alasan ini dikirim ke peminjam sebagai notifikasi.</p>
            </div>
          )}
          {error && <p role="alert" className="rounded-lg border border-bad/30 bg-bad/5 p-3 text-sm">{error}</p>}
        </form>
      )}
    </Modal>
  )
}

export default function Permintaan() {
  const req = useFetch('/loans/requests')
  const [action, setAction] = useState(null)
  const rows = req.data?.requests ?? []

  const done = () => { setAction(null); req.reload() }

  return (
    <>
      <PageHeader title="Permintaan" description="Permintaan peminjaman yang menunggu keputusan, dari yang paling lama menunggu." />

      {req.loading ? <ListSkeleton rows={4} /> : req.error ? <ErrorState error={req.error} onRetry={req.reload} /> : rows.length === 0 ? (
        <EmptyState title="Semua permintaan sudah diputuskan"
          action={<Link to="/riwayat" className="btn-quiet btn-sm">Lihat riwayat</Link>}>
          Permintaan baru dari siswa akan muncul di sini.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {rows.map((r) => {
            const masalah = kendala(r)
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
                <AssetTag jenis={r.jenis} id={r.item_id} />
                <div className="min-w-0 flex-1 basis-48">
                  <p className="font-semibold">{r.nama}{r.jenis === 'barang' ? `, ${r.jumlah} buah` : ''}</p>
                  <p className="text-sm text-muted">{r.peminjam}, {r.kelas}. Diajukan {waktuLalu(r.diajukan)}</p>
                  {masalah && <p className="mt-1 text-sm font-semibold text-warn">{masalah}</p>}
                </div>
                <div className="flex gap-2">
                  <button className="btn-quiet btn-sm" onClick={() => setAction({ type: 'reject', row: r })}>Tolak</button>
                  <button className="btn-primary btn-sm" onClick={() => setAction({ type: 'approve', row: r })}>Setujui</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Keputusan key={action ? `${action.type}${action.row.id}` : 'none'} action={action} onClose={() => setAction(null)} onDone={done} />
    </>
  )
}
