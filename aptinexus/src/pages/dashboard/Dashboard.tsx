import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { analyticsApi } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import type { DashboardData } from '../../types'

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const load = () => {
    setError('')
    analyticsApi
      .dashboard()
      .then(setData)
      .catch(() => setError('Could not load your dashboard.'))
  }
  useEffect(load, [])
  if (error)
    return (
      <div role="alert" className="glass p-6">
        {error}{' '}
        <button className="btn-ghost ml-3" onClick={load}>
          Retry
        </button>
      </div>
    )
  if (!data)
    return <div className="glass h-64 animate-pulse" aria-busy="true" aria-label="Loading dashboard" />

  const profPct = data.profileCompletion ?? data.readiness ?? 0
  const skills = data.skills ?? []
  const counts = data.skillCounts ?? {
    'Not started': 0,
    Claimed: skills.filter(s => s.status === 'Claimed').length,
    Practised: skills.filter(s => s.status === 'Practised').length,
    Demonstrated: skills.filter(s => s.status === 'Demonstrated').length,
    Verified: skills.filter(s => s.status === 'Verified').length,
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1d1d1f]">
          Welcome back, {user?.name.split(' ')[0]}
        </h1>
        <p className="text-sm text-[#6e6e73]">
          Your dashboard reflects the live skills, Gemini micro-assessments, and evidence saved to your profile.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <section className="glass p-5">
          <h2 className="font-medium text-[#1d1d1f]">Profile completion</h2>
          <p className="mt-2 text-3xl text-[#1d1d1f]">{profPct}%</p>
          <div
            className="mt-3 h-2 rounded-full bg-black/[0.05]"
            role="progressbar"
            aria-valuenow={profPct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-2 rounded-full bg-gradient-to-r from-nexus-blue to-nexus-violet"
              style={{ width: `${profPct}%` }}
            />
          </div>
        </section>
        <section className="glass p-5">
          <h2 className="font-medium text-[#1d1d1f]">Career readiness</h2>
          <p className="mt-2 text-3xl text-[#007AFF]">{data.readiness ?? profPct}%</p>
          <p className="mt-1 text-xs text-[#6e6e73]">Weighted top-career fit &amp; profile depth</p>
        </section>
        <section className="glass p-5">
          <h2 className="font-medium text-[#1d1d1f]">Skills tracked</h2>
          <p className="mt-2 text-3xl text-[#1d1d1f]">{skills.length}</p>
          <p className="mt-1 text-xs text-[#6e6e73]">
            {counts.Claimed} Claimed · {counts.Practised} Practised
          </p>
        </section>
        <section className="glass p-5">
          <h2 className="font-medium text-[#1d1d1f]">Skills demonstrated</h2>
          <p className="mt-2 text-3xl text-[#248a3d]">{counts.Demonstrated}</p>
          <p className="mt-1 text-xs text-[#6e6e73]">Backed by linked projects or evidence</p>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium text-[#1d1d1f]">Your Skills &amp; Verification Status</h2>
            <Link to="/app/assessments" className="text-xs font-medium text-[#007AFF] hover:underline">
              Verify with Gemini quiz →
            </Link>
          </div>
          {skills.length > 0 ? (
            <div className="space-y-2.5">
              {skills.map(s => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-black/[0.06] bg-white/60 px-3 py-2 text-sm"
                >
                  <span>{s.name}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                        s.status === 'Demonstrated'
                          ? 'bg-emerald-500/15 text-[#248a3d]'
                          : s.status === 'Practised'
                            ? 'bg-[#007AFF]/15 text-[#0062cc]'
                            : 'bg-black/[0.06] text-[#6e6e73]'
                      }`}
                    >
                      {s.status}
                    </span>
                    {s.status === 'Claimed' && (
                      <Link
                        to={`/app/assessments?skill=${encodeURIComponent(s.name)}`}
                        className="text-xs text-[#007AFF] hover:underline"
                      >
                        Verify
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-black/10 bg-white/50 px-4 py-6 text-center">
              <p className="text-sm font-medium text-[#1d1d1f]">
                Your skill profile is just getting started
              </p>
              <p className="mt-1 text-sm text-[#6e6e73]">
                Upload a resume for Gemini AI extraction or add skills in your profile.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Link to="/app/resume" className="btn-primary">
                  Analyze resume
                </Link>
                <Link to="/app/skills" className="btn-ghost">
                  Explore skills
                </Link>
              </div>
            </div>
          )}
        </section>

        <section className="glass p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium text-[#1d1d1f]">Career Skill Matches</h2>
            <Link to="/app/careers" className="text-xs font-medium text-[#007AFF] hover:underline">
              AI Career Advisor →
            </Link>
          </div>
          {data.careers.length ? (
            data.careers.map(c => (
              <div
                key={c.id}
                className="mb-3 flex items-center justify-between rounded-xl border border-black/[0.08] p-3"
              >
                <div>
                  <Link to={`/app/careers/${c.id}`} className="font-medium text-[#1d1d1f] hover:text-[#007AFF]">
                    {c.title}
                  </Link>
                  <p className="text-xs text-[#6e6e73]">
                    Missing: {(c.missing ?? []).join(', ') || 'None'}
                  </p>
                </div>
                <span className="font-semibold text-[#007AFF]">{c.compatibility}%</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#6e6e73]">
              Add skills to your profile to see career matches.
            </p>
          )}
        </section>
      </div>

      {(data.focusSkills?.length > 0 || data.activities?.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.focusSkills?.length > 0 && (
            <section className="glass p-5">
              <h2 className="mb-3 font-medium text-[#1d1d1f]">Recommended Bridge Skills</h2>
              <div className="space-y-2">
                {data.focusSkills.map(fs => (
                  <div
                    key={fs.name}
                    className="flex items-center justify-between rounded-xl border border-black/[0.06] bg-white/60 px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium text-[#1d1d1f]">{fs.name}</span>
                      <span className="ml-2 text-xs text-[#6e6e73]">for {fs.career}</span>
                    </div>
                    <span className="rounded-md bg-[#007AFF]/10 px-2 py-0.5 text-xs text-[#0062cc]">
                      {fs.priority}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
          {data.activities?.length > 0 && (
            <section className="glass p-5">
              <h2 className="mb-3 font-medium text-[#1d1d1f]">Recent Activity</h2>
              <ul className="space-y-2 text-sm">
                {data.activities.map(act => (
                  <li
                    key={act.id}
                    className="flex items-center justify-between border-b border-black/[0.05] pb-2 last:border-none"
                  >
                    <span className="text-[#1d1d1f]">{act.text}</span>
                    <span className="text-xs text-[#6e6e73]">{act.when}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
