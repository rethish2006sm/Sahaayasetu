import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../lib/api'

const TOKEN_KEY = 'sahaayasetu_token'
const USER_KEY = 'sahaayasetu_user'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || '')
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(TOKEN_KEY)
      return null
    }
  })

  const refreshUser = async () => {
    if (!token) return null
    try {
      const data = await apiRequest('/v1/auth/me', { token })
      setUser(data.user)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      return data.user
    } catch {
      setToken('')
      setUser(null)
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      return null
    }
  }

  useEffect(() => {
    refreshUser()
  }, [token])

  const login = async (email, password) => {
    const data = await apiRequest('/v1/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    return data.user
  }

  const logout = () => {
    setToken('')
    setUser(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  const value = useMemo(() => ({ token, user, login, logout, refreshUser }), [token, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
