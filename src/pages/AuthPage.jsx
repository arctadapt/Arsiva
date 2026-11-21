import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, CircleAlert, PackageCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { Wordmark } from '../components/Brand.jsx'

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
    <div className="min-h-screen bg-bg lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(460px,0.92fr)]">
      <section className="relative isolate flex min-h-[250px] flex-col justify-between overflow-hidden bg-[#1E201E] text-[#ECDFCC] sm:min-h-[300px] lg:sticky lg:top-0 lg:h-screen lg:min-h-0">
        <img src="/inventory-hero.png" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E201E]/85 via-[#1E201E]/60 to-[#697565]/55" aria-hidden="true" />
        <div className="relative flex h-full flex-col justify-between p-6 sm:p-8 lg:p-12">
          <Wordmark />
          <div className="max-w-xl py-10 lg:py-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur">
              <PackageCheck className="h-3.5 w-3.5" aria-hidden />
              Sistem inventaris sekolah
            </span>
            <h2 className="mt-5 text-[32px] font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-[42px] lg:text-[52px]">
              Catat, pinjam, kembalikan.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75 sm:text-base">
              Setiap barang dan ruangan punya jejak yang jelas, supaya inventaris sekolah selalu siap digunakan.
            </p>
          </div>
          <div className="hidden items-center gap-3 text-sm text-white/80 sm:flex">
            <img src="/smk-pi.png" alt="" className="h-10 w-10 rounded-full bg-white p-0.5" />
            <span>Dipakai di SMK Prakarya Internasional</span>
          </div>
        </div>
      </section>

      <main className="flex min-h-[calc(100vh-250px)] items-center justify-center px-4 py-8 sm:min-h-[calc(100vh-300px)] sm:px-8 lg:min-h-screen lg:px-10 lg:py-12">
        <section className="w-full max-w-[440px] rounded-[28px] border border-line/70 bg-surface p-6 shadow-[0_20px_70px_rgba(30,32,30,0.08)] sm:p-9 lg:p-10">
          <div className="mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted">Selamat datang di Arsiva</p>
            <h1 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.035em] sm:text-[34px]">
              {isLogin ? 'Masuk ke akunmu' : 'Buat akun Arsiva'}
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              {isLogin
                ? 'Gunakan nama lengkap dan password yang sudah kamu daftarkan.'
                : 'Akun baru bisa langsung dipakai untuk mengajukan peminjaman.'}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-5" noValidate={false}>
            {error && (
              <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-bad/30 bg-bad/5 p-3 text-sm">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-bad" aria-hidden />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="nama" className="label">Nama lengkap</label>
              <input id="nama" className="input rounded-xl" value={nama} onChange={(e) => setNama(e.target.value)}
                autoComplete="username" required minLength={3} maxLength={100} autoFocus />
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="kelas" className="label">Kelas</label>
                <input id="kelas" className="input rounded-xl" value={kelas} onChange={(e) => setKelas(e.target.value)}
                  placeholder="Contoh: XI RPL 2" required maxLength={100} />
              </div>
            )}

            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <input id="password" className="input rounded-xl pr-12" type={show ? 'text' : 'password'} value={password}
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

            <button type="submit" className="btn-primary w-full rounded-xl py-3 text-[15px]" disabled={busy}>
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
      </main>
    </div>
  )
}
