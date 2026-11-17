import { useToast } from '../../contexts/ToastContext'
import { useEffect, useMemo, useState } from 'react'
import { careers } from '../../data/careers'
import { loadProfile } from '../../data/profile'
import { library } from '../../data/skills'
import { profilesApi, whatIfApi } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import type { User } from '../../types'

const presets: Record<string, string[]> = { 'Robotics project': ['ROS', 'Computer Vision'], 'Automation project': ['PLC Programming', 'SCADA'], 'Vehicle networking project': ['CAN Bus', 'AUTOSAR'], 'Data project': ['Machine Learning', 'Analytics'] }
interface Projection { id: string; current: number; hypothetical: number; change: number; stillNeeded: string[] }

export default function WhatIfPage() {
  const user = useAuth().user as User
  const toast = useToast()
  const [skills, setSkills] = useState<string[]>([])
  const [projs, setProjs] = useState<string[]>([])
  const [msg, setMsg] = useState('')
  const [rows, setRows] = useState<Projection[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const extra = useMemo(() => Array.from(new Set([...skills, ...projs.flatMap(p => presets[p])])), [skills, projs])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    profilesApi.get(user.id, loadProfile(user)).then(profile => {
      const skillsInProfile = profile.sections?.technical ?? []
      return whatIfApi.simulate(extra, skillsInProfile)
    }).then(result => {
      if (active) setRows(result as Projection[])
    }).catch(e => {
      if (active) setError(e instanceof Error ? e.message : 'Could not calculate projections.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [extra])

  const flip = (list: string[], v: string, set: (l: string[]) => void) => set(list.includes(v) ? list.filter(x => x !== v) : [...list, v])
  const save = async () => {
    if (!extra.length || !confirm(`Add ${extra.length} skill(s) to your real profile as claimed skills? Hypothetical items are otherwise never saved.`)) return
    const p = await profilesApi.get(user.id, loadProfile(user)); p.sections.technical = Array.from(new Set([...(p.sections.technical ?? []), ...extra])); await profilesApi.save(user.id, p); toast.push('Saved to your profile'); setMsg('Saved to your profile as claimed skills.')
  }
  const chip = (on: boolean) => `rounded-full border px-3 py-1 text-sm ${on ? 'border-violet-400 bg-violet-400/10 text-[#8944ab]' : 'border-black/[0.08]'}`
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div><h1 className="text-2xl font-semibold text-[#1d1d1f]">What-If Simulator</h1><p className="text-sm text-[#6e6e73]">Try hypothetical skills and projects. Nothing here changes your profile unless you choose to save it.</p></div>
      <section className="glass space-y-4 p-5"><div><h2 className="mb-2 font-medium text-[#1d1d1f]">Hypothetical skills</h2><div className="flex flex-wrap gap-2">{library.map(l => <button key={l.name} aria-pressed={skills.includes(l.name)} className={chip(skills.includes(l.name))} onClick={() => flip(skills, l.name, setSkills)}>{l.name}</button>)}</div></div>
        <div><h2 className="mb-2 font-medium text-[#1d1d1f]">Hypothetical projects</h2><div className="flex flex-wrap gap-2">{Object.keys(presets).map(p => <button key={p} aria-pressed={projs.includes(p)} className={chip(projs.includes(p))} onClick={() => flip(projs, p, setProjs)}>{p}</button>)}</div></div></section>
      <p className="rounded-xl border border-violet-400/30 bg-violet-400/10 p-3 text-sm text-[#8944ab]" role="status">{extra.length ? `Projection includes ${extra.join(', ')}. These skills are not saved unless you choose Save to my profile.` : 'Choose skills or projects to see how they affect your career matches.'}</p>
      {error && <p role="alert" className="text-sm text-[#d70015]">{error}</p>}
      <div className="glass overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead><tr className="border-b border-black/[0.08] text-[#6e6e73]"><th className="p-3 font-normal">Career</th><th className="p-3 font-normal">Current</th><th className="p-3 font-normal">Hypothetical</th><th className="p-3 font-normal">Still needed</th></tr></thead>
        <tbody>{rows.map(r => { const career = careers.find(c => c.id === r.id); return <tr key={r.id} className="border-b border-black/[0.08]"><td className="p-3 text-[#1d1d1f]">{career?.title ?? r.id}</td><td className="p-3">{r.current}%</td><td className="p-3 text-[#8944ab]">{r.hypothetical}% {r.change > 0 && <span className="text-[#248a3d]">(+{r.change})</span>}</td><td className="p-3 text-xs">{r.stillNeeded.join(', ') || 'None'}</td></tr> })}</tbody></table>{loading && <p className="p-3 text-xs text-[#6e6e73]">Updating projections…</p>}</div>
      <div className="flex items-center gap-3"><button className="btn-primary" disabled={!extra.length} onClick={save}>Save to my profile</button><button className="btn-ghost" onClick={() => { setSkills([]); setProjs([]); setMsg('') }}>Clear</button>{msg && <span role="status" className="text-sm text-[#007AFF]">{msg}</span>}</div>
    </div>
  )
}

