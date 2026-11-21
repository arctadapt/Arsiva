import { useState } from 'react'
import { LogOut, Moon, Sun } from 'lucide-react'
import { api } from '../lib/api.js'
import { isAdmin } from '../lib/format.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { PageHeader } from '../components/ui.jsx'

const ROLE = { USER: 'Siswa', ADMIN: 'Admin', 'SUPER ADMIN': 'Super admin' }

export default function Profil() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const toast = useToast()
  const [lama, setLama] = useState('')
  const [baru, setBaru] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function ganti(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.put('/auth/password', { password_lama: lama, password_baru: baru })
      toast.success('Password diperbarui.')
      setLama('')
      setBaru('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Profil" description="Data akunmu, tampilan, dan keamanan." />

      <div className="max-w-xl space-y-10">
        <section aria-labelledby="h-akun">
          <h2 id="h-akun" className="mb-3 text-lg font-bold">Akun</h2>
          <dl className="divide-y divide-line rounded-xl border border-line bg-surface">
            {[
              ['Nama lengkap', user.nama],
              [isAdmin(user) ? 'Unit' : 'Kelas', user.kelas],
              ['Peran', ROLE[user.role] ?? user.role],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-muted">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="h-tampilan">
          <h2 id="h-tampilan" className="mb-3 text-lg font-bold">Tampilan</h2>
          <div className="flex gap-2" role="group" aria-label="Tema">
            {[['light', 'Terang', Sun], ['dark', 'Gelap', Moon]].map(([v, label, Icon]) => (
              <button key={v} onClick={() => setTheme(v)} aria-pressed={theme === v}
                className={`btn ${theme === v ? 'bg-primary text-on-primary' : 'border border-line bg-surface hover:bg-sunken'}`}>
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="h-pw">
          <h2 id="h-pw" className="mb-3 text-lg font-bold">Ganti password</h2>
          <form onSubmit={ganti} className="space-y-4 rounded-xl border border-line bg-surface p-5">
            <div>
              <label htmlFor="pw-lama" className="label">Password saat ini</label>
              <input id="pw-lama" type="password" className="input" value={lama} onChange={(e) => setLama(e.target.value)}
                autoComplete="current-password" required />
            </div>
            <div>
              <label htmlFor="pw-baru" className="label">Password baru</label>
              <input id="pw-baru" type="password" className="input" value={baru} onChange={(e) => setBaru(e.target.value)}
                autoComplete="new-password" minLength={6} maxLength={72} required />
              <p className="hint">Minimal 6 karakter.</p>
            </div>
            {error && <p role="alert" className="rounded-lg border border-bad/30 bg-bad/5 p-3 text-sm">{error}</p>}
            <button className="btn-primary" disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan password'}</button>
          </form>
        </section>

        <button onClick={logout} className="btn-quiet">
          <LogOut className="h-4 w-4" aria-hidden />
          Keluar dari Arsiva
        </button>
      </div>
    </>
  )
}
