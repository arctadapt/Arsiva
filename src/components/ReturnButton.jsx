import { useState } from 'react'
import { api } from '../lib/api.js'
import { refreshCounts } from '../lib/hooks.js'
import { useToast } from '../context/ToastContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import Modal from './Modal.jsx'

/** Tombol + dialog konfirmasi untuk mencatat pengembalian. */
export default function ReturnButton({ loan, onDone }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const { user } = useAuth()
  const mine = loan.peminjam === user?.nama

  async function confirm() {
    setBusy(true)
    try {
      await api.post(`/loans/${loan.id}/return`)
      toast.success(`${loan.nama} tercatat sudah dikembalikan.`)
      setOpen(false)
      refreshCounts()
      onDone?.()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  const detail = loan.jenis === 'ruangan'
    ? 'Ruangan akan tersedia lagi untuk dipinjam.'
    : `Stok ${loan.nama} bertambah ${loan.jumlah}.`

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-quiet btn-sm">Tandai dikembalikan</button>
      <Modal
        open={open}
        onClose={() => !busy && setOpen(false)}
        title="Catat pengembalian?"
        footer={
          <>
            <button className="btn-quiet" onClick={() => setOpen(false)} disabled={busy}>Batal</button>
            <button className="btn-primary" onClick={confirm} disabled={busy} data-autofocus>
              {busy ? 'Menyimpan...' : 'Ya, sudah dikembalikan'}
            </button>
          </>
        }
      >
        <p>
          {mine ? 'Kamu' : <strong>{loan.peminjam}</strong>} mengembalikan <strong>{loan.nama}</strong>. {detail}
        </p>
      </Modal>
    </>
  )
}
