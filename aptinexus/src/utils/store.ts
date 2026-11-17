import { useState } from 'react'
/** Browser-local state for preferences and temporary interface data. */
export function useStored<T>(key: string, init: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => { try { const r = localStorage.getItem(key); return r ? (JSON.parse(r) as T) : init } catch { return init } })
  return [v, n => { setV(n); try { localStorage.setItem(key, JSON.stringify(n)) } catch { /* storage unavailable */ } }]
}
export const isHttpUrl = (s: string) => { try { return /^https?:$/.test(new URL(s).protocol) } catch { return false } }

