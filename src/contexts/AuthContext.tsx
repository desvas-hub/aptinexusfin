import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '../services/api'
import { setAccessToken } from '../services/api/client'
import type { User } from '../types'

interface AuthState { user: User | null; login: (e: string, p: string) => Promise<void>; register: (n: string, e: string, p: string) => Promise<void>; logout: () => void }
const Ctx = createContext<AuthState | null>(null)
const KEY = 'aptinexus.user'
const TOKEN_KEY = 'aptinexus.session-token'

export function AuthProvider({ children }: { children: ReactNode }) {
  // Keep the short-lived token in sessionStorage so page refreshes work, but closing
  // the browser session signs the user out. Never persist passwords.
  const [user, setUser] = useState<User | null>(() => {
    const token = sessionStorage.getItem(TOKEN_KEY)
    if (!token) return null
    setAccessToken(token)
    try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') } catch { return null }
  })
  const value = useMemo<AuthState>(() => {
    const done = (r: { user: User; token: string }) => {
      setAccessToken(r.token)
      sessionStorage.setItem(TOKEN_KEY, r.token)
      localStorage.setItem(KEY, JSON.stringify(r.user))
      setUser(r.user)
    }
    return {
      user,
      login: async (e, p) => done(await authApi.login(e, p)),
      register: async (n, e, p) => done(await authApi.register(n, e, p)),
      logout: () => {
        setAccessToken(null)
        sessionStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(KEY)
        setUser(null)
      },
    }
  }, [user])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useAuth = () => { const c = useContext(Ctx); if (!c) throw new Error('useAuth outside AuthProvider'); return c }
