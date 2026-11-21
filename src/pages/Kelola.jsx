import { useState } from 'react'
import { api } from '../lib/api.js'
import { useFetch } from '../lib/hooks.js'
import { useToast } from '../context/ToastContext.jsx'
import AssetTag from '../components/AssetTag.jsx'
import { EmptyState, ErrorState, ListSkeleton, PageHeader, Tabs } from '../components/ui.jsx'

const KATEGORI_BARANG = ['Olahraga', 'Elektronik', 'Praktik', 'Alat tulis', 'Umum']
const JENIS_RUANGAN = ['Kelas', 'Laboratorium', 'Aula', 'Bengkel']

function ItemRow({ item, onSaved }) {
  const toast = useToast()
  const [stok, setStok] = useState(String(item.stok))
  const [busy, setBusy] = useState(false)
  const changed = stok !== '' && Number(stok) !== item.stok

  async function save() {
    setBusy(true)
    try {
      await api.patch(`/catalog/items/${item.id}`, { stok: Number(stok) })
      toast.success(`Stok ${item.nama} diperbarui menjadi ${stok}.`)
      onSaved()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
      <AssetTag jenis="barang" id={item.id} />
      <div className="min-w-0 flex-1 basis-40">
        <p className="font-semibold">{item.nama}</p>
        <p className="text-sm text-muted">{item.tipe}</p>
      </div>
      <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (changed) save() }}>
        <label htmlFor={`stok-${item.id}`} className="text-sm text-muted">Stok</label>
        <input id={`stok-${item.id}`} type="number" inputMode="numeric" min={0} className="input w-24 py-2 text-center"
          value={stok} onChange={(e) => setStok(e.target.value)} />
        <button className="btn-primary btn-sm" disabled={!changed || busy}>{busy ? 'Menyimpan...' : 'Simpan'}</button>
      </form>
    </li>
  )
}

function RoomRow({ room, onSaved }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  async function toggle() {
    setBusy(true)
    try {
      await api.patch(`/catalog/rooms/${room.id}`, { tersedia: !room.tersedia })
      toast.success(`${room.nama} ditandai ${room.tersedia ? 'tidak tersedia' : 'tersedia'}.`)
      onSaved()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
      <AssetTag jenis="ruangan" id={room.id} />
      <div className="min-w-0 flex-1 basis-40">
        <p className="font-semibold">{room.nama}</p>
        <p className="text-sm text-muted">{room.tipe}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-sm font-semibold ${room.tersedia ? 'text-ok' : 'text-muted'}`}>
          {room.tersedia ? 'Tersedia' : 'Tidak tersedia'}
        </span>
        <button role="switch" aria-checked={room.tersedia} aria-label={`Ruangan ${room.nama} tersedia`} onClick={toggle} disabled={busy}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${room.tersedia ? 'bg-ok' : 'bg-line'}`}>
          <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${room.tersedia ? 'translate-x-5' : ''}`} />
        </button>
      </div>
    </li>
  )
}

function AddForm({ tab, onAdded }) {
  const toast = useToast()
  const [nama, setNama] = useState('')
  const [tipe, setTipe] = useState('')
  const [stok, setStok] = useState('1')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const barang = tab === 'barang'

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (barang) await api.post('/catalog/items', { nama, tipe: tipe || undefined, stok: Number(stok) })
      else await api.post('/catalog/rooms', { nama, tipe: tipe || undefined })
      toast.success(`${nama} ditambahkan ke katalog.`)
      setNama(''); setTipe(''); setStok('1')
      onAdded()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const listId = `opsi-${tab}`
  return (
    <form onSubmit={submit} className="mb-8 rounded-xl border border-line bg-surface p-5">
      <h2 className="mb-4 text-base font-bold">{barang ? 'Tambah barang' : 'Tambah ruangan'}</h2>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_6rem_auto] sm:items-end">
        <div>
          <label htmlFor="add-nama" className="label">{barang ? 'Nama barang' : 'Nama ruangan'}</label>
          <input id="add-nama" className="input" value={nama} onChange={(e) => setNama(e.target.value)} required maxLength={barang ? 255 : 100} />
        </div>
        <div>
          <label htmlFor="add-tipe" className="label">{barang ? 'Kategori' : 'Jenis'}</label>
          <input id="add-tipe" className="input" list={listId} value={tipe} onChange={(e) => setTipe(e.target.value)}
            placeholder={barang ? 'Umum' : 'Kelas'} maxLength={100} />
          <datalist id={listId}>{(barang ? KATEGORI_BARANG : JENIS_RUANGAN).map((o) => <option key={o} value={o} />)}</datalist>
        </div>
        {barang && (
          <div>
            <label htmlFor="add-stok" className="label">Stok</label>
            <input id="add-stok" type="number" inputMode="numeric" min={0} className="input text-center" value={stok}
              onChange={(e) => setStok(e.target.value)} required />
          </div>
        )}
        <button className="btn-primary" disabled={busy}>{busy ? 'Menambah...' : 'Tambahkan'}</button>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg border border-bad/30 bg-bad/5 p-3 text-sm">{error}</p>}
    </form>
  )
}

export default function Kelola() {
  const items = useFetch('/catalog/items')
  const rooms = useFetch('/catalog/rooms')
  const [tab, setTab] = useState('barang')
  const source = tab === 'barang' ? items : rooms
  const list = (tab === 'barang' ? items.data?.items : rooms.data?.rooms) ?? []

  return (
    <>
      <PageHeader title="Kelola inventaris" description="Tambah barang dan ruangan, atur stok, dan tandai ruangan yang sedang tidak bisa dipinjam." />
      <div className="mb-6">
        <Tabs label="Jenis" value={tab} onChange={setTab} items={[{ value: 'barang', label: 'Barang' }, { value: 'ruangan', label: 'Ruangan' }]} />
      </div>

      <AddForm key={tab} tab={tab} onAdded={source.reload} />

      {source.loading ? <ListSkeleton rows={4} /> : source.error ? <ErrorState error={source.error} onRetry={source.reload} /> : list.length === 0 ? (
        <EmptyState title={tab === 'barang' ? 'Belum ada barang' : 'Belum ada ruangan'}>
          Gunakan formulir di atas untuk menambahkan yang pertama.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {tab === 'barang'
            ? list.map((i) => <ItemRow key={`${i.id}-${i.stok}`} item={i} onSaved={items.reload} />)
            : list.map((r) => <RoomRow key={r.id} room={r} onSaved={rooms.reload} />)}
        </ul>
      )}
    </>
  )
}
