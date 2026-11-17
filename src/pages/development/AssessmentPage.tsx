import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BadgeCheck, CheckCircle2, Sparkles, XCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import type { Assessment } from '../../data/assessments'
import { statusFor, type Evidence, type Project, type Result } from '../../data/evidence'
import { loadProfile } from '../../data/profile'
import { library } from '../../data/skills'
import { useRemote } from '../../hooks/useRemote'
import { aiApi, assessmentsApi, profilesApi } from '../../services/api'
import type { SkillMicroQuiz, SkillMicroQuizSubmission } from '../../types'

export default function AssessmentPage() {
  const { user } = useAuth()
  const uid = user?.id
  const toast = useToast()
  const [sp, setSp] = useSearchParams()
  const requestedSkill = sp.get('skill')

  const [res, setRes] = useRemote<Result[]>('results', uid, [])
  const [projects] = useRemote<Project[]>('projects', uid, [])
  const [ev] = useRemote<Evidence[]>('evidence', uid, [])
  const [claimedSkills, setClaimedSkills] = useState<string[]>([])
  const [selectedAiSkill, setSelectedAiSkill] = useState<string>(library[0]?.name || 'Python')

  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Standard catalog assessment state
  const [a, setA] = useState<Assessment | null>(null)
  const [i, setI] = useState(0)
  const [ans, setAns] = useState<number[]>([])
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [score, setScore] = useState(0)
  const [reviewAnswers, setReviewAnswers] = useState<number[]>([])
  const [note, setNote] = useState('')

  // Gemini AI micro-quiz state
  const [aiQuiz, setAiQuiz] = useState<SkillMicroQuiz | null>(null)
  const [aiQuizBusy, setAiQuizBusy] = useState(false)
  const [aiQuizError, setAiQuizError] = useState('')
  const [aiStep, setAiStep] = useState(0)
  const [aiAns, setAiAns] = useState<number[]>([])
  const [aiSub, setAiSub] = useState<SkillMicroQuizSubmission | null>(null)

  useEffect(() => {
    let active = true
    assessmentsApi
      .list()
      .then(items => {
        if (active) setAssessments(items)
      })
      .catch(error => {
        if (active)
          setLoadError(error instanceof Error ? error.message : 'Could not load assessments.')
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
      .then(profile => {
        if (!active) return
        const tech = profile.sections?.technical ?? []
        setClaimedSkills(tech)
        if (requestedSkill) {
          setSelectedAiSkill(requestedSkill)
        } else if (tech.length > 0) {
          setSelectedAiSkill(tech[0])
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [user, requestedSkill])

  const startAiQuiz = async (skillName: string) => {
    const target = skillName.trim()
    if (!target || aiQuizBusy) return
    setA(null)
    setAiQuiz(null)
    setAiSub(null)
    setAiQuizError('')
    setAiQuizBusy(true)
    try {
      const quiz = await aiApi.generateSkillQuiz(target)
      setAiQuiz(quiz)
      setAiStep(0)
      setAiAns(Array(quiz.questions.length).fill(-1))
      if (sp.get('skill')) {
        setSp({}, { replace: true })
      }
    } catch (error) {
      setAiQuizError(
        error instanceof Error ? error.message : 'Could not generate Gemini micro-quiz.'
      )
    } finally {
      setAiQuizBusy(false)
    }
  }

  useEffect(() => {
    if (requestedSkill && user && !aiQuiz && !aiQuizBusy) {
      startAiQuiz(requestedSkill)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedSkill, user?.id])

  const submitAiQuiz = async () => {
    if (!aiQuiz || busy) return
    setBusy(true)
    try {
      const result = await aiApi.submitSkillQuiz(aiQuiz.quizToken, aiAns)
      setAiSub(result)
      setRes([
        ...res,
        {
          id: Date.now().toString(36),
          assessment: `${aiQuiz.skill} (Gemini Micro-Quiz)`,
          skill: aiQuiz.skill,
          score: result.score,
          total: result.total,
          date: new Date().toLocaleDateString(),
        },
      ])
      toast.push(
        result.verified
          ? `${aiQuiz.skill} verified & upgraded to Practised!`
          : 'Micro-quiz submitted'
      )
    } catch (error) {
      toast.push(
        error instanceof Error ? error.message : 'Could not submit micro-quiz.',
        'error'
      )
    } finally {
      setBusy(false)
    }
  }

  const begin = (x: Assessment) => {
    setAiQuiz(null)
    setAiSub(null)
    setA(x)
    setI(0)
    setAns(Array(x.questions.length).fill(-1))
    setDone(false)
    setScore(0)
    setReviewAnswers([])
    setNote('')
  }

  const submit = async () => {
    if (!a || busy) return
    setBusy(true)
    try {
      const result = await assessmentsApi.submit(a.id, ans)
      setScore(result.score)
      setReviewAnswers(result.correctAnswers)
      setNote(result.feedback)
      setDone(true)
      setRes([
        ...res,
        {
          id: Date.now().toString(36),
          assessment: a.title,
          skill: a.skill,
          score: result.score,
          total: result.total,
          date: new Date().toLocaleDateString(),
        },
      ])
      toast.push('Quiz submitted')
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not submit assessment.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const allSkillOptions = Array.from(
    new Set([...claimedSkills, ...library.map(l => l.name)])
  )

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-[#1d1d1f]">Assessment Centre</h1>
        <p className="text-sm text-[#6e6e73]">
          Verify claimed skills with live 4-question Gemini scenario micro-tests or take foundational practice quizzes. Scoring 70% or higher upgrades a skill from Claimed to Practised across AptiNexus.
        </p>
      </div>

      {/* Gemini AI Scenario Micro-Tests Section */}
      {!a && !aiQuiz && (
        <section className="glass space-y-4 border border-[#007AFF]/25 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#007AFF] to-[#AF52DE] text-white shadow-sm">
                <Sparkles size={17} />
              </span>
              <div>
                <h2 className="font-semibold text-[#1d1d1f]">
                  Gemini Scenario Micro-Test (Skill Verification)
                </h2>
                <p className="text-xs text-[#6e6e73]">
                  4 scenario-based multiple-choice questions · HMAC-verified grading · 70%+ upgrades Claimed → Practised
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Select skill for AI micro-quiz"
                className="input !w-auto text-sm"
                value={selectedAiSkill}
                onChange={e => setSelectedAiSkill(e.target.value)}
              >
                {allSkillOptions.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-primary"
                disabled={aiQuizBusy}
                onClick={() => startAiQuiz(selectedAiSkill)}
              >
                <Sparkles size={15} />
                {aiQuizBusy ? 'Generating quiz…' : `Start ${selectedAiSkill} Micro-Quiz`}
              </button>
            </div>
          </div>

          {aiQuizError && (
            <p role="alert" className="rounded-xl border border-[#d70015]/25 bg-[#d70015]/5 p-3 text-sm text-[#d70015]">
              {aiQuizError}
            </p>
          )}

          {claimedSkills.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#6e6e73]">
                Your Claimed Profile Skills
              </p>
              <div className="flex flex-wrap gap-2">
                {claimedSkills.map(sk => {
                  const st = statusFor(sk, projects, ev, res, claimedSkills)
                  return (
                    <button
                      key={sk}
                      type="button"
                      disabled={aiQuizBusy}
                      onClick={() => {
                        setSelectedAiSkill(sk)
                        startAiQuiz(sk)
                      }}
                      className="flex items-center gap-2 rounded-xl border border-black/[0.08] bg-white/75 px-3 py-1.5 text-xs hover:border-[#007AFF]"
                    >
                      <span className="font-medium text-[#1d1d1f]">{sk}</span>
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                          st === 'Demonstrated' || st === 'Practised'
                            ? 'bg-emerald-500/15 text-[#248a3d]'
                            : 'bg-[#007AFF]/10 text-[#0062cc]'
                        }`}
                      >
                        {st}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Active Gemini AI Micro-Quiz */}
      {aiQuiz && !aiSub && (
        <section className="glass space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-medium text-[#0062cc]">
                Gemini Micro-Assessment · {aiQuiz.skill}
              </span>
              <h2 className="text-lg font-semibold text-[#1d1d1f]">{aiQuiz.title}</h2>
            </div>
            <span className="rounded-md border border-[#007AFF]/20 bg-[#007AFF]/10 px-2 py-0.5 text-xs text-[#0062cc]">
              {aiQuiz.generatedBy}
            </span>
          </div>

          <p className="text-sm text-[#6e6e73]">
            Question {aiStep + 1} of {aiQuiz.questions.length}
          </p>
          <div
            className="h-1.5 rounded-full bg-black/[0.05]"
            role="progressbar"
            aria-valuenow={aiStep + 1}
            aria-valuemin={1}
            aria-valuemax={aiQuiz.questions.length}
          >
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-[#007AFF] to-[#AF52DE]"
              style={{ width: `${((aiStep + 1) / aiQuiz.questions.length) * 100}%` }}
            />
          </div>

          <fieldset className="mt-3">
            <legend className="font-medium text-[#1d1d1f]">{aiQuiz.questions[aiStep].q}</legend>
            <div className="mt-3 space-y-2">
              {aiQuiz.questions[aiStep].options.map((opt, idx) => (
                <label
                  key={`${aiStep}-${idx}`}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm ${
                    aiAns[aiStep] === idx
                      ? 'border-[#007AFF] bg-[#007AFF]/10 text-[#1d1d1f]'
                      : 'border-black/[0.08]'
                  }`}
                >
                  <input
                    type="radio"
                    name={`ai-opt-${aiStep}`}
                    checked={aiAns[aiStep] === idx}
                    onChange={() => setAiAns(aiAns.map((v, k) => (k === aiStep ? idx : v)))}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center justify-between pt-3">
            <button
              type="button"
              className="btn-ghost"
              disabled={busy}
              onClick={() => (aiStep === 0 ? setAiQuiz(null) : setAiStep(aiStep - 1))}
            >
              {aiStep === 0 ? 'Cancel' : 'Previous'}
            </button>
            {aiStep < aiQuiz.questions.length - 1 ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => setAiStep(aiStep + 1)}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                disabled={aiAns.includes(-1) || busy}
                onClick={submitAiQuiz}
              >
                {busy ? 'Grading & verifying…' : 'Submit for verification'}
              </button>
            )}
          </div>
          {aiStep === aiQuiz.questions.length - 1 && aiAns.includes(-1) && (
            <p className="text-xs text-[#6e6e73]">Answer every question to submit.</p>
          )}
        </section>
      )}

      {/* Gemini AI Micro-Quiz Submission Result */}
      {aiQuiz && aiSub && (
        <section className="glass space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[#1d1d1f]">
                {aiSub.score} / {aiSub.total} ({aiSub.percentage}%)
              </h2>
              <p className="mt-1 text-sm text-[#3a3a3c]">{aiSub.feedback}</p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold ${
                aiSub.verified
                  ? 'bg-emerald-500/15 text-[#248a3d]'
                  : 'bg-amber-500/15 text-[#b25000]'
              }`}
            >
              <BadgeCheck size={15} />
              Status: {aiSub.statusUpgrade}
            </span>
          </div>

          <ul className="space-y-3 text-sm">
            {aiQuiz.questions.map((q, n) => {
              const isCorrect = aiAns[n] === aiSub.correctAnswers[n]
              return (
                <li
                  key={q.q}
                  className="rounded-xl border border-black/[0.08] bg-white/70 p-3.5"
                >
                  <div className="flex items-start gap-2">
                    {isCorrect ? (
                      <CheckCircle2 size={16} className="mt-0.5 flex-none text-[#248a3d]" />
                    ) : (
                      <XCircle size={16} className="mt-0.5 flex-none text-[#d70015]" />
                    )}
                    <div className="space-y-1">
                      <p className="font-medium text-[#1d1d1f]">{q.q}</p>
                      <p className="text-xs text-[#6e6e73]">
                        Your answer: <span className="text-[#1d1d1f]">{q.options[aiAns[n]]}</span>
                        {!isCorrect && (
                          <>
                            {' '}
                            · Correct answer:{' '}
                            <span className="font-medium text-[#248a3d]">
                              {q.options[aiSub.correctAnswers[n]]}
                            </span>
                          </>
                        )}
                      </p>
                      {aiSub.explanations[n] && (
                        <p className="text-xs text-[#3a3a3c]">{aiSub.explanations[n]}</p>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setAiQuiz(null)
                setAiSub(null)
              }}
            >
              Back to Assessment Centre
            </button>
            {!aiSub.verified && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => startAiQuiz(aiQuiz.skill)}
              >
                Generate new {aiQuiz.skill} questions
              </button>
            )}
          </div>
        </section>
      )}

      {/* Foundational Catalog Assessments */}
      {!a && !aiQuiz && (
        <>
          <section className="space-y-3">
            <h2 className="font-medium text-[#1d1d1f]">Foundational Practice Quizzes</h2>
            {loading && <div className="glass p-4 text-sm text-[#6e6e73]">Loading assessments…</div>}
            {loadError && <p role="alert" className="text-sm text-[#d70015]">{loadError}</p>}
            <div className="grid gap-3 sm:grid-cols-3">
              {assessments.map(x => (
                <button
                  key={x.id}
                  type="button"
                  className="glass p-4 text-left hover:bg-white/90"
                  onClick={() => begin(x)}
                >
                  <p className="font-medium text-[#1d1d1f]">{x.title}</p>
                  <p className="text-xs text-[#6e6e73]">
                    {x.skill} · {x.questions.length} questions
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="glass p-5">
            <h2 className="mb-2 font-medium text-[#1d1d1f]">Your Assessment History</h2>
            {res.length === 0 ? (
              <p className="text-sm text-[#6e6e73]">
                No attempts yet. Start a Gemini Micro-Quiz or foundational quiz above.
              </p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {res.map(r => {
                  const pct = r.total ? Math.round((100 * r.score) / r.total) : 0
                  return (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.05] pb-1.5 last:border-none">
                      <span>
                        <strong className="text-[#1d1d1f]">{r.assessment}</strong>: {r.score}/
                        {r.total} ({pct}%)
                      </span>
                      <span className="text-xs text-[#6e6e73]">
                        {pct >= 70 ? '✓ Practised verified' : 'Needs review'} · {r.date}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </>
      )}

      {a && !done && (
        <section className="glass p-6">
          <p className="text-sm text-[#6e6e73]">
            Question {i + 1} of {a.questions.length}
          </p>
          <div
            className="mt-1 h-1.5 rounded-full bg-black/[0.05]"
            role="progressbar"
            aria-valuenow={i + 1}
            aria-valuemin={1}
            aria-valuemax={a.questions.length}
          >
            <div
              className="h-1.5 rounded-full bg-nexus-cyan"
              style={{ width: `${((i + 1) / a.questions.length) * 100}%` }}
            />
          </div>
          <fieldset className="mt-4">
            <legend className="text-[#1d1d1f]">{a.questions[i].q}</legend>
            <div className="mt-3 space-y-2">
              {a.questions[i].options.map((o, n) => (
                <label
                  key={o}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    ans[i] === n ? 'border-[#007AFF] bg-[#007AFF]/10' : 'border-black/[0.08]'
                  }`}
                >
                  <input
                    type="radio"
                    name="opt"
                    checked={ans[i] === n}
                    onChange={() => setAns(ans.map((v, k) => (k === i ? n : v)))}
                  />
                  {o}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-5 flex justify-between">
            <button
              type="button"
              className="btn-ghost"
              disabled={i === 0 || busy}
              onClick={() => setI(i - 1)}
            >
              Previous
            </button>
            {i < a.questions.length - 1 ? (
              <button type="button" className="btn-primary" onClick={() => setI(i + 1)}>
                Next
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                disabled={ans.includes(-1) || busy}
                onClick={submit}
              >
                {busy ? 'Submitting…' : 'Submit answers'}
              </button>
            )}
          </div>
          {i === a.questions.length - 1 && ans.includes(-1) && (
            <p className="mt-2 text-xs text-[#6e6e73]">Answer every question to submit.</p>
          )}
        </section>
      )}

      {a && done && (
        <section className="glass space-y-3 p-6">
          <h2 className="text-xl font-semibold text-[#1d1d1f]">
            {score} / {a.questions.length}
          </h2>
          <p>
            {a.skill}: {note}
          </p>
          <ul className="space-y-2 text-sm">
            {a.questions.map((q, n) => (
              <li key={q.q}>
                <span className={ans[n] === reviewAnswers[n] ? 'text-[#248a3d]' : 'text-[#d70015]'}>
                  {ans[n] === reviewAnswers[n] ? 'Correct' : 'Incorrect'}
                </span>{' '}
                · {q.q}
                {ans[n] !== reviewAnswers[n] && (
                  <span className="text-[#6e6e73]"> Answer: {q.options[reviewAnswers[n]]}</span>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-[#6e6e73]">
            A score of 70% or more counts as Practised evidence in SkillProof.
          </p>
          <button type="button" className="btn-primary" onClick={() => setA(null)}>
            Back to assessments
          </button>
        </section>
      )}
    </div>
  )
}
