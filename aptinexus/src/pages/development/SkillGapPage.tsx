import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import CareerPicker from '../../components/careers/CareerPicker'
import AiAdvisorPanel from '../../components/ai/AiAdvisorPanel'
import { careers } from '../../data/careers'
import { byName, priorityOf, type Priority } from '../../data/skills'
import { gapsApi, profilesApi } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { loadProfile } from '../../data/profile'

const order: Priority[] = ['Essential', 'Recommended', 'Specialization-specific', 'Optional']
interface GapResult { strengths: string[]; missing: string[]; optional: string[]; method?: string }

export default function SkillGapPage() {
  const { user } = useAuth()
  const [sp, setSp] = useSearchParams()
  const career = careers.find(c => c.id === sp.get('career')) ?? careers[0]
  const [result, setResult] = useState<GapResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setResult(null)
    if (!user) return () => { active = false }
    profilesApi
      .get(user.id, loadProfile(user))
      .then(profile => gapsApi.analyse(career.id, profile.sections?.technical ?? []))
      .then(data => {
        if (active && data) setResult(data as GapResult)
        else if (active) setError('Could not calculate skill gaps.')
      })
      .catch(e => {
        if (active) setError(e instanceof Error ? e.message : 'Could not calculate skill gaps.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [career.id, user])

  const strengths = result?.strengths ?? []
  const missing = result?.missing ?? []
  const optional = result?.optional ?? []
  const items = [
    ...missing.map(s => ({ s, p: priorityOf(career, s) })),
    ...optional.map(s => ({ s, p: 'Optional' as Priority })),
  ]
  const coverage = career.required.length
    ? Math.round((strengths.length / career.required.length) * 100)
    : 0
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#1d1d1f]">Skill Gap Analysis</h1>
          <p className="text-sm text-[#6e6e73]">
            Compares skills in your saved profile and evidence with this career’s listed requirements.
          </p>
        </div>
        <CareerPicker value={career.id} onChange={id => setSp({ career: id })} />
      </div>
      {loading && <p className="glass p-4 text-sm text-[#6e6e73]">Calculating your skill gaps…</p>}
      {error && <p role="alert" className="text-sm text-[#d70015]">{error}</p>}
      {result && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="glass p-5">
            <p className="text-sm text-[#6e6e73]">Skill coverage</p>
            <p className="text-3xl text-[#1d1d1f]">{coverage}%</p>
            <div
              className="mt-2 h-2 rounded-full bg-black/[0.05]"
              role="progressbar"
              aria-valuenow={coverage}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-2 rounded-full bg-nexus-cyan" style={{ width: `${coverage}%` }} />
            </div>
            <p className="mt-3 text-xs text-[#6e6e73]">
              {strengths.length} of {career.required.length} required skills listed
            </p>
          </div>
          <section className="glass p-5 md:col-span-2">
            <h2 className="mb-2 font-medium text-[#1d1d1f]">Current strengths</h2>
            {strengths.length ? (
              <div className="flex flex-wrap gap-2">
                {strengths.map(s => (
                  <Link
                    key={s}
                    to={`/app/assessments?skill=${encodeURIComponent(s)}`}
                    className="rounded-full border border-emerald-400/30 px-3 py-1 text-sm hover:bg-emerald-500/10"
                  >
                    {s}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#6e6e73]">No matching skills are listed yet.</p>
            )}
          </section>
        </div>
      )}
      {result && missing.length === 0 && (
        <p className="glass p-5">Your profile lists every required skill for this career.</p>
      )}
      {order.map(p => {
        const g = items.filter(i => i.p === p)
        return (
          g.length > 0 && (
            <section key={p}>
              <h2 className="mb-2 font-medium text-[#1d1d1f]">{p}</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {g.map(({ s }) => {
                  const l = byName(s)
                  const need = l?.prereqs.filter(r => !strengths.includes(r)) ?? []
                  return (
                    <article key={s} className="glass p-4">
                      <div className="flex justify-between">
                        <h3 className="text-[#1d1d1f]">{s}</h3>
                        <span className="text-xs text-[#6e6e73]">{l?.difficulty}</span>
                      </div>
                      <p className="mt-1 text-sm">{l?.desc}</p>
                      <p className="mt-2 text-xs text-[#6e6e73]">
                        Depends on: {l?.prereqs.join(', ') || 'nothing'}
                        {need.length ? ` (not yet listed: ${need.join(', ')})` : ''}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-[#007AFF]">
                          Suggested project: a small {career.title.toLowerCase()} exercise using {s}.
                        </span>
                        <Link
                          to={`/app/assessments?skill=${encodeURIComponent(s)}`}
                          className="font-medium text-[#0062cc] hover:underline"
                        >
                          Take micro-quiz →
                        </Link>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          )
        )
      })}
      <AiAdvisorPanel focus="courses" focusCareerId={career.id} />
      <p className="glass p-4 text-sm">
        Recommended learning for this career: {career.learn.join(', ')}.
      </p>
      {result?.method && <p className="text-xs text-[#6e6e73]">{result.method}</p>}
    </div>
  )
}
