import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useRemote } from '../../hooks/useRemote'
import { useTheme } from '../../contexts/ThemeContext'
import { Moon, Sun } from 'lucide-react'

const tabs = ['Profile preferences', 'Appearance', 'Account']
const defaults = { focus: 'Engineering', hours: 5 }
type S = typeof defaults
const Toggle = ({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) => <label className="flex items-center justify-between py-2 text-sm">{label}<input type="checkbox" role="switch" checked={on} onChange={e => set(e.target.checked)} /></label>

export default function SettingsPage() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const [tab, setTab] = useState(tabs[0])
  const [s, setS] = useRemote<S>('settings', user?.id, defaults)
  const [motion, setMotion] = useState(() => localStorage.getItem('aptinexus.reduceMotion') === 'true')
  const up = <K extends keyof S>(k: K, v: S[K]) => setS({ ...s, [k]: v })
  const setReduce = (v: boolean) => { setMotion(v); localStorage.setItem('aptinexus.reduceMotion', String(v)); document.documentElement.dataset.reduceMotion = String(v) }
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div><h1 className="text-2xl font-semibold text-[#1d1d1f]">Settings</h1><p className="text-sm text-[#6e6e73]">Manage your account preferences.</p></div>
      <div role="tablist" className="flex flex-wrap gap-2">{tabs.map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`btn-ghost !py-1.5 ${tab === t ? 'bg-[#007AFF]/10 text-[#007AFF]' : ''}`}>{t}</button>)}</div>
      <section role="tabpanel" className="glass space-y-2 p-5">
        {tab === 'Profile preferences' && <>
          <label className="block text-sm">Career focus<select className="input mt-1" value={s.focus} onChange={e => up('focus', e.target.value)}>{['Engineering', 'Software', 'Product', 'Research'].map(f => <option key={f}>{f}</option>)}</select></label>
          <label className="block text-sm">Weekly learning goal (hours)<input type="number" min={1} max={40} className="input mt-1" value={s.hours} onChange={e => up('hours', Math.min(40, Math.max(1, Number(e.target.value) || 1)))} /></label></>}
        {tab === 'Appearance' && <>
          <div className="space-y-2"><p className="text-sm">Color theme</p><div role="group" aria-label="Choose color theme" className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={theme === 'light'} onClick={() => setTheme('light')} className={`btn-ghost ${theme === 'light' ? 'bg-[#007AFF]/10 text-[#007AFF]' : ''}`}><Sun size={16} />Light</button>
            <button type="button" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')} className={`btn-ghost ${theme === 'dark' ? 'bg-[#007AFF]/10 text-[#007AFF]' : ''}`}><Moon size={16} />Dark</button>
          </div><p className="text-xs text-[#6e6e73]">Your choice is saved in this browser.</p></div>
          <Toggle label="Reduce motion" on={motion} set={setReduce} /><p className="text-xs text-[#6e6e73]">Your system’s reduced-motion setting is always respected.</p></>}
        {tab === 'Account' && <><p className="text-sm">Name: <span className="text-[#1d1d1f]">{user?.name}</span></p><p className="text-sm">Email: <span className="text-[#1d1d1f]">{user?.email}</span></p>
          </>}
      </section>
    </div>
  )
}

