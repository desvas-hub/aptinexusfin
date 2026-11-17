import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
interface Toast { id: number; msg: string; kind: 'success' | 'error' }
const Ctx = createContext<{ push: (msg: string, kind?: Toast['kind']) => void } | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([])
  const push = useCallback((msg: string, kind: Toast['kind'] = 'success') => {
    const id = Date.now() + Math.random()
    setList(l => [...l, { id, msg, kind }]); setTimeout(() => setList(l => l.filter(t => t.id !== id)), 3500)
  }, [])
  const value = useMemo(() => ({ push }), [push])
  return (
    <Ctx.Provider value={value}>{children}
      <div role="status" aria-live="polite" className="fixed bottom-4 right-4 z-[60] space-y-2">
        {list.map(t => <div key={t.id} className={`glass !bg-white/85 px-4 py-2 text-sm ${t.kind === 'error' ? 'border-rose-400/50 text-[#d70015]' : 'border-black/[0.08] text-[#1d1d1f]'}`}>{t.msg}</div>)}
      </div>
    </Ctx.Provider>
  )
}
export const useToast = () => { const c = useContext(Ctx); if (!c) throw new Error('useToast outside ToastProvider'); return c }
