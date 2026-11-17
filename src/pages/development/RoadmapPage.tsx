import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import CareerPicker from '../../components/careers/CareerPicker'
import { careers } from '../../data/careers'
import { byName, priorityOf } from '../../data/skills'
import { gapsApi, profilesApi } from '../../services/api'
import { loadProfile } from '../../data/profile'
import { useRemote } from '../../hooks/useRemote'
import { useAuth } from '../../contexts/AuthContext'

const tasks = (s: string) => [`Study the fundamentals of ${s}`, `Complete a practice exercise in ${s}`, `Build a mini project that uses ${s}`]
export default function RoadmapPage() {
  const { user } = useAuth()
  const [sp, setSp] = useSearchParams()
  const career = careers.find(c => c.id === sp.get('career')) ?? careers[0]
  const [done, setDone] = useRemote<string[]>(`roadmap:${career.id}`, user?.id, [])
  const [open, setOpen] = useState<string | null>(null)
  const [missing, setMissing] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    if (!user) return () => { active = false }
    profilesApi.get(user.id, loadProfile(user)).then(profile => gapsApi.analyse(career.id, profile.sections?.technical ?? [])).then(result => { if (active) setMissing((result as { missing: string[] }).missing ?? []) })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Could not load your roadmap.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [career.id])
  const toggle = (id: string) => { const n = done.includes(id) ? done.filter(d => d !== id) : [...done, id]; setDone(n) }

  // Order: by priority, with any missing prerequisite placed before the skill that needs it.
  const stages: string[] = []
  const missingSet = new Set(missing.map(skill => skill.toLocaleLowerCase()))
  const place = (s: string) => { if (stages.includes(s)) return; (byName(s)?.prereqs ?? []).filter(p => missingSet.has(p.toLocaleLowerCase())).forEach(place); stages.push(s) }
  missing.sort((a, b) => career.required.indexOf(a) - career.required.indexOf(b)).forEach(place)
  const all = stages.flatMap(s => tasks(s).map((_, i) => `${s}:${i}`))
  const pct = all.length ? Math.round((all.filter(t => done.includes(t)).length / all.length) * 100) : 100
  const next = stages.find(s => tasks(s).some((_, i) => !done.includes(`${s}:${i}`)))
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold text-[#1d1d1f]">Learning Roadmap</h1><p className="text-sm text-[#6e6e73]">A learning plan based on the selected career's missing skills. Tick tasks as you finish them.</p></div>
        <CareerPicker value={career.id} onChange={id => { setSp({ career: id }); setOpen(null) }} /></div>
      {loading && <p className="glass p-3 text-sm text-[#6e6e73]">Building your roadmap…</p>}{error && <p role="alert" className="text-sm text-[#d70015]">{error}</p>}
      <div className="glass p-5"><div className="flex justify-between text-sm"><span className="text-[#1d1d1f]">Progress</span><span>{pct}%</span></div>
        <div className="mt-2 h-2 rounded-full bg-black/[0.05]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-2 rounded-full bg-gradient-to-r from-nexus-blue to-nexus-violet" style={{ width: `${pct}%` }} /></div>
        <p className="mt-2 text-sm text-[#6e6e73]">{next ? `Next milestone: finish ${next}.` : 'All milestones complete.'}</p></div>
      {!loading && stages.length === 0 && <p className="glass p-5">No gaps for this career, so there is nothing to plan.</p>}
      <ol className="space-y-3 border-l border-black/[0.14] pl-6">
        {stages.map((s, n) => { const complete = tasks(s).every((_, i) => done.includes(`${s}:${i}`)); const isOpen = open === s || (open === null && s === next); const l = byName(s)
          return (<li key={s} className="relative"><span className={`dot ${complete ? 'dot-done' : s === next ? 'dot-current' : 'dot-todo'}`} />
            <div className="glass p-4"><button className="flex w-full items-center justify-between text-left" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? '' : s)}>
              <span><span className="text-[#1d1d1f]">Stage {n + 1}: {s}</span><span className="ml-2 text-xs text-[#6e6e73]">{priorityOf(career, s)}</span><span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${complete ? 'bg-emerald-400/15 text-[#248a3d]' : s === next ? 'bg-nexus-blue/20 text-[#0062cc]' : 'bg-black/[0.05] text-[#6e6e73]'}`}>{complete ? 'Completed' : s === next ? 'Current' : 'Upcoming'}</span></span><ChevronDown size={16} className={isOpen ? 'rotate-180' : ''} /></button>
              {isOpen && <div className="mt-3 space-y-2 text-sm"><p className="text-[#6e6e73]">{l?.desc} Prerequisites: {l?.prereqs.join(', ') || 'none'}.</p>
                {tasks(s).map((t, i) => <label key={t} className="flex items-center gap-2"><input type="checkbox" checked={done.includes(`${s}:${i}`)} onChange={() => toggle(`${s}:${i}`)} />{t}</label>)}
                <p className="text-xs text-[#6e6e73]">Resource types: a beginner course, official documentation, a hands-on tutorial.</p></div>}</div></li>)})}
      </ol>
    </div>
  )
}

