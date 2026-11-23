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

function normalizeWhatsAppNumber(value) {
  let number = value.replace(/\D/g, '')
  if (number.startsWith('00')) number = number.slice(2)
  if (number.startsWith('0')) number = `62${number.slice(1)}`
  else if (number.startsWith('8')) number = `62${number}`
  return number
}

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
  const [nomorWhatsApp, setNomorWhatsApp] = useState('')
  const [alasan, setAlasan] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const r = action?.row
  const approve = action?.type === 'approve'
  const blocked = r ? kendala(r) : null

  async function submit(e) {
    e.preventDefault()
    setError('')

    const needsWhatsApp = approve && r?.jenis === 'ruangan'
    const phone = needsWhatsApp ? normalizeWhatsAppNumber(nomorWhatsApp) : ''
    if (needsWhatsApp && !/^[1-9]\d{7,14}$/.test(phone)) {
      setError('Masukkan nomor WhatsApp yang valid, termasuk kode negara. Nomor Indonesia 08 akan disesuaikan ke 62.')
      return
    }

    const batasKembali = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' })
      .format(new Date(Date.now() + durasi * 86_400_000))
    const pesanWhatsApp = `Halo Bapak/Ibu penanggung jawab kelas ${r?.kelas || 'terkait'}. Permintaan peminjaman ruangan ${r?.nama} oleh ${r?.peminjam} telah disetujui selama ${durasi} hari, sampai ${batasKembali}. Terima kasih.`
    const urlWhatsApp = needsWhatsApp ? `https://wa.me/${phone}?text=${encodeURIComponent(pesanWhatsApp)}` : ''
    let tabWhatsApp = null

    if (needsWhatsApp) {
      tabWhatsApp = window.open('about:blank', '_blank')
      if (tabWhatsApp) tabWhatsApp.opener = null
    }

    setBusy(true)
    try {
      if (approve) await api.post(`/loans/requests/${r.id}/approve`, { durasi_hari: durasi })
      else await api.post(`/loans/requests/${r.id}/reject`, { alasan })
      toast.success(approve ? `Permintaan ${r.peminjam} disetujui.` : `Permintaan ${r.peminjam} ditolak.`)
      refreshCounts()
      onDone()
      if (needsWhatsApp) {
        if (tabWhatsApp) tabWhatsApp.location.href = urlWhatsApp
        else window.location.assign(urlWhatsApp)
      }
    } catch (err) {
      tabWhatsApp?.close()
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
            {busy ? 'Menyimpan...' : approve ? (r?.jenis === 'ruangan' ? 'Setujui & buka WhatsApp' : 'Setujui permintaan') : 'Tolak permintaan'}
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
              <>
                <div>
                  <label htmlFor="durasi" className="label">Lama peminjaman</label>
                  <select id="durasi" className="input" value={durasi} onChange={(e) => setDurasi(Number(e.target.value))} data-autofocus>
                    {DURASI.map((d) => <option key={d.v} value={d.v}>{d.t}</option>)}
                  </select>
                  <p className="hint">
                    {r.jenis === 'barang' ? `Stok ${r.nama} berkurang ${r.jumlah}.` : `${r.nama} ditandai sedang dipakai.`}
                  </p>
                </div>
                {r.jenis === 'ruangan' && (
                  <div>
                    <label htmlFor="nomor-wa" className="label">Nomor WhatsApp penanggung jawab kelas</label>
                    <input id="nomor-wa" type="tel" inputMode="tel" autoComplete="tel" className="input"
                      value={nomorWhatsApp} onChange={(e) => setNomorWhatsApp(e.target.value)}
                      placeholder="0812 3456 7890" maxLength={24} aria-describedby="nomor-wa-bantuan" />
                    <p id="nomor-wa-bantuan" className="hint">Boleh masukkan nomor lokal 08… atau format internasional +62…</p>
                  </div>
                )}
              </>
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

function ClassWorkflow({action,onClose,onDone}) {
  const r=action?.row
  const toast=useToast()
  const [phone,setPhone]=useState(r?.pic_phone||'')
  const [decision,setDecision]=useState('APPROVED')
  const [notes,setNotes]=useState('')
  const [reason,setReason]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const status=r?.workflow_status||'PENDING_ADMIN_CONTACT'
  async function submit(e) {
    e.preventDefault();setError('');setBusy(true)
    let tab=null
    try {
      if(action.type==='contact') {
        const normalized=normalizeWhatsAppNumber(phone)
        if(!/^628[0-9]{7,12}$/.test(normalized)) throw new Error('Nomor PIC harus format Indonesia yang valid.')
        tab=window.open('about:blank','_blank')
        if(tab)tab.opener=null
        const result=await api.post(`/loans/requests/${r.id}/contact-pic`,{phone:normalized})
        if(tab)tab.location.href=result.url
        else window.location.assign(result.url)
      } else if(action.type==='pic') {
        await api.post(`/loans/requests/${r.id}/pic-decision`,{decision,notes})
      } else if(action.type==='approve') {
        await api.post(`/loans/requests/${r.id}/approve`,{})
      } else {
        await api.post(`/loans/requests/${r.id}/reject`,{alasan:reason})
      }
      toast.success('Perubahan permintaan kelas tersimpan.')
      refreshCounts();onDone()
    } catch(err) {tab?.close();setError(err.message)}
    finally {setBusy(false)}
  }
  return <Modal open={!!action} onClose={()=>!busy&&onClose()} title={r?`${r.nama} — ${r.peminjam}`:''}
    footer={<><button className="btn-quiet" onClick={onClose} disabled={busy}>Batal</button>
      <button className="btn-primary" form="class-workflow" type="submit" disabled={busy}>{busy?'Menyimpan...':'Lanjutkan'}</button></>}>
    {r&&<form id="class-workflow" onSubmit={submit} className="space-y-3">
      <p className="text-sm text-muted">{new Date(r.tanggal_mulai).toLocaleString('id-ID')} – {new Date(r.tanggal_selesai).toLocaleString('id-ID')}</p>
      <p>Keperluan: {r.keperluan}</p>
      {r.catatan&&<p>Catatan: {r.catatan}</p>}
      <p className="text-sm">Status: {status.replaceAll('_',' ')}</p>
      {action.type==='contact'&&<><label className="label" htmlFor="pic-phone">Nomor WhatsApp PIC</label>
        <input id="pic-phone" className="input" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="081234567890" required />
        <p className="hint">WhatsApp dibuka setelah dicatat. Admin tetap harus mengirim pesan secara manual.</p></>}
      {action.type==='pic'&&<><label className="label" htmlFor="pic-decision">Konfirmasi PIC</label>
        <select id="pic-decision" className="input" value={decision} onChange={e=>setDecision(e.target.value)}>
          <option value="APPROVED">PIC menyetujui</option><option value="REJECTED">PIC menolak</option></select>
        <label className="label" htmlFor="pic-notes">Catatan konfirmasi</label>
        <textarea id="pic-notes" className="input" value={notes} onChange={e=>setNotes(e.target.value)} maxLength={500}/></>}
      {action.type==='reject'&&<><label className="label" htmlFor="class-reason">Alasan penolakan</label>
        <textarea id="class-reason" className="input" required minLength={3} maxLength={300} value={reason} onChange={e=>setReason(e.target.value)}/></>}
      {action.type==='approve'&&<p>Konfirmasi PIC sudah disetujui. Lanjutkan keputusan akhir admin?</p>}
      {error&&<p role="alert" className="text-bad text-sm">{error}</p>}
    </form>}
  </Modal>
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
                  {r.jenis==='ruangan'&&<p className="mt-1 text-xs text-muted">{(r.workflow_status||'PENDING_ADMIN_CONTACT').replaceAll('_',' ')} · {r.keperluan}</p>}
                  {masalah && <p className="mt-1 text-sm font-semibold text-warn">{masalah}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.jenis==='ruangan' ? <>
                    {(!r.workflow_status||['PENDING_ADMIN_CONTACT','WAITING_FOR_PIC'].includes(r.workflow_status))&&
                      <button className="btn-quiet btn-sm" onClick={()=>setAction({type:'contact',row:r})}>Hubungi PIC</button>}
                    {r.workflow_status==='WAITING_FOR_PIC'&&
                      <button className="btn-primary btn-sm" onClick={()=>setAction({type:'pic',row:r})}>Catat keputusan PIC</button>}
                    {r.workflow_status==='PIC_APPROVED'&&
                      <button className="btn-primary btn-sm" onClick={()=>setAction({type:'approve',row:r})}>Setujui</button>}
                    <button className="btn-quiet btn-sm" onClick={()=>setAction({type:'reject',row:r})}>Tolak</button>
                  </> : <>
                    <button className="btn-quiet btn-sm" onClick={() => setAction({ type: 'reject', row: r })}>Tolak</button>
                    <button className="btn-primary btn-sm" onClick={() => setAction({ type: 'approve', row: r })}>Setujui</button>
                  </>}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {action?.row?.jenis==='ruangan' ? <ClassWorkflow key={`${action.type}${action.row.id}`} action={action} onClose={()=>setAction(null)} onDone={done}/> : <Keputusan key={action ? `${action.type}${action.row.id}` : 'none'} action={action} onClose={() => setAction(null)} onDone={done} />}
    </>
  )
}
