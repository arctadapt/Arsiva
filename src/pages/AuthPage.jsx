import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, CircleAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { HangingTag, Wordmark } from '../components/Brand.jsx'

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login'
  const { login, register } = useAuth()
  const [nama, setNama] = useState('')
  const [kelas, setKelas] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (isLogin) await login(nama, password)
      else await register(nama, kelas, password)
      // Setelah user terisi, GuestOnly di App.jsx otomatis memindahkan ke beranda.
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="rail relative hidden flex-col justify-between overflow-hidden bg-rail text-white lg:flex">
        <div className="absolute left-10 top-9">
          <Wordmark />
        </div>
        <div className="tag-ayun flex justify-center px-10">
          <HangingTag code="ARV-0001" />
        </div>
        <div className="p-12 pt-0">
          <p className="max-w-xs text-[34px] font-extrabold leading-[1.1] tracking-tight">
            Catat, pinjam, kembalikan.
          </p>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-white/75">
            Setiap barang dan ruangan punya label sendiri, jadi tidak ada lagi yang dipinjam lalu hilang jejak.
          </p>
          <div className="mt-8 flex items-center gap-3 text-sm text-white/75">
            <img src="/smk-pi.png" alt="" className="h-10 w-10 rounded-full bg-white p-0.5" />
            <span>Dipakai di SMK Prakarya Internasional</span>
          </div>
        </div>
      </section>

      <div>
        <div className="flex items-center bg-rail px-6 py-5 text-white lg:hidden">
          <Wordmark />
        </div>
        <section className="mx-auto flex min-h-[calc(100vh-4.5rem)] w-full max-w-md flex-col justify-center px-6 py-10 lg:min-h-screen">
          <h1 className="text-[30px] font-bold leading-tight tracking-tight">
            {isLogin ? 'Masuk ke Arsiva' : 'Buat akun Arsiva'}
          </h1>
          <p className="mt-2 text-[15px] text-muted">
            {isLogin
              ? 'Pakai nama lengkap dan password yang kamu daftarkan.'
              : 'Akun baru bisa langsung dipakai untuk mengajukan peminjaman.'}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5" noValidate={false}>
            {error && (
              <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-bad/30 bg-bad/5 p-3 text-sm">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-bad" aria-hidden />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="nama" className="label">Nama lengkap</label>
              <input id="nama" className="input" value={nama} onChange={(e) => setNama(e.target.value)}
                autoComplete="username" required minLength={3} maxLength={100} autoFocus />
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="kelas" className="label">Kelas</label>
                <input id="kelas" className="input" value={kelas} onChange={(e) => setKelas(e.target.value)}
                  placeholder="Contoh: XI RPL 2" required maxLength={100} />
              </div>
            )}

            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <input id="password" className="input pr-12" type={show ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)} required minLength={isLogin ? 1 : 6} maxLength={72}
                  autoComplete={isLogin ? 'current-password' : 'new-password'} />
                <button type="button" onClick={() => setShow((s) => !s)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted hover:text-ink"
                  aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}>
                  {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {!isLogin && <p className="hint">Minimal 6 karakter.</p>}
            </div>

            <button type="submit" className="btn-primary w-full py-3 text-[15px]" disabled={busy}>
              {busy ? (isLogin ? 'Memeriksa...' : 'Membuat akun...') : isLogin ? 'Masuk' : 'Buat akun'}
            </button>
          </form>

          <p className="mt-6 text-[15px] text-muted">
            {isLogin ? 'Belum punya akun? ' : 'Sudah punya akun? '}
            <Link to={isLogin ? '/daftar' : '/masuk'} className="font-semibold text-primary underline underline-offset-4">
              {isLogin ? 'Daftar di sini' : 'Masuk'}
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}
