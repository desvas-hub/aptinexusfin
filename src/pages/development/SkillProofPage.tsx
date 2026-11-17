import { useToast } from '../../contexts/ToastContext'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Trash2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { library } from '../../data/skills'
import { statusFor, type Evidence, type Project, type Result } from '../../data/evidence'
import { isHttpUrl } from '../../utils/store'
import { useRemote } from '../../hooks/useRemote'
import { loadProfile } from '../../data/profile'
import { profilesApi } from '../../services/api'

export default function SkillProofPage() {
  const { user } = useAuth()
  const uid = user?.id
  const toast = useToast()
  const [projects] = useRemote<Project[]>('projects', uid, [])
  const [ev, setEv] = useRemote<Evidence[]>('evidence', uid, [])
  const [res] = useRemote<Result[]>('results', uid, [])
  const [claimedSkills, setClaimedSkills] = useState<string[] | null>(null)
  const [profileError, setProfileError] = useState('')
  const [f, setF] = useState({ skill: library[0].name, type: 'Demonstration' as Evidence['type'], note: '', link: '' })
  const [err, setErr] = useState('')
  useEffect(() => {
    if (!user) return
    let active = true
    setClaimedSkills(null)
    setProfileError('')
    profilesApi.get(user.id, loadProfile(user)).then(profile => {
      if (active) setClaimedSkills(profile.sections?.technical ?? [])
    }).catch(() => {
      if (active) setProfileError('Your profile skills could not be loaded. Claim status is unknown until the profile is available.')
    })
    return () => { active = false }
  }, [user])
  const add = () => {
    if (!f.note.trim()) return setErr('Describe the evidence.')
    if (f.link && !isHttpUrl(f.link)) return setErr('Enter a link starting with http:// or https://.')
    setErr(''); setEv([...ev, { ...f, id: Date.now().toString(36) }]); setF({ ...f, note: '', link: '' }); toast.push('Evidence added')
  }
  const rows = library.filter(l => claimedSkills?.some(s => s.trim().toLocaleLowerCase() === l.name.toLocaleLowerCase()) || ev.some(e => e.skill === l.name) || projects.some(p => p.skills.includes(l.name)) || res.some(r => r.skill === l.name))
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div><h1 className="text-2xl font-semibold text-[#1d1d1f]">SkillProof</h1>
        <p className="text-sm text-[#6e6e73]">Claimed → Practised → Demonstrated → Verified. Passing a Gemini micro-quiz (70%+) or adding evidence makes a skill Practised; a project or demonstration with a link makes it Demonstrated.</p></div>
      {profileError && <p role="alert" className="text-sm text-[#d70015]">{profileError}</p>}
      {claimedSkills === null && !profileError && <p className="glass p-4 text-sm text-[#6e6e73]">Loading your saved skill claims…</p>}
      <section className="glass grid gap-3 p-5 md:grid-cols-5" aria-label="Add evidence">
        <select aria-label="Skill" className="input" value={f.skill} onChange={e => setF({ ...f, skill: e.target.value })}>{library.map(l => <option key={l.name}>{l.name}</option>)}</select>
        <select aria-label="Evidence type" className="input" value={f.type} onChange={e => setF({ ...f, type: e.target.value as Evidence['type'] })}>{['Demonstration', 'Certification', 'Experience'].map(t => <option key={t}>{t}</option>)}</select>
        <input aria-label="What does it show?" className="input" placeholder="What does it show?" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} />
        <input aria-label="Link (optional)" className="input" placeholder="Link (optional)" value={f.link} onChange={e => setF({ ...f, link: e.target.value })} />
        <button className="btn-primary" onClick={add}>Add evidence</button>{err && <p role="alert" className="text-xs text-[#d70015] md:col-span-5">{err}</p>}
      </section>
      <div className="space-y-3">{rows.map(l => { const st = statusFor(l.name, projects, ev, res, claimedSkills)
        return (<article key={l.name} className="glass p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-medium text-[#1d1d1f]">{l.name}</h2>
          <div className="flex items-center gap-2">
            {st === 'Claimed' && (
              <Link to={`/app/assessments?skill=${encodeURIComponent(l.name)}`} className="inline-flex items-center gap-1 rounded-lg bg-[#007AFF]/10 px-2.5 py-1 text-xs font-medium text-[#0062cc] hover:bg-[#007AFF]/20">
                <Sparkles size={12} /> Verify with Gemini Quiz
              </Link>
            )}
            <span className="rounded-full border border-black/[0.08] px-3 py-0.5 text-sm">{st}</span>
          </div></div>
          <ul className="mt-2 space-y-1 text-sm text-[#6e6e73]">
            {projects.filter(p => p.skills.includes(l.name)).map(p => <li key={p.id}>Project: {p.title}{p.link ? ' (linked)' : ' (no link)'}</li>)}
            {res.filter(r => r.skill === l.name).map(r => <li key={r.id}>Assessment: {r.assessment} — {r.score}/{r.total} on {r.date}</li>)}
            {ev.filter(e => e.skill === l.name).map(e => <li key={e.id} className="flex items-center gap-2">{e.type}: {e.note}{e.link && ' (linked)'}<button aria-label={`Remove evidence: ${e.note}`} onClick={() => setEv(ev.filter(x => x.id !== e.id))}><Trash2 size={13} className="text-[#d70015]" /></button></li>)}
            {st === 'Claimed' && <li>No evidence yet. Take a Gemini micro-quiz or add project evidence to upgrade to Practised.</li>}</ul></article>) })}</div>
    </div>
  )
}
