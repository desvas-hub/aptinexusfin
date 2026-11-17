import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Check, Compass, ExternalLink, RefreshCw, Sparkles, Wand2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { loadProfile, type ProfileData } from '../../data/profile'
import { aiApi, profilesApi } from '../../services/api'
import type {
  AiRecommendationsResult,
  ProfileCorrection,
  SkillNormalization,
} from '../../types'

interface AiAdvisorPanelProps {
  focus?: 'all' | 'careers' | 'courses'
  focusCareerId?: string
  onProfileUpdated?: (profile: ProfileData) => void
}

export default function AiAdvisorPanel({
  focus = 'all',
  focusCareerId,
  onProfileUpdated,
}: AiAdvisorPanelProps) {
  const { user } = useAuth()
  const toast = useToast()
  const [data, setData] = useState<AiRecommendationsResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [appliedKeys, setAppliedKeys] = useState<Set<string>>(new Set())

  const runAnalysis = async () => {
    if (!user || loading) return
    setLoading(true)
    setError('')
    try {
      const result = await aiApi.recommendations({ focus, focusCareerId })
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load Gemini AI recommendations.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runAnalysis()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, focus, focusCareerId])

  const applyCorrection = async (c: ProfileCorrection, key: string) => {
    if (!user) return
    try {
      const profile = await profilesApi.get(user.id, loadProfile(user))
      const next: ProfileData = {
        personal: { ...profile.personal },
        sections: { ...profile.sections },
      }
      if (c.section === 'name' || c.section === 'headline' || c.section === 'location') {
        next.personal[c.section] = c.suggestedValue
      } else {
        const list = [...(next.sections[c.section] ?? [])]
        if (!list.some(item => item.toLowerCase() === c.suggestedValue.toLowerCase())) {
          list.push(c.suggestedValue)
        }
        next.sections[c.section] = list
      }
      await profilesApi.save(user.id, next)
      setAppliedKeys(prev => new Set(prev).add(key))
      onProfileUpdated?.(next)
      toast.push(`Updated ${c.section} in your profile`)
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Could not update profile.', 'error')
    }
  }

  const applyNormalization = async (norm: SkillNormalization, key: string) => {
    if (!user) return
    try {
      const profile = await profilesApi.get(user.id, loadProfile(user))
      const tech = [...(profile.sections.technical ?? [])]
      const filtered = tech.filter(s => s.toLowerCase() !== norm.rawSkill.toLowerCase())
      if (!filtered.some(s => s.toLowerCase() === norm.canonicalSkill.toLowerCase())) {
        filtered.push(norm.canonicalSkill)
      }
      const next: ProfileData = {
        ...profile,
        sections: { ...profile.sections, technical: filtered },
      }
      await profilesApi.save(user.id, next)
      setAppliedKeys(prev => new Set(prev).add(key))
      onProfileUpdated?.(next)
      toast.push(`Normalized "${norm.rawSkill}" → "${norm.canonicalSkill}"`)
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Could not normalize skill.', 'error')
    }
  }

  const applyHeadline = async (headline: string, key: string) => {
    if (!user) return
    try {
      const profile = await profilesApi.get(user.id, loadProfile(user))
      const next: ProfileData = {
        ...profile,
        personal: { ...profile.personal, headline },
      }
      await profilesApi.save(user.id, next)
      setAppliedKeys(prev => new Set(prev).add(key))
      onProfileUpdated?.(next)
      toast.push('Headline updated in your profile')
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Could not update headline.', 'error')
    }
  }

  const showCareers = focus === 'all' || focus === 'careers'
  const showCourses = focus === 'all' || focus === 'courses'

  return (
    <section className="glass space-y-5 border border-[#007AFF]/25 p-5" aria-label="Gemini Career & Course Advisor">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#007AFF] to-[#AF52DE] text-white shadow-sm">
            <Sparkles size={17} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-[#1d1d1f]">Gemini Career &amp; Course Advisor</h2>
              {data?.generatedBy && (
                <span className="rounded-md border border-[#007AFF]/25 bg-[#007AFF]/10 px-2 py-0.5 text-[11px] font-medium text-[#0062cc]">
                  {data.generatedBy}
                </span>
              )}
            </div>
            <p className="text-xs text-[#6e6e73]">
              Live projection from your saved profile, portfolio projects, SkillProof evidence, and quiz results
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn-ghost !py-1.5 text-xs"
          disabled={loading}
          onClick={runAnalysis}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Analyzing…' : 'Refresh AI projection'}
        </button>
      </div>

      {loading && !data && (
        <div className="rounded-xl border border-black/[0.06] bg-black/[0.03] p-4 text-sm text-[#6e6e73]">
          Generating personalized career projections and course recommendations with Gemini…
        </div>
      )}

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d70015]/25 bg-[#d70015]/5 p-4 text-sm text-[#d70015]">
          <span>{error}</span>
          <button type="button" className="btn-ghost !py-1 text-xs" onClick={runAnalysis}>
            Retry
          </button>
        </div>
      )}

      {data && (
        <div className="space-y-5">
          <div className="rounded-xl border border-[#007AFF]/20 bg-[#007AFF]/5 p-4 text-sm text-[#1d1d1f]">
            {data.summary}
          </div>

          {showCareers && data.careerTargets.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Compass size={16} className="text-[#007AFF]" />
                <h3 className="text-sm font-semibold text-[#1d1d1f]">Dynamic Career Projections</h3>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {data.careerTargets.map(target => {
                  const hlKey = `hl-${target.careerId}`
                  return (
                    <article
                      key={target.careerId}
                      className="flex flex-col justify-between rounded-xl border border-black/[0.08] bg-white/70 p-4"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-medium text-[#1d1d1f]">{target.title}</h4>
                            <p className="text-xs text-[#6e6e73]">AI Projected Fit</p>
                          </div>
                          <div
                            className="ring-meter"
                            style={
                              {
                                '--p': target.fitScore,
                                '--c':
                                  target.fitScore >= 70
                                    ? '#34C759'
                                    : target.fitScore >= 45
                                      ? '#007AFF'
                                      : '#FF9F0A',
                              } as React.CSSProperties
                            }
                          >
                            {target.fitScore}%
                          </div>
                        </div>

                        <p className="text-xs text-[#3a3a3c]">{target.rationale}</p>

                        {target.bridgeSkills.length > 0 && (
                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-wider text-[#6e6e73]">
                              High-Impact Bridge Skills
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {target.bridgeSkills.map(bs => (
                                <Link
                                  key={bs}
                                  to={`/app/assessments?skill=${encodeURIComponent(bs)}`}
                                  className="rounded-md border border-[#007AFF]/25 bg-[#007AFF]/10 px-2 py-0.5 text-xs text-[#0062cc] hover:bg-[#007AFF]/20"
                                >
                                  {bs}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {target.missingCoreSkills.length > 0 && (
                          <p className="text-xs text-[#6e6e73]">
                            Missing core:{' '}
                            <span className="text-[#b25000]">{target.missingCoreSkills.join(', ')}</span>
                          </p>
                        )}

                        {target.suggestedHeadline && (
                          <div className="rounded-lg border border-black/[0.06] bg-black/[0.03] p-2 text-xs">
                            <p className="text-[#6e6e73]">Suggested headline:</p>
                            <p className="font-medium text-[#1d1d1f]">“{target.suggestedHeadline}”</p>
                            <button
                              type="button"
                              disabled={appliedKeys.has(hlKey)}
                              onClick={() => applyHeadline(target.suggestedHeadline!, hlKey)}
                              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#007AFF] hover:underline disabled:opacity-50"
                            >
                              {appliedKeys.has(hlKey) ? (
                                <>
                                  <Check size={12} /> Applied
                                </>
                              ) : (
                                <>
                                  <Wand2 size={12} /> Apply headline
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 border-t border-black/[0.06] pt-3">
                        <Link
                          to={`/app/careers/${target.careerId}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#007AFF] hover:underline"
                        >
                          Role details <ArrowRight size={12} />
                        </Link>
                        <Link
                          to={`/app/gaps?career=${target.careerId}`}
                          className="inline-flex items-center gap-1 text-xs text-[#6e6e73] hover:text-[#1d1d1f]"
                        >
                          Gap analysis
                        </Link>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          )}

          {showCourses && data.courseRecommendations.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-[#AF52DE]" />
                <h3 className="text-sm font-semibold text-[#1d1d1f]">
                  Recommended Courses &amp; Technical Resources
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.courseRecommendations.map((course, idx) => (
                  <article
                    key={`${course.title}-${idx}`}
                    className="flex flex-col justify-between rounded-xl border border-black/[0.08] bg-white/70 p-4"
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-[#6e6e73]">
                          {course.type} · {course.level} · <strong className="text-[#1d1d1f]">{course.skill}</strong>
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                            course.priority === 'Immediate'
                              ? 'bg-[#007AFF]/15 text-[#0062cc]'
                              : course.priority === 'Next'
                                ? 'bg-[#AF52DE]/15 text-[#8944ab]'
                                : 'bg-black/[0.06] text-[#6e6e73]'
                          }`}
                        >
                          {course.priority}
                        </span>
                      </div>
                      <h4 className="mt-1.5 font-medium text-[#1d1d1f]">{course.title}</h4>
                      <p className="mt-1 text-xs text-[#3a3a3c]">{course.reason}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-black/[0.06] pt-2.5 text-xs">
                      <span className="text-[#6e6e73]">For: {course.targetCareerTitle}</span>
                      <a
                        href={course.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 font-medium text-[#007AFF] hover:underline"
                      >
                        Open resource <ExternalLink size={12} />
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {focus === 'all' &&
            (data.profileCorrections.length > 0 || data.skillNormalizations.length > 0) && (
              <div className="grid gap-4 md:grid-cols-2">
                {data.profileCorrections.length > 0 && (
                  <div className="rounded-xl border border-black/[0.08] bg-white/70 p-4">
                    <h3 className="text-sm font-semibold text-[#1d1d1f]">
                      Suggested Profile Enhancements
                    </h3>
                    <ul className="mt-2.5 space-y-2.5 text-xs">
                      {data.profileCorrections.map((c, idx) => {
                        const key = `corr-${c.section}-${idx}`
                        const done = appliedKeys.has(key)
                        return (
                          <li
                            key={key}
                            className="flex items-start justify-between gap-3 rounded-lg bg-black/[0.04] p-2.5"
                          >
                            <div>
                              <span className="font-semibold uppercase tracking-wider text-[#0062cc]">
                                {c.section}
                              </span>
                              <p className="mt-0.5 font-medium text-[#1d1d1f]">{c.suggestedValue}</p>
                              <p className="mt-0.5 text-[#6e6e73]">{c.reason}</p>
                            </div>
                            <button
                              type="button"
                              disabled={done}
                              onClick={() => applyCorrection(c, key)}
                              className="btn-ghost flex-none !px-2.5 !py-1 text-xs"
                            >
                              {done ? (
                                <>
                                  <Check size={12} className="text-[#248a3d]" /> Added
                                </>
                              ) : (
                                'Accept'
                              )}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}

                {data.skillNormalizations.length > 0 && (
                  <div className="rounded-xl border border-black/[0.08] bg-white/70 p-4">
                    <h3 className="text-sm font-semibold text-[#1d1d1f]">
                      Canonical Skill Normalizations
                    </h3>
                    <ul className="mt-2.5 space-y-2.5 text-xs">
                      {data.skillNormalizations.map((n, idx) => {
                        const key = `norm-${n.rawSkill}-${idx}`
                        const done = appliedKeys.has(key)
                        return (
                          <li
                            key={key}
                            className="flex items-start justify-between gap-3 rounded-lg bg-black/[0.04] p-2.5"
                          >
                            <div>
                              <p className="font-medium text-[#1d1d1f]">
                                {n.rawSkill} → <span className="text-[#0062cc]">{n.canonicalSkill}</span>
                              </p>
                              <p className="mt-0.5 text-[#6e6e73]">{n.reason}</p>
                            </div>
                            <button
                              type="button"
                              disabled={done}
                              onClick={() => applyNormalization(n, key)}
                              className="btn-ghost flex-none !px-2.5 !py-1 text-xs"
                            >
                              {done ? (
                                <>
                                  <Check size={12} className="text-[#248a3d]" /> Normalized
                                </>
                              ) : (
                                'Normalize'
                              )}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}
        </div>
      )}
    </section>
  )
}
