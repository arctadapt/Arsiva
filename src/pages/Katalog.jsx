import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, DoorOpen, Minus, Package, Plus, Search, SlidersHorizontal, Sparkles } from 'lucide-react'
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
  const [tanggalMulai, setTanggalMulai] = useState('')
  const [tanggalSelesai, setTanggalSelesai] = useState('')
  const [keperluan, setKeperluan] = useState('')
  const [catatan, setCatatan] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const item = target?.item
  const isBarang = target?.jenis === 'barang'

  async function submit() {
    if (!isBarang && (!tanggalMulai || !tanggalSelesai ||
      new Date(tanggalMulai) >= new Date(tanggalSelesai) ||
      new Date(tanggalMulai) <= new Date() || keperluan.trim().length < 3)) {
      setError('Isi jadwal yang valid dan keperluan minimal 3 karakter.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await api.post('/loans/requests', { jenis: target.jenis, id: item.id,
        jumlah: isBarang ? jumlah : undefined,
        ...(!isBarang ? {tanggal_mulai: new Date(tanggalMulai).toISOString(),
          tanggal_selesai: new Date(tanggalSelesai).toISOString(),keperluan,catatan} : {}) })
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
            <div className="space-y-3">
              <p>Permintaan ruangan memerlukan konfirmasi PIC kelas sebelum keputusan admin.</p>
              <label className="label" htmlFor="mulai">Mulai</label>
              <input id="mulai" type="datetime-local" className="input" value={tanggalMulai} onChange={e=>setTanggalMulai(e.target.value)} />
              <label className="label" htmlFor="selesai">Selesai</label>
              <input id="selesai" type="datetime-local" className="input" value={tanggalSelesai} onChange={e=>setTanggalSelesai(e.target.value)} />
              <label className="label" htmlFor="keperluan">Keperluan</label>
              <textarea id="keperluan" className="input" maxLength={500} value={keperluan} onChange={e=>setKeperluan(e.target.value)} />
              <label className="label" htmlFor="catatan">Catatan (opsional)</label>
              <textarea id="catatan" className="input" maxLength={500} value={catatan} onChange={e=>setCatatan(e.target.value)} />
            </div>
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

  const allItems = items.data?.items ?? []
  const allRooms = rooms.data?.rooms ?? []
  const itemCount = allItems.length
  const roomCount = allRooms.length
  const readyCount = tab === 'barang' ? allItems.filter((item) => item.stok > 0).length : allRooms.filter((room) => room.tersedia).length
  const AssetIcon = tab === 'barang' ? Package : DoorOpen

  return (
    <>
      <PageHeader title="Katalog inventaris" description="Temukan barang dan ruangan yang tersedia untuk kegiatan sekolah.">
        {admin && <Link to="/kelola" className="btn-quiet group">Kelola aset <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden /></Link>}
      </PageHeader>

      <section className="relative isolate mb-6 overflow-hidden rounded-[26px] bg-[#3C3D37] text-[#ECDFCC] sm:rounded-[30px]">
        <img src="/inventory-hero.png" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-right" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1E201E]/95 via-[#1E201E]/75 to-[#1E201E]/20" aria-hidden="true" />
        <div className="relative flex min-h-[210px] flex-col justify-between gap-7 p-6 sm:min-h-[235px] sm:flex-row sm:items-end sm:p-8">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Koleksi sekolah
            </span>
            <h2 className="mt-4 text-[28px] font-semibold leading-tight tracking-[-0.035em] text-white sm:text-[34px]">Cari yang kamu perlukan.</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/75">Lihat ketersediaan aset sebelum mengajukan peminjaman.</p>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <div className="min-w-[92px] rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-xs text-white/70">Barang</p>
              <p className="mt-1 text-2xl font-semibold text-white">{items.loading ? '—' : itemCount}</p>
            </div>
            <div className="min-w-[92px] rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-xs text-white/70">Ruangan</p>
              <p className="mt-1 text-2xl font-semibold text-white">{rooms.loading ? '—' : roomCount}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-line/80 bg-surface p-3 shadow-[0_8px_26px_rgba(30,32,30,0.035)] sm:p-4" aria-label="Filter katalog">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Tabs label="Jenis aset" value={tab} onChange={setTab} items={[{ value: 'barang', label: 'Barang' }, { value: 'ruangan', label: 'Ruangan' }]} />
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <input className="input rounded-xl bg-bg/60 pl-10" type="search" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={tab === 'barang' ? 'Cari nama atau kategori barang' : 'Cari nama atau jenis ruangan'} aria-label="Cari di katalog" />
          </div>
          <label className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 text-sm font-medium transition-colors ${onlyFree ? 'border-primary bg-sunken' : 'border-line bg-bg/50 hover:bg-sunken'}`}>
            <SlidersHorizontal className="h-4 w-4 text-muted" aria-hidden />
            <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--primary))]" checked={onlyFree} onChange={(e) => setOnlyFree(e.target.checked)} />
            Tersedia saja
          </label>
        </div>
      </section>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{tab === 'barang' ? 'Perlengkapan' : 'Ruang sekolah'}</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">{tab === 'barang' ? 'Daftar barang' : 'Daftar ruangan'}</h2>
        </div>
        <p className="text-sm text-muted">{source.loading ? 'Memuat…' : `${rows.length} hasil · ${readyCount} tersedia`}</p>
      </div>

      {source.loading ? <ListSkeleton rows={4} /> : source.error ? <ErrorState error={source.error} onRetry={source.reload} /> : rows.length === 0 ? (
        <EmptyState
          title={q || onlyFree ? 'Tidak ada yang cocok' : tab === 'barang' ? 'Belum ada barang' : 'Belum ada ruangan'}
          action={!q && !onlyFree && admin ? <Link to="/kelola" className="btn-primary btn-sm">Tambah di Kelola inventaris</Link> : null}
        >
          {q || onlyFree ? 'Coba kata kunci lain atau matikan filter.' : admin ? 'Tambahkan yang pertama agar bisa dipinjam.' : 'Admin belum menambahkan data ke katalog.'}
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {rows.map((r) => {
            const free = tab === 'barang' ? r.stok > 0 : r.tersedia
            return (
              <li key={r.id} className="group flex min-w-0 flex-col rounded-[24px] border border-line/80 bg-surface p-3.5 shadow-[0_8px_26px_rgba(30,32,30,0.035)] transition-all hover:-translate-y-0.5 hover:border-[#697565]/60 hover:shadow-[0_14px_34px_rgba(30,32,30,0.08)] sm:p-4">
                <div className="relative grid aspect-[1.65/1] place-items-center overflow-hidden rounded-[18px] bg-sunken">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(105,117,101,0.16),transparent_58%)]" aria-hidden="true" />
                  <span className="relative grid h-[76px] w-[76px] place-items-center rounded-[24px] border border-line/60 bg-surface/80 text-ink shadow-sm transition-transform group-hover:scale-105" aria-hidden>
                    <AssetIcon className="h-8 w-8" strokeWidth={1.5} />
                  </span>
                  <div className="absolute left-3 top-3"><AssetTag jenis={tab} id={r.id} /></div>
                  <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold ${free ? 'bg-[#1E201E] text-[#ECDFCC]' : 'bg-surface/90 text-muted'}`}>
                    {tab === 'barang' ? (free ? 'Tersedia' : 'Stok habis') : free ? 'Siap digunakan' : 'Sedang dipakai'}
                  </span>
                  <span className="absolute bottom-3 left-3 rounded-full border border-line/60 bg-surface/85 px-2.5 py-1 text-xs font-medium text-muted backdrop-blur">{r.tipe}</span>
                </div>
                <div className="flex flex-1 flex-col px-1 pt-4">
                  <h3 className="truncate text-lg font-semibold tracking-tight">{r.nama}</h3>
                  <p className="mt-1 text-sm text-muted">{tab === 'barang' ? `${r.stok} unit tercatat` : free ? 'Ruangan siap untuk digunakan' : 'Ruangan sedang digunakan'}</p>
                  <button className="btn-primary mt-4 w-full justify-between rounded-xl" disabled={!free} onClick={() => setTarget({ jenis: tab, item: r })}
                    aria-label={`Ajukan pinjam ${r.nama}`}>
                    Ajukan peminjaman <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <BorrowDialog key={target?.item?.id ?? 'none'} target={target} onClose={() => setTarget(null)} onDone={done} />
    </>
  )
}
