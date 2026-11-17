import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark'
interface ThemeState { theme: Theme; setTheme: (theme: Theme) => void }
const Ctx = createContext<ThemeState | null>(null)
const KEY = 'aptinexus.theme'
const initialTheme = (): Theme => localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(KEY, theme)
  }, [theme])
  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>
}

export const useTheme = () => {
  const value = useContext(Ctx)
  if (!value) throw new Error('useTheme outside ThemeProvider')
  return value
}

