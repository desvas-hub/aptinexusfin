import { useEffect, useState } from 'react'
import type { Career } from '../../data/careers'
import { useAuth } from '../../contexts/AuthContext'
import { loadProfile } from '../../data/profile'
import { careersApi, matchingApi, profilesApi } from '../../services/api'
import type { CareerMatch } from '../../types'

export default function CareerComparisonPage() {
  const { user } = useAuth()
  const [careers, setCareers] = useState<Career[]>([])
  const [userSkills, setUserSkills] = useState<string[] | null>(null)
  const [matchesById, setMatchesById] = useState<Record<string, CareerMatch>>({})
  const [profileError, setProfileError] = useState('')
  const [sel, setSel] = useState<string[]>([])
  useEffect(() => {
    let active = true
    careersApi.list().then(items => {
      if (!active) return
      const catalog = items as Career[]
      setCareers(catalog)
      setSel(catalog.slice(0, 2).map(c => c.id))
    }).catch(e => { if (active) setProfileError(e instanceof Error ? e.message : 'Could not load careers.') })
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (!user) return
    let active = true
    setUserSkills(null)
    setProfileError('')
    Promise.all([
      profilesApi.get(user.id, loadProfile(user)),
      matchingApi.recommendations(),
    ]).then(([profile, matches]) => {
      if (!active) return
      const map: Record<string, CareerMatch> = {}
      const allMatched = new Set<string>(profile.sections?.technical ?? [])
      matches.forEach(m => {
        map[m.id] = m
        ;(m.matched ?? []).forEach(s => allMatched.add(s))
      })
      setMatchesById(map)
      setUserSkills(Array.from(allMatched))
    }).catch(() => {
      if (active) setProfileError('Your profile skills could not be loaded. Skill matches are unknown until the profile is available.')
    })
    return () => { active = false }
  }, [user])
  const toggle = (id: string) => setSel(s => (s.includes(id) ? s.filter(x => x !== id) : s.length < 3 ? [...s, id] : s))
  const cols = careers.filter(c => sel.includes(c.id))
  const matchedCount = (c: Career) => {
    if (matchesById[c.id]?.matched) return matchesById[c.id].matched!.length
    if (userSkills === null) return null
    return c.required.filter(required =>
      userSkills.some(skill => skill.trim().toLocaleLowerCase() === required.toLocaleLowerCase()),
    ).length
  }
  const hasSkill = (s: string) =>
    userSkills !== null && userSkills.some(skill => skill.trim().toLocaleLowerCase() === s.toLocaleLowerCase())
  const rows: [string, (c: Career) => React.ReactNode][] = [
    ['Category', c => c.category],
    ['Required skills', c => <ul>{c.required.map(s => <li key={s}>{userSkills === null ? '？ unknown' : hasSkill(s) ? '✓ you have' : '○ missing'}: {s}</li>)}</ul>],
    ['Skills matched', c => matchedCount(c) === null ? 'Unknown' : `${matchedCount(c)} of ${c.required.length}`],
    ['Career compatibility', c => matchedCount(c) === null ? 'Unknown' : `${matchesById[c.id]?.compatibility ?? (c.required.length ? Math.round(100 * matchedCount(c)! / c.required.length) : 0)}%`],
  ]
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div><h1 className="text-2xl font-semibold text-[#1d1d1f]">Career Comparison</h1><p className="text-sm text-[#6e6e73]">Compare career requirements with the live skills from your profile, projects, evidence, and verified quizzes.</p></div>
      {profileError && <p role="alert" className="text-sm text-[#d70015]">{profileError}</p>}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Choose careers to compare">{careers.map(c => <button key={c.id} aria-pressed={sel.includes(c.id)} disabled={!sel.includes(c.id) && sel.length >= 3} onClick={() => toggle(c.id)} className={`btn-ghost !py-1.5 ${sel.includes(c.id) ? 'bg-[#007AFF]/10 text-[#007AFF]' : ''}`}>{c.title}</button>)}</div>
      {cols.length < 2 ? <p className="glass p-6">Select at least two careers to compare.</p> : (
        <div className="glass overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm">
          <thead><tr className="border-b border-black/[0.08]"><th className="p-3" /> {cols.map(c => <th key={c.id} scope="col" className="p-3 text-[#1d1d1f]">{c.title}</th>)}</tr></thead>
          <tbody>{rows.map(([label, fn]) => <tr key={label} className="border-b border-black/[0.08] align-top"><th scope="row" className="p-3 font-normal text-[#6e6e73]">{label}</th>{cols.map(c => <td key={c.id} className="p-3">{fn(c)}</td>)}</tr>)}</tbody></table></div>)}
    </div>
  )
}
