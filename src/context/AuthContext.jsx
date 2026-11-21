import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, clearToken, getToken, setToken, setUnauthorizedHandler } from '../lib/api.js'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setUnauthorizedHandler(() => { clearToken(); setUser(null) })
    if (!getToken()) { setReady(true); return }
    api.get('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => clearToken())
      .finally(() => setReady(true))
  }, [])

  const login = useCallback(async (nama_lengkap, password) => {
    const d = await api.post('/auth/login', { nama_lengkap, password })
    setToken(d.token)
    setUser(d.user)
  }, [])

  const register = useCallback(async (nama_lengkap, kelas, password) => {
    const d = await api.post('/auth/register', { nama_lengkap, kelas, password })
    setToken(d.token)
    setUser(d.user)
  }, [])

  const logout = useCallback(() => { clearToken(); setUser(null) }, [])

  const value = useMemo(() => ({ user, ready, login, register, logout }), [user, ready, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
