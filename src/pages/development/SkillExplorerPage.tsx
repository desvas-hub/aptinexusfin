import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Sparkles, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { careers } from '../../data/careers'
import { statusFor, type Evidence, type Project, type Result } from '../../data/evidence'
import { loadProfile } from '../../data/profile'
import type { LibSkill } from '../../data/skills'
import { useRemote } from '../../hooks/useRemote'
import { profilesApi, skillsApi } from '../../services/api'

export default function SkillExplorerPage() {
  const { user } = useAuth()
  const uid = user?.id
  const [projects] = useRemote<Project[]>('projects', uid, [])
  const [ev] = useRemote<Evidence[]>('evidence', uid, [])
  const [res] = useRemote<Result[]>('results', uid, [])
  const [claimedSkills, setClaimedSkills] = useState<string[]>([])

  const [library, setLibrary] = useState<LibSkill[]>([])
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All')
  const [sel, setSel] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    skillsApi
      .list()
      .then(items => {
        if (active) setLibrary(items as LibSkill[])
      })
      .catch(e => {
        if (active) setError(e instanceof Error ? e.message : 'Could not load skills.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!user) return
    let active = true
    profilesApi
      .get(user.id, loadProfile(user))
      .then(p => {
        if (active) setClaimedSkills(p.sections?.technical ?? [])
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [user])

  const cats = ['All', ...Array.from(new Set(library.map(s => s.category)))]
  const list = useMemo(
    () =>
      library.filter(
        s =>
          (cat === 'All' || s.category === cat) &&
          s.name.toLowerCase().includes(q.toLowerCase())
      ),
    [library, q, cat]
  )
  const skill = sel ? library.find(s => s.name === sel) : null

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setSel(null)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-[#1d1d1f]">Skill Explorer</h1>
        <p className="text-sm text-[#6e6e73]">
          Browse skills, their live SkillProof status in your profile, prerequisites, and the careers that use them.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-3 text-[#6e6e73]" />
          <input
            className="input w-56 pl-9"
            placeholder="Search skills"
            aria-label="Search skills"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
        <select
          className="input !w-auto"
          aria-label="Category"
          value={cat}
          onChange={e => setCat(e.target.value)}
        >
          {cats.map(c => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      {loading && <p className="glass p-5 text-sm text-[#6e6e73]">Loading skills…</p>}
      {error && (
        <p role="alert" className="text-sm text-[#d70015]">
          {error}
        </p>
      )}
      {!loading && list.length === 0 && (
        <p className="glass p-6">No skills match “{q}”. Try a different search or category.</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map(s => {
          const st = statusFor(s.name, projects, ev, res, claimedSkills)
          return (
            <button
              key={s.name}
              onClick={() => setSel(s.name)}
              className="glass p-4 text-left hover:bg-white/90"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-[#1d1d1f]">{s.name}</span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                    st === 'Demonstrated'
                      ? 'bg-emerald-500/15 text-[#248a3d]'
                      : st === 'Practised'
                        ? 'bg-[#007AFF]/15 text-[#0062cc]'
                        : st === 'Claimed'
                          ? 'bg-amber-500/15 text-[#b25000]'
                          : 'bg-black/[0.05] text-[#6e6e73]'
                  }`}
                >
                  {st}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#6e6e73]">
                {s.category} · {s.difficulty}
              </p>
              <p className="mt-2 text-sm">{s.desc}</p>
            </button>
          )
        })}
      </div>
      {skill && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/25 p-4"
          onClick={() => setSel(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={skill.name}
            className="glass max-h-[85vh] w-full max-w-md overflow-y-auto bg-white/85 p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between">
              <h2 className="text-lg font-semibold text-[#1d1d1f]">{skill.name}</h2>
              <button aria-label="Close" onClick={() => setSel(null)}>
                <X size={18} />
              </button>
            </div>
            <p className="mt-1 text-xs text-[#6e6e73]">
              {skill.category} · {skill.difficulty} ·{' '}
              <strong className="text-[#1d1d1f]">
                {statusFor(skill.name, projects, ev, res, claimedSkills)}
              </strong>
            </p>
            <p className="mt-3 text-sm">{skill.desc}</p>
            <p className="mt-3 text-sm">
              <span className="text-[#6e6e73]">Prerequisites: </span>
              {skill.prereqs.join(', ') || 'None'}
            </p>
            <p className="mt-2 text-sm">
              <span className="text-[#6e6e73]">Related skills: </span>
              {skill.related.join(', ')}
            </p>
            <p className="mt-2 text-sm">
              <span className="text-[#6e6e73]">Careers: </span>
              {careers
                .filter(c => c.required.includes(skill.name))
                .map(c => c.title)
                .join(', ') || 'None in the catalog'}
            </p>
            <div className="mt-4 pt-3 border-t border-black/[0.08]">
              <Link
                to={`/app/assessments?skill=${encodeURIComponent(skill.name)}`}
                className="btn-primary w-full"
              >
                <Sparkles size={15} /> Verify {skill.name} with Gemini Micro-Quiz
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
