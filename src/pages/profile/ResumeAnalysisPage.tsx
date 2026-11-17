import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, CheckCheck, Compass, FileUp, Sparkles, Wand2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { careers } from '../../data/careers'
import { loadProfile, sectionDefs, validateResume, type ProfileData } from '../../data/profile'
import { profilesApi, resumeApi } from '../../services/api'
import type {
  ProfileCorrection,
  ProfileSectionId,
  ResumeAnalysis,
  ResumeSuggestion,
  SkillNormalization,
  User,
} from '../../types'

const sectionLabels: Record<ProfileSectionId, string> = {
  name: 'Full name',
  headline: 'Headline',
  location: 'Location',
  education: 'Education',
  subjects: 'Academic subjects',
  technical: 'Technical skills',
  soft: 'Soft skills',
  interests: 'Interests',
  experience: 'Work experience',
  projects: 'Projects',
  certifications: 'Certifications',
  achievements: 'Achievements',
  goals: 'Career goals',
}

export default function ResumeAnalysisPage() {
  const user = useAuth().user as User
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [err, setErr] = useState('')
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null)
  const [busy, setBusy] = useState(false)
  const [acceptedKeys, setAcceptedKeys] = useState<Set<string>>(new Set())
  const [msg, setMsg] = useState('')

  const pick = (f?: File) => {
    if (!f) return
    const e = validateResume(f)
    setErr(e ?? '')
    setFile(e ? null : f)
    setAnalysis(null)
    setAcceptedKeys(new Set())
    setMsg('')
  }

  const run = async () => {
    if (!file || busy) return
    setBusy(true)
    setErr('')
    setAnalysis(null)
    setAcceptedKeys(new Set())
    setMsg('')
    try {
      const result = await resumeApi.analyse(file)
      setAnalysis(result)
      toast.push('Resume analyzed with Gemini AI')
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Could not analyse this resume.')
    } finally {
      setBusy(false)
    }
  }

  const applyItemToProfile = (p: ProfileData, section: ProfileSectionId, value: string): boolean => {
    const clean = value.trim()
    if (!clean) return false
    if (section === 'name' || section === 'headline' || section === 'location') {
      if (p.personal[section] === clean) return false
      p.personal[section] = clean
      return true
    }
    const list = [...(p.sections[section] ?? [])]
    if (list.some(x => x.toLowerCase() === clean.toLowerCase())) return false
    list.push(clean)
    p.sections[section] = list
    return true
  }

  const acceptSuggestion = async (s: ResumeSuggestion, key: string) => {
    try {
      const p = await profilesApi.get(user.id, loadProfile(user))
      const next: ProfileData = {
        personal: { ...p.personal },
        sections: { ...p.sections },
      }
      const changed = applyItemToProfile(next, s.section, s.item)
      await profilesApi.save(user.id, next)
      setAcceptedKeys(prev => new Set(prev).add(key))
      toast.push(changed ? `Added to ${sectionLabels[s.section] || s.section}` : 'Already in your profile')
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Could not update profile.', 'error')
    }
  }

  const acceptCorrection = async (c: ProfileCorrection, key: string) => {
    try {
      const p = await profilesApi.get(user.id, loadProfile(user))
      const next: ProfileData = {
        personal: { ...p.personal },
        sections: { ...p.sections },
      }
      applyItemToProfile(next, c.section, c.suggestedValue)
      await profilesApi.save(user.id, next)
      setAcceptedKeys(prev => new Set(prev).add(key))
      toast.push(`Updated ${sectionLabels[c.section] || c.section}`)
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Could not update profile.', 'error')
    }
  }

  const acceptNormalization = async (n: SkillNormalization, key: string) => {
    try {
      const p = await profilesApi.get(user.id, loadProfile(user))
      const tech = [...(p.sections.technical ?? [])].filter(
        s => s.toLowerCase() !== n.rawSkill.toLowerCase()
      )
      if (!tech.some(s => s.toLowerCase() === n.canonicalSkill.toLowerCase())) {
        tech.push(n.canonicalSkill)
      }
      const next: ProfileData = {
        personal: { ...p.personal },
        sections: { ...p.sections, technical: tech },
      }
      await profilesApi.save(user.id, next)
      setAcceptedKeys(prev => new Set(prev).add(key))
      toast.push(`Added canonical skill: ${n.canonicalSkill}`)
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Could not normalize skill.', 'error')
    }
  }

  const acceptAll = async () => {
    if (!analysis) return
    try {
      const p = await profilesApi.get(user.id, loadProfile(user))
      const next: ProfileData = {
        personal: { ...p.personal },
        sections: { ...p.sections },
      }
      const nextAccepted = new Set(acceptedKeys)
      let count = 0

      // 1. Apply all extracted items across all 10 sections
      for (const def of sectionDefs) {
        const items = analysis.extracted?.[def.id] ?? []
        for (const item of items) {
          if (applyItemToProfile(next, def.id as ProfileSectionId, item)) count++
        }
      }

      // 2. Apply all suggestions
      analysis.suggestions.forEach((s, idx) => {
        const key = `sug-${idx}`
        if (applyItemToProfile(next, s.section, s.item)) count++
        nextAccepted.add(key)
      })

      // 3. Apply all profile corrections
      ;(analysis.profileCorrections ?? []).forEach((c, idx) => {
        const key = `corr-${idx}`
        if (applyItemToProfile(next, c.section, c.suggestedValue)) count++
        nextAccepted.add(key)
      })

      // 4. Apply all canonical skill normalizations
      ;(analysis.skillNormalizations ?? []).forEach((n, idx) => {
        const key = `norm-${idx}`
        const tech = [...(next.sections.technical ?? [])].filter(
          s => s.toLowerCase() !== n.rawSkill.toLowerCase()
        )
        if (!tech.some(s => s.toLowerCase() === n.canonicalSkill.toLowerCase())) {
          tech.push(n.canonicalSkill)
          count++
        }
        next.sections.technical = tech
        nextAccepted.add(key)
      })

      await profilesApi.save(user.id, next)
      setAcceptedKeys(nextAccepted)
      setMsg(`Saved ${count} resume update${count === 1 ? '' : 's'} to your live profile.`)
      toast.push('All resume items saved to your profile')
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Could not save all items.', 'error')
    }
  }

  const recommendedCareers = (analysis?.recommendedCareerIds ?? [])
    .map(id => careers.find(c => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#1d1d1f]">Resume Analysis</h1>
          <p className="text-sm text-[#6e6e73]">
            Upload a PDF or DOCX resume (max 5 MB) for Gemini AI profile extraction, skill normalization, and career matching.
          </p>
        </div>
        {analysis && (
          <button type="button" className="btn-primary" onClick={acceptAll}>
            <CheckCheck size={16} /> Accept all to profile
          </button>
        )}
      </div>

      <div
        className="glass flex flex-col items-center gap-3 border-dashed p-8 text-center"
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault()
          pick(e.dataTransfer.files[0])
        }}
      >
        <FileUp className="text-[#007AFF]" size={28} />
        <input
          ref={input}
          type="file"
          className="sr-only"
          aria-label="Choose resume file"
          accept=".pdf,.docx"
          onChange={e => pick(e.target.files?.[0])}
        />
        <button type="button" className="btn-ghost" onClick={() => input.current?.click()}>
          Choose a PDF or DOCX file
        </button>
        {file && (
          <p className="text-sm text-[#1d1d1f]">
            {file.name}{' '}
            <span className="text-[#6e6e73]">
              · {(file.size / 1024).toFixed(0)} KB · {file.name.split('.').pop()?.toUpperCase()}
            </span>
          </p>
        )}
        {err && (
          <p role="alert" className="text-sm text-[#d70015]">
            {err}
          </p>
        )}
        {file && (
          <button type="button" className="btn-primary" disabled={busy} onClick={run}>
            <Sparkles size={15} />
            {busy ? 'Analyzing with Gemini…' : 'Analyse resume with Gemini'}
          </button>
        )}
      </div>

      {msg && (
        <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-[#248a3d]">
          {msg}{' '}
          <Link to="/app/profile" className="ml-2 font-medium underline">
            View My Profile →
          </Link>
        </div>
      )}

      {analysis && (
        <div className="space-y-5">
          {/* Executive Summary */}
          <section className="glass space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles size={17} className="text-[#007AFF]" />
                <h2 className="font-semibold text-[#1d1d1f]">Gemini Resume Summary</h2>
              </div>
              {analysis.generatedBy && (
                <span className="rounded-md border border-[#007AFF]/25 bg-[#007AFF]/10 px-2 py-0.5 text-xs font-medium text-[#0062cc]">
                  Model: {analysis.generatedBy}
                </span>
              )}
            </div>
            <p className="text-sm text-[#3a3a3c]">{analysis.summary}</p>

            {recommendedCareers.length > 0 && (
              <div className="pt-2">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#6e6e73]">
                  Top Matching Career Paths
                </p>
                <div className="flex flex-wrap gap-2">
                  {recommendedCareers.map(c => (
                    <Link
                      key={c.id}
                      to={`/app/careers/${c.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#007AFF]/25 bg-[#007AFF]/10 px-3 py-1.5 text-xs font-medium text-[#0062cc] hover:bg-[#007AFF]/20"
                    >
                      <Compass size={13} /> {c.title}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Suggestions to Add */}
          {analysis.suggestions.length > 0 && (
            <section className="glass space-y-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-[#1d1d1f]">
                    Suggested Profile Additions ({analysis.suggestions.length})
                  </h2>
                  <p className="text-xs text-[#6e6e73]">
                    Items extracted from your resume that aren’t yet in your saved profile.
                  </p>
                </div>
                <button type="button" className="btn-ghost !py-1.5 text-xs" onClick={acceptAll}>
                  <CheckCheck size={14} /> Accept all
                </button>
              </div>
              <ul className="space-y-2">
                {analysis.suggestions.map((s, idx) => {
                  const key = `sug-${idx}`
                  const accepted = acceptedKeys.has(key)
                  return (
                    <li
                      key={key}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/[0.08] bg-white/70 p-3 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-[#007AFF]/10 px-2 py-0.5 text-xs font-medium text-[#0062cc]">
                            {sectionLabels[s.section] || s.section}
                          </span>
                          <span className="font-medium text-[#1d1d1f]">{s.item}</span>
                        </div>
                        {s.reason && <p className="mt-1 text-xs text-[#6e6e73]">{s.reason}</p>}
                      </div>
                      <button
                        type="button"
                        disabled={accepted}
                        onClick={() => acceptSuggestion(s, key)}
                        className="btn-ghost !px-3 !py-1.5 text-xs"
                      >
                        {accepted ? (
                          <>
                            <Check size={14} className="text-[#248a3d]" /> Accepted
                          </>
                        ) : (
                          'Accept'
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {/* Profile Corrections & Skill Normalizations */}
          {((analysis.profileCorrections?.length ?? 0) > 0 ||
            (analysis.skillNormalizations?.length ?? 0) > 0) && (
            <div className="grid gap-4 md:grid-cols-2">
              {(analysis.profileCorrections?.length ?? 0) > 0 && (
                <section className="glass space-y-3 p-5">
                  <h2 className="font-semibold text-[#1d1d1f]">Profile Corrections &amp; Refinements</h2>
                  <ul className="space-y-2.5 text-sm">
                    {analysis.profileCorrections!.map((c, idx) => {
                      const key = `corr-${idx}`
                      const accepted = acceptedKeys.has(key)
                      return (
                        <li
                          key={key}
                          className="flex items-start justify-between gap-3 rounded-xl border border-black/[0.08] bg-white/70 p-3"
                        >
                          <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-[#0062cc]">
                              {sectionLabels[c.section] || c.section}
                            </span>
                            <p className="mt-0.5 font-medium text-[#1d1d1f]">{c.suggestedValue}</p>
                            <p className="mt-0.5 text-xs text-[#6e6e73]">{c.reason}</p>
                          </div>
                          <button
                            type="button"
                            disabled={accepted}
                            onClick={() => acceptCorrection(c, key)}
                            className="btn-ghost flex-none !px-2.5 !py-1 text-xs"
                          >
                            {accepted ? (
                              <>
                                <Check size={13} className="text-[#248a3d]" /> Accepted
                              </>
                            ) : (
                              <>
                                <Wand2 size={13} /> Accept
                              </>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}

              {(analysis.skillNormalizations?.length ?? 0) > 0 && (
                <section className="glass space-y-3 p-5">
                  <h2 className="font-semibold text-[#1d1d1f]">Canonical Skill Normalizations</h2>
                  <ul className="space-y-2.5 text-sm">
                    {analysis.skillNormalizations!.map((n, idx) => {
                      const key = `norm-${idx}`
                      const accepted = acceptedKeys.has(key)
                      return (
                        <li
                          key={key}
                          className="flex items-start justify-between gap-3 rounded-xl border border-black/[0.08] bg-white/70 p-3"
                        >
                          <div>
                            <p className="font-medium text-[#1d1d1f]">
                              {n.rawSkill} → <span className="text-[#0062cc]">{n.canonicalSkill}</span>
                            </p>
                            <p className="mt-0.5 text-xs text-[#6e6e73]">{n.reason}</p>
                          </div>
                          <button
                            type="button"
                            disabled={accepted}
                            onClick={() => acceptNormalization(n, key)}
                            className="btn-ghost flex-none !px-2.5 !py-1 text-xs"
                          >
                            {accepted ? (
                              <>
                                <Check size={13} className="text-[#248a3d]" /> Accepted
                              </>
                            ) : (
                              'Accept'
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}
            </div>
          )}

          {/* Extracted Sections Breakdown */}
          <section className="glass space-y-3 p-5">
            <h2 className="font-semibold text-[#1d1d1f]">Extracted Resume Sections</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {sectionDefs.map(def => {
                const list = analysis.extracted?.[def.id] ?? []
                return (
                  <div
                    key={def.id}
                    className="rounded-xl border border-black/[0.08] bg-white/60 p-3.5 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-[#1d1d1f]">{def.title}</h3>
                      <span className="text-xs text-[#6e6e73]">{list.length} item(s)</span>
                    </div>
                    {list.length > 0 ? (
                      <ul className="mt-2 space-y-1 text-xs text-[#3a3a3c]">
                        {list.map((item, i) => (
                          <li key={`${def.id}-${i}`} className="flex items-center justify-between gap-2">
                            <span className="truncate">• {item}</span>
                            <button
                              type="button"
                              onClick={() =>
                                acceptSuggestion(
                                  { section: def.id as ProfileSectionId, item },
                                  `ext-${def.id}-${i}`
                                )
                              }
                              disabled={acceptedKeys.has(`ext-${def.id}-${i}`)}
                              className="flex-none text-[11px] font-medium text-[#007AFF] hover:underline disabled:text-[#248a3d]"
                            >
                              {acceptedKeys.has(`ext-${def.id}-${i}`) ? 'Added' : '+ Add'}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1.5 text-xs text-[#86868b]">Not detected in resume</p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
