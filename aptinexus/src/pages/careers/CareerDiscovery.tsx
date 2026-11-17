import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import AiAdvisorPanel from '../../components/ai/AiAdvisorPanel'
import { careersApi, matchingApi, profilesApi } from '../../services/api'
import type { Career } from '../../data/careers'
import { useAuth } from '../../contexts/AuthContext'
import { loadProfile } from '../../data/profile'
import type { CareerMatch } from '../../types'

export default function CareerDiscovery() {
  const { user } = useAuth()
  const [careers, setCareers] = useState<Career[]>([])
  const [matches, setMatches] = useState<CareerMatch[]>([])
  const [cat, setCat] = useState('All')
  const [open, setOpen] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    if (!user) return
    profilesApi
      .get(user.id, loadProfile(user))
      .then(profile =>
        Promise.all([
          careersApi.list(),
          matchingApi.recommendations(profile.sections?.technical ?? []),
        ])
      )
      .then(([catalog, result]) => {
        if (!active) return
        setCareers(catalog as Career[])
        setMatches(result as CareerMatch[])
      })
      .catch(e => {
        if (active)
          setError(e instanceof Error ? e.message : 'Could not load career recommendations.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [user])

  const cats = ['All', ...Array.from(new Set(careers.map(c => c.category)))]
  const byId = useMemo(() => new Map(matches.map(m => [m.id, m])), [matches])
  const list = useMemo(
    () =>
      careers
        .filter(c => cat === 'All' || c.category === cat)
        .sort((a, b) => (byId.get(b.id)?.compatibility ?? 0) - (byId.get(a.id)?.compatibility ?? 0)),
    [cat, careers, byId]
  )

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-[#1d1d1f]">Career Discovery</h1>
        <p className="text-sm text-[#6e6e73]">
          Matches compare the skills in your profile, projects, and verified quizzes with each career’s requirements.
        </p>
      </div>

      <AiAdvisorPanel focus="careers" />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        {cats.map(c => (
          <button
            key={c}
            aria-pressed={cat === c}
            onClick={() => setCat(c)}
            className={`btn-ghost !py-1.5 ${cat === c ? 'bg-[#007AFF]/10 text-[#007AFF]' : ''}`}
          >
            {c}
          </button>
        ))}
      </div>
      {loading && <p className="glass p-5 text-sm text-[#6e6e73]">Calculating your career matches…</p>}
      {error && <p role="alert" className="text-sm text-[#d70015]">{error}</p>}
      {!loading && list.length === 0 && <p className="glass p-6">No careers in this category yet.</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {list.map(c => {
          const match = byId.get(c.id)
          const have = match?.matched ?? []
          const miss = match?.missing ?? c.required
          const compatibility = match?.compatibility
          const isOpen = open === c.id
          return (
            <article key={c.id} className="glass p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-medium text-[#1d1d1f]">{c.title}</h2>
                  <p className="text-xs text-[#6e6e73]">{c.category}</p>
                </div>
                {compatibility === undefined ? (
                  <span className="text-xs text-[#6e6e73]">Match unavailable</span>
                ) : (
                  <div
                    className="ring-meter"
                    style={
                      {
                        '--p': compatibility,
                        '--c':
                          compatibility >= 70
                            ? '#34C759'
                            : compatibility >= 50
                              ? '#007AFF'
                              : '#FF9F0A',
                      } as React.CSSProperties
                    }
                    title="Profile match"
                    aria-label={`Profile match ${compatibility} percent`}
                  >
                    {compatibility}%
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs text-[#6e6e73]">Matching skills</p>
              <p className="text-sm text-[#1d1d1f]">{have.join(', ') || 'None yet'}</p>
              <p className="mt-2 text-xs text-[#6e6e73]">Missing skills</p>
              <p className="text-sm text-[#b25000]">{miss.join(', ') || 'None'}</p>
              <button
                className="btn-ghost mt-4 !py-1.5"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : c.id)}
              >
                {isOpen ? 'Hide details' : 'Why this career'}
                <ChevronDown size={14} className={isOpen ? 'rotate-180' : ''} />
              </button>
              <Link to={`/app/careers/${c.id}`} className="btn-primary ml-2 mt-4 !py-1.5">
                Explore career
              </Link>
              {isOpen && (
                <div className="mt-3 space-y-2 text-sm">
                  <p>{c.why}</p>
                  <p className="text-[#6e6e73]">
                    To get there: <span className="text-[#3a3a3c]">{c.learn.join(', ')}</span>
                  </p>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
