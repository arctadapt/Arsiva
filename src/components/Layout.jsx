import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Bell, Boxes, History, Home, Inbox, LogOut, Menu, Moon, SlidersHorizontal, Sun, UserRound, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { api } from '../lib/api.js'
import { isAdmin } from '../lib/format.js'
import { BrandMark, Wordmark } from './Brand.jsx'

function NotificationButton({ count, inverse = false }) {
  const label = count > 0 ? `Notifikasi, ${count} belum dibaca` : 'Notifikasi'

  return (
    <NavLink
      to="/notifikasi"
      title={label}
      aria-label={label}
      className={({ isActive }) => `relative grid h-10 w-10 place-items-center rounded-full border transition-colors ${inverse ? (isActive ? 'border-white/25 bg-white/10 text-white' : 'border-white/15 bg-white/5 text-white/85 hover:bg-white/10') : (isActive ? 'border-line bg-sunken text-ink' : 'border-line bg-surface text-muted hover:bg-sunken hover:text-ink')}`}
    >
      <Bell className="h-[18px] w-[18px]" aria-hidden />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#697565] px-1 text-[10px] font-bold leading-none text-[#1E201E]" aria-hidden="true">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </NavLink>
  )
}

function NavItem({ to, icon: Icon, children, badge = 0, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={children}
      aria-label={children}
      className={({ isActive }) =>
        `relative flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium transition-colors lg:justify-center lg:px-0 ${
          isActive ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute -left-3 bottom-2 top-2 w-1 rounded-r bg-[#697565] lg:-left-3" aria-hidden />}
          <Icon className="h-5 w-5 shrink-0" aria-hidden />
          <span className="flex-1 lg:sr-only">{children}</span>
          {badge > 0 && (
            <span className="rounded-full bg-[#697565] px-2 py-0.5 text-xs font-bold text-[#1E201E] lg:absolute lg:-right-1 lg:-top-1 lg:px-1.5 lg:py-0.5" aria-label={`${badge} baru`}>
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const [open, setOpen] = useState(false)
  const [counts, setCounts] = useState({ menunggu: 0, unread: 0 })
  const location = useLocation()
  const admin = isAdmin(user)

  const loadCounts = useCallback(async () => {
    try {
      const [s, n] = await Promise.all([api.get('/stats'), api.get('/notifications')])
      setCounts({ menunggu: s.menunggu, unread: n.belum_dibaca })
    } catch { /* badge boleh gagal diam-diam */ }
  }, [])

  useEffect(() => { loadCounts() }, [loadCounts, location.pathname])
  useEffect(() => {
    const timer = setInterval(loadCounts, 60_000)
    window.addEventListener('arsiva:refresh', loadCounts)
    return () => { clearInterval(timer); window.removeEventListener('arsiva:refresh', loadCounts) }
  }, [loadCounts])

  useEffect(() => { setOpen(false) }, [location.pathname])
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const ThemeIcon = theme === 'dark' ? Sun : Moon
  const themeLabel = theme === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'

  return (
    <div className="min-h-screen lg:flex">
      <a href="#isi" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold">
        Lewati ke konten
      </a>

      <header className="sticky top-0 z-30 flex items-center gap-3 bg-rail px-4 py-3 text-white lg:hidden">
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-white/10" aria-label="Buka menu" aria-expanded={open}>
          <Menu className="h-6 w-6" />
        </button>
        <Wordmark />
        <div className="ml-auto flex items-center gap-1.5">
          <NotificationButton count={counts.unread} inverse />
          <button onClick={toggle} className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white/85 hover:bg-white/10" aria-label={themeLabel} title={themeLabel}>
            <ThemeIcon className="h-[18px] w-[18px]" aria-hidden />
          </button>
        </div>
      </header>

      {open && <div className="fixed inset-0 z-40 bg-[rgb(6_28_37/0.6)] lg:hidden" onClick={() => setOpen(false)} aria-hidden />}

      <aside
        className={`rail fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-rail px-3 pb-4 pt-5 text-white transition-[transform,visibility] duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-[76px] lg:translate-x-0 lg:visible lg:shrink-0 ${
          open ? 'translate-x-0' : '-translate-x-full invisible'
        }`}
        aria-label="Menu utama"
      >
        <div className="mb-8 flex items-center justify-between px-3 lg:justify-center lg:px-0">
          <span className="lg:hidden"><Wordmark /></span>
          <BrandMark className="hidden h-11 w-11 lg:block" />
          <button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-white/10 lg:hidden" aria-label="Tutup menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          <NavItem to="/" icon={Home} end>Beranda</NavItem>
          <NavItem to="/katalog" icon={Boxes}>Katalog</NavItem>
          <NavItem to="/riwayat" icon={History}>Riwayat</NavItem>
          {admin && (
            <>
              <div className="mx-3 my-4 border-t border-white/15" role="separator" />
              <NavItem to="/permintaan" icon={Inbox} badge={counts.menunggu}>Permintaan</NavItem>
              <NavItem to="/kelola" icon={SlidersHorizontal}>Kelola inventaris</NavItem>
            </>
          )}
        </nav>

        <div className="mt-4 border-t border-white/15 pt-4">
          <NavLink
            to="/profil"
            title={user?.nama}
            aria-label={`Profil ${user?.nama ?? ''}`}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2 transition-colors lg:justify-center lg:px-0 ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`
            }
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-[#ECDFCC]" aria-hidden>
              <UserRound className="h-5 w-5" />
            </span>
            <span className="min-w-0 lg:sr-only">
              <span className="block truncate text-sm font-semibold">{user?.nama}</span>
              <span className="block truncate text-xs text-white/65">{admin ? 'Admin' : user?.kelas}</span>
            </span>
          </NavLink>
          <div className="mt-2 flex gap-1 px-1 lg:justify-center">
            <button onClick={logout} title="Keluar" aria-label="Keluar" className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/75 hover:bg-white/5 hover:text-white lg:flex-none lg:justify-center lg:px-3">
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="lg:sr-only">Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      <main id="isi" className="min-w-0 flex-1" tabIndex={-1}>
        <header className="hidden h-[82px] items-center justify-between border-b border-line/70 bg-bg/80 px-8 backdrop-blur lg:flex 2xl:px-12">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted">Arsiva / Inventaris</p>
            <p className="mt-1 text-sm font-semibold text-ink">Ruang kendali sekolah</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationButton count={counts.unread} />
            <button onClick={toggle} className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-muted transition-colors hover:text-ink" aria-label={themeLabel} title={themeLabel}>
              <ThemeIcon className="h-4 w-4" aria-hidden />
            </button>
            <div className="flex items-center gap-3 border-l border-line pl-4">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-sunken text-sm font-bold text-ink" aria-hidden>
                {user?.nama?.slice(0, 1)?.toUpperCase() || 'A'}
              </span>
              <div className="max-w-40">
                <p className="truncate text-sm font-semibold text-ink">{user?.nama}</p>
                <p className="text-xs text-muted">{admin ? 'Administrator' : user?.kelas}</p>
              </div>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10 2xl:px-12">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
