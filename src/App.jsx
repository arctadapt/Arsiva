import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import { isAdmin } from './lib/format.js'
import Layout from './components/Layout.jsx'
import AuthPage from './pages/AuthPage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Katalog from './pages/Katalog.jsx'
import Riwayat from './pages/Riwayat.jsx'
import Permintaan from './pages/Permintaan.jsx'
import Kelola from './pages/Kelola.jsx'
import Notifikasi from './pages/Notifikasi.jsx'
import Profil from './pages/Profil.jsx'
import NotFound from './pages/NotFound.jsx'

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center" role="status" aria-label="Memuat">
      <span className="asset-tag motion-safe:animate-pulse">ARV-...</span>
    </div>
  )
}

function RequireAuth({ children }) {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <Splash />
  if (!user) return <Navigate to="/masuk" state={{ from: location.pathname }} replace />
  return children
}

function RequireAdmin({ children }) {
  const { user } = useAuth()
  return isAdmin(user) ? children : <Navigate to="/" replace />
}

function GuestOnly({ children }) {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <Splash />
  if (user) return <Navigate to={location.state?.from || '/'} replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/masuk" element={<GuestOnly><AuthPage mode="login" /></GuestOnly>} />
      <Route path="/daftar" element={<GuestOnly><AuthPage mode="register" /></GuestOnly>} />

      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="katalog" element={<Katalog />} />
        <Route path="riwayat" element={<Riwayat />} />
        <Route path="notifikasi" element={<Notifikasi />} />
        <Route path="notifikasi/:id" element={<Notifikasi />} />
        <Route path="profil" element={<Profil />} />
        <Route path="permintaan" element={<RequireAdmin><Permintaan /></RequireAdmin>} />
        <Route path="kelola" element={<RequireAdmin><Kelola /></RequireAdmin>} />
      </Route>

      {/* Alamat dari versi lama */}
      <Route path="/dashboard" element={<Navigate to="/" replace />} />
      <Route path="/peminjaman" element={<Navigate to="/katalog" replace />} />
      <Route path="/tersedia" element={<Navigate to="/katalog" replace />} />
      <Route path="/settings" element={<Navigate to="/profil" replace />} />
      <Route path="/profile" element={<Navigate to="/profil" replace />} />
      <Route path="/register" element={<Navigate to="/daftar" replace />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
