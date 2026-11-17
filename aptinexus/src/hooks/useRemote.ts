import { useEffect, useRef, useState } from 'react'
import { userData } from '../services/api/userData'
import { useToast } from '../contexts/ToastContext'

/** Loads and saves one per-user resource through the API layer. Saves are debounced and flushed on unmount. Returns [value, setValue, loading]. */
export function useRemote<T>(name: string, uid: string | undefined, init: T): [T, (v: T) => void, boolean] {
  const { push } = useToast()
  const [value, setValue] = useState<T>(init)
  const [loading, setLoading] = useState(true)
  const timer = useRef<number>()
  const pending = useRef<(() => void) | null>(null)
  useEffect(() => {
    let off = false; setLoading(true)
    userData.get<T>(name, uid, init).then(r => { if (!off) { setValue(r); setLoading(false) } })
      .catch(() => { if (!off) { setLoading(false); push('Could not load your data. Showing defaults.', 'error') } })
    return () => { off = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, uid])
  useEffect(() => () => { window.clearTimeout(timer.current); pending.current?.() }, [])
  const set = (v: T) => {
    setValue(v); window.clearTimeout(timer.current)
    const run = () => { pending.current = null; userData.save(name, uid, v).catch(() => push('Could not save your changes.', 'error')) }
    pending.current = run; timer.current = window.setTimeout(run, 400)
  }
  return [value, set, loading]
}
