import { createContext, useContext, useState, ReactNode } from 'react'
import { setToken, clearToken, isLoggedIn } from '../api/client'

interface AuthUser { id: string; email: string }

interface AuthContextType {
  user: AuthUser | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (!isLoggedIn()) return null
    try { return JSON.parse(localStorage.getItem('vortex_user') ?? 'null') as AuthUser | null } catch { return null }
  })

  const login = (token: string, userData: AuthUser) => {
    setToken(token)
    localStorage.setItem('vortex_user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    clearToken()
    localStorage.removeItem('vortex_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
