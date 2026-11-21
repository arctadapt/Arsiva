import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Bell, Boxes, History, Home, Inbox, LogOut, Menu, Moon, SlidersHorizontal, Sun, UserRound, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { api } from '../lib/api.js'
import { isAdmin } from '../lib/format.js'
import { Wordmark } from './Brand.jsx'

function NavItem({ to, icon: Icon, children, badge = 0, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors ${
          isActive ? 'bg-white/10 text-white' : 'text-white/75 hover:bg-white/5 hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute -left-3 bottom-2 top-2 w-1 rounded-r bg-tag" aria-hidden />}
          <Icon className="h-5 w-5 shrink-0" aria-hidden />
          <span className="flex-1">{children}</span>
          {badge > 0 && (
            <span className="rounded-full bg-tag px-2 py-0.5 text-xs font-bold text-[#3a2a00]" aria-label={`${badge} baru`}>
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
        <div className="flex-1" />
        <button onClick={toggle} className="rounded-lg p-2 hover:bg-white/10" aria-label={themeLabel}>
          <ThemeIcon className="h-5 w-5" />
        </button>
      </header>

      {open && <div className="fixed inset-0 z-40 bg-[rgb(6_28_37/0.6)] lg:hidden" onClick={() => setOpen(false)} aria-hidden />}

      <aside
        className={`rail fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-rail px-3 pb-4 pt-5 text-white transition-[transform,visibility] duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:translate-x-0 lg:visible lg:shrink-0 ${
          open ? 'translate-x-0' : '-translate-x-full invisible'
        }`}
        aria-label="Menu utama"
      >
        <div className="mb-8 flex items-center justify-between px-3">
          <Wordmark />
          <button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-white/10 lg:hidden" aria-label="Tutup menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          <NavItem to="/" icon={Home} end>Beranda</NavItem>
          <NavItem to="/katalog" icon={Boxes}>Katalog</NavItem>
          <NavItem to="/riwayat" icon={History}>Riwayat</NavItem>
          <NavItem to="/notifikasi" icon={Bell} badge={counts.unread}>Notifikasi</NavItem>
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
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`
            }
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15" aria-hidden>
              <UserRound className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{user?.nama}</span>
              <span className="block truncate text-xs text-white/65">{admin ? 'Admin' : user?.kelas}</span>
            </span>
          </NavLink>
          <div className="mt-2 flex gap-1 px-1">
            <button onClick={toggle} className="hidden flex-1 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/5 hover:text-white lg:flex" aria-label={themeLabel}>
              <ThemeIcon className="h-4 w-4" aria-hidden />
              {theme === 'dark' ? 'Tema terang' : 'Tema gelap'}
            </button>
            <button onClick={logout} className="flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/5 hover:text-white lg:flex-none">
              <LogOut className="h-4 w-4" aria-hidden />
              Keluar
            </button>
          </div>
        </div>
      </aside>

      <main id="isi" className="min-w-0 flex-1" tabIndex={-1}>
        <div className="mx-auto max-w-5xl px-5 py-8 lg:px-10 lg:py-12">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
