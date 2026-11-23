import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Bell, Boxes, History, Home, Inbox, LogOut, Menu, Moon, SlidersHorizontal, Sun, UserRound, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { api } from '../lib/api.js'
import { isAdmin, waktuLalu } from '../lib/format.js'
import { Wordmark } from './Brand.jsx'

function NotificationButton({ count, notifications, loading, inverse = false }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const buttonRef = useRef(null)
  const label = count > 0 ? `Notifikasi, ${count} belum dibaca` : 'Notifikasi'

  useEffect(() => {
    if (!open) return undefined
    const closeOnOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative z-[110]">
      <button
        ref={buttonRef}
        type="button"
        title={label}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`relative grid h-10 w-10 place-items-center rounded-full border transition-colors ${inverse ? 'border-white/15 bg-white/5 text-white/85 hover:bg-white/10' : 'border-line bg-surface text-muted hover:bg-sunken hover:text-ink'} ${open && !inverse ? 'bg-sunken text-ink' : ''}`}
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#697565] px-1 text-[10px] font-bold leading-none text-[#1E201E]" aria-hidden="true">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <section role="dialog" aria-label="Notifikasi terbaru" className="absolute right-0 top-full z-[120] mt-3 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-line bg-surface text-ink shadow-[0_20px_60px_rgba(30,32,30,0.22)]">
          <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
            <div>
              <h2 className="text-sm font-semibold">Notifikasi</h2>
              <p className="mt-0.5 text-xs text-muted">{count > 0 ? `${count} belum dibaca` : 'Kabar terbaru akunmu'}</p>
            </div>
            <Link to="/notifikasi" onClick={() => setOpen(false)} className="shrink-0 text-xs font-semibold text-ink underline underline-offset-4 hover:text-muted">
              Lihat semua
            </Link>
          </header>
          {loading ? (
            <p className="px-4 py-7 text-center text-sm text-muted" role="status">Memuat notifikasi…</p>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-7 text-center text-sm text-muted">Belum ada notifikasi baru.</p>
          ) : (
            <ul className="max-h-72 divide-y divide-line overflow-y-auto">
              {notifications.slice(0, 5).map((notification) => (
                <li key={notification.id}>
                  <NavLink to={`/notifikasi/${notification.id}`} onClick={() => setOpen(false)} className="flex gap-3 px-4 py-3.5 transition-colors hover:bg-sunken">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.dibaca ? 'bg-transparent' : 'bg-[#697565]'}`} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className={`block line-clamp-2 text-sm leading-snug ${notification.dibaca ? 'text-muted' : 'font-semibold text-ink'}`}>
                        {notification.pesan}
                      </span>
                      <span className="mt-1 block text-xs text-muted">{waktuLalu(notification.dibuat)}</span>
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
          )}
          {notifications.length > 0 && (
            <footer className="border-t border-line bg-bg/50 px-4 py-2.5 text-center">
              <button type="button" disabled={count === 0} onClick={async () => {
                try {
                  await api.post('/notifications/read-all')
                  window.dispatchEvent(new Event('arsiva:refresh'))
                  setOpen(false)
                } catch (error) {
                  window.alert(error.message || 'Gagal menandai notifikasi.')
                }
              }} className="text-xs font-semibold text-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-50">
                Tandai telah dibaca
              </button>
            </footer>
          )}
        </section>
      )}
    </div>
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
        `relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors lg:justify-start lg:px-3 ${
          isActive ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute -left-3 bottom-2 top-2 w-1 rounded-r bg-[#697565] lg:-left-3" aria-hidden />}
          <Icon className="h-5 w-5 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{children}</span>
          {badge > 0 && (
            <span className="rounded-full bg-[#697565] px-2 py-0.5 text-[11px] font-bold text-[#1E201E]" aria-label={`${badge} baru`}>
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
  const [recentNotifications, setRecentNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(true)
  const location = useLocation()
  const admin = isAdmin(user)

  const loadCounts = useCallback(async () => {
    try {
      const [s, n] = await Promise.all([api.get('/stats'), api.get('/notifications')])
      setCounts({ menunggu: s.menunggu, unread: n.belum_dibaca })
      setRecentNotifications(n.notifications ?? [])
    } catch { /* badge boleh gagal diam-diam */ }
    finally { setNotificationsLoading(false) }
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

      <header className="sticky top-0 z-[100] flex items-center gap-3 bg-rail px-4 py-3 text-white lg:hidden">
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-white/10" aria-label="Buka menu" aria-expanded={open}>
          <Menu className="h-6 w-6" />
        </button>
        <Wordmark />
        <div className="ml-auto flex items-center gap-1.5">
          <NotificationButton count={counts.unread} notifications={recentNotifications} loading={notificationsLoading} inverse />
          <button onClick={toggle} className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white/85 hover:bg-white/10" aria-label={themeLabel} title={themeLabel}>
            <ThemeIcon className="h-[18px] w-[18px]" aria-hidden />
          </button>
        </div>
      </header>

      {open && <div className="fixed inset-0 z-40 bg-[rgb(6_28_37/0.6)] lg:hidden" onClick={() => setOpen(false)} aria-hidden />}

      <aside
        className={`rail fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-rail px-3 pb-4 pt-5 text-white transition-[transform,visibility] duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-[252px] lg:px-4 lg:translate-x-0 lg:visible lg:shrink-0 ${
          open ? 'translate-x-0' : '-translate-x-full invisible'
        }`}
        aria-label="Menu utama"
      >
        <div className="mb-8 flex items-center justify-between border-b border-white/10 px-3 pb-5 lg:px-2">
          <div>
            <Wordmark />
            <p className="mt-1 pl-10 text-[10px] font-medium uppercase tracking-[0.16em] text-white/45">Inventaris sekolah</p>
          </div>
          <button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-white/10 lg:hidden" aria-label="Tutup menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Menu utama</p>
          <NavItem to="/" icon={Home} end>Beranda</NavItem>
          <NavItem to="/katalog" icon={Boxes}>Katalog</NavItem>
          <NavItem to="/riwayat" icon={History}>Riwayat</NavItem>
          {admin && (
            <>
              <p className="mb-2 mt-6 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Pengelolaan</p>
              <NavItem to="/permintaan" icon={Inbox} badge={counts.menunggu}>Permintaan</NavItem>
              <NavItem to="/kelola" icon={SlidersHorizontal}>Kelola inventaris</NavItem>
            </>
          )}
        </nav>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-2">
          <NavLink
            to="/profil"
            title={user?.nama}
            aria-label={`Profil ${user?.nama ?? ''}`}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`
            }
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-[#ECDFCC]" aria-hidden>
              <UserRound className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{user?.nama}</span>
              <span className="block truncate text-xs text-white/65">{admin ? 'Admin' : user?.kelas}</span>
            </span>
          </NavLink>
          <div className="mt-1">
            <button onClick={logout} title="Keluar" className="flex w-full items-center gap-2 rounded-xl px-2 py-2.5 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white" aria-label="Keluar">
              <LogOut className="h-4 w-4" aria-hidden />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      <main id="isi" className="min-w-0 flex-1" tabIndex={-1}>
        <header className="relative z-[100] hidden h-[82px] items-center justify-between border-b border-line/70 bg-bg/80 px-8 backdrop-blur lg:flex 2xl:px-12">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted">Arsiva / Inventaris</p>
            <p className="mt-1 text-sm font-semibold text-ink">Ruang kendali sekolah</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationButton count={counts.unread} notifications={recentNotifications} loading={notificationsLoading} />
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
