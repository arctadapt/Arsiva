import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Minus, Plus, Search } from 'lucide-react'
import { api } from '../lib/api.js'
import { useFetch, refreshCounts } from '../lib/hooks.js'
import { isAdmin } from '../lib/format.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import AssetTag from '../components/AssetTag.jsx'
import Modal from '../components/Modal.jsx'
import { EmptyState, ErrorState, ListSkeleton, PageHeader, Tabs } from '../components/ui.jsx'

function BorrowDialog({ target, onClose, onDone }) {
  const toast = useToast()
  const [jumlah, setJumlah] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const item = target?.item
  const isBarang = target?.jenis === 'barang'

  async function submit() {
    setBusy(true)
    setError('')
    try {
      await api.post('/loans/requests', { jenis: target.jenis, id: item.id, jumlah: isBarang ? jumlah : undefined })
      toast.success('Permintaan terkirim. Kamu akan dapat notifikasi saat admin memutuskan.')
      refreshCounts()
      onDone()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={!!target}
      onClose={() => !busy && onClose()}
      title={item ? `Pinjam ${item.nama}` : ''}
      footer={
        <>
          <button className="btn-quiet" onClick={onClose} disabled={busy}>Batal</button>
          <button className="btn-primary" onClick={submit} disabled={busy}>{busy ? 'Mengirim...' : 'Kirim permintaan'}</button>
        </>
      }
    >
      {item && (
        <div className="space-y-4">
          <AssetTag jenis={target.jenis} id={item.id} />
          {isBarang ? (
            <div>
              <label htmlFor="jumlah" className="label">Jumlah</label>
              <div className="flex items-center gap-2">
                <button type="button" className="btn-quiet px-3" onClick={() => setJumlah((j) => Math.max(1, j - 1))} disabled={jumlah <= 1} aria-label="Kurangi jumlah">
                  <Minus className="h-4 w-4" />
                </button>
                <input id="jumlah" type="number" inputMode="numeric" min={1} max={item.stok} value={jumlah} data-autofocus
                  onChange={(e) => setJumlah(Math.min(item.stok, Math.max(1, Number(e.target.value) || 1)))}
                  className="input w-20 text-center" />
                <button type="button" className="btn-quiet px-3" onClick={() => setJumlah((j) => Math.min(item.stok, j + 1))} disabled={jumlah >= item.stok} aria-label="Tambah jumlah">
                  <Plus className="h-4 w-4" />
                </button>
                <span className="text-sm text-muted">dari {item.stok} tersedia</span>
              </div>
            </div>
          ) : (
            <p>Kamu meminta pemakaian ruangan ini. Ruangan dianggap terpakai sampai pengembaliannya dicatat.</p>
          )}
          <p className="text-sm text-muted">Admin akan meninjau permintaanmu dan menentukan lama peminjaman.</p>
          {error && <p role="alert" className="rounded-lg border border-bad/30 bg-bad/5 p-3 text-sm">{error}</p>}
        </div>
      )}
    </Modal>
  )
}

export default function Katalog() {
  const { user } = useAuth()
  const admin = isAdmin(user)
  const items = useFetch('/catalog/items')
  const rooms = useFetch('/catalog/rooms')
  const [tab, setTab] = useState('barang')
  const [q, setQ] = useState('')
  const [onlyFree, setOnlyFree] = useState(false)
  const [target, setTarget] = useState(null)

  const source = tab === 'barang' ? items : rooms
  const rows = useMemo(() => {
    const list = (tab === 'barang' ? items.data?.items : rooms.data?.rooms) ?? []
    const needle = q.trim().toLowerCase()
    return list.filter((r) => {
      if (needle && !`${r.nama} ${r.tipe}`.toLowerCase().includes(needle)) return false
      if (onlyFree && (tab === 'barang' ? r.stok < 1 : !r.tersedia)) return false
      return true
    })
  }, [tab, q, onlyFree, items.data, rooms.data])

  const done = () => { setTarget(null); items.reload(); rooms.reload() }

  return (
    <>
      <PageHeader title="Katalog" description="Semua barang dan ruangan yang bisa dipinjam. Pilih satu untuk mengajukan peminjaman." />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Tabs label="Jenis" value={tab} onChange={setTab} items={[{ value: 'barang', label: 'Barang' }, { value: 'ruangan', label: 'Ruangan' }]} />
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input className="input pl-9" type="search" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={tab === 'barang' ? 'Cari barang' : 'Cari ruangan'} aria-label="Cari di katalog" />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--primary))]" checked={onlyFree} onChange={(e) => setOnlyFree(e.target.checked)} />
          Hanya yang tersedia
        </label>
      </div>

      {source.loading ? <ListSkeleton rows={5} /> : source.error ? <ErrorState error={source.error} onRetry={source.reload} /> : rows.length === 0 ? (
        <EmptyState
          title={q || onlyFree ? 'Tidak ada yang cocok' : tab === 'barang' ? 'Belum ada barang' : 'Belum ada ruangan'}
          action={!q && !onlyFree && admin ? <Link to="/kelola" className="btn-primary btn-sm">Tambah di Kelola inventaris</Link> : null}
        >
          {q || onlyFree ? 'Coba kata kunci lain atau matikan filter.' : admin ? 'Tambahkan yang pertama agar bisa dipinjam.' : 'Admin belum menambahkan data ke katalog.'}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {rows.map((r) => {
            const free = tab === 'barang' ? r.stok > 0 : r.tersedia
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
                <AssetTag jenis={tab} id={r.id} />
                <div className="min-w-0 flex-1 basis-40">
                  <p className="font-semibold">{r.nama}</p>
                  <p className="text-sm text-muted">{r.tipe}</p>
                </div>
                <p className={`text-sm font-semibold ${free ? 'text-ok' : 'text-muted'}`}>
                  {tab === 'barang' ? (free ? `Stok ${r.stok}` : 'Habis') : free ? 'Tersedia' : 'Sedang dipakai'}
                </p>
                <button className="btn-primary btn-sm" disabled={!free} onClick={() => setTarget({ jenis: tab, item: r })}
                  aria-label={`Ajukan pinjam ${r.nama}`}>
                  Ajukan pinjam
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <BorrowDialog key={target?.item?.id ?? 'none'} target={target} onClose={() => setTarget(null)} onDone={done} />
    </>
  )
}
