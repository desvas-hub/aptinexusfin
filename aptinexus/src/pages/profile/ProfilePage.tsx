import { useEffect, useState } from 'react'
import { useRemote } from '../../hooks/useRemote'
import { Link } from 'react-router-dom'
import EntryList from '../../components/profile/EntryList'
import AiAdvisorPanel from '../../components/ai/AiAdvisorPanel'
import { useAuth } from '../../contexts/AuthContext'
import { completion, loadProfile, sectionDefs, type ProfileData } from '../../data/profile'
import type { User } from '../../types'

export default function ProfilePage() {
  const user = useAuth().user as User
  const [p, setP] = useRemote<ProfileData>('profile', user.id, loadProfile(user))
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    setSaved(true)
    const t = setTimeout(() => setSaved(false), 1500)
    return () => clearTimeout(t)
  }, [p, user])
  const pct = completion(p)
  const personal = (k: keyof ProfileData['personal'], label: string) => (
    <div>
      <label htmlFor={k} className="mb-1 block text-sm">
        {label}
      </label>
      <input
        id={k}
        className="input"
        value={p.personal[k]}
        onChange={e => setP({ ...p, personal: { ...p.personal, [k]: e.target.value } })}
      />
    </div>
  )
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#1d1d1f]">My Profile</h1>
          <p className="text-sm text-[#6e6e73]">
            Changes save automatically. {saved && <span className="text-[#007AFF]">Saved.</span>}
          </p>
        </div>
        <Link to="/app/resume" className="btn-primary">
          Upload a resume
        </Link>
      </div>
      <div className="glass p-5">
        <div className="flex justify-between text-sm">
          <span className="text-[#1d1d1f]">Profile completion</span>
          <span>{pct}%</span>
        </div>
        <div
          className="mt-2 h-2 rounded-full bg-black/[0.05]"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-2 rounded-full bg-gradient-to-r from-nexus-blue to-nexus-violet"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <AiAdvisorPanel focus="all" onProfileUpdated={updated => setP(updated)} />

      <section className="glass grid gap-4 p-5 md:grid-cols-3" aria-label="Personal information">
        {personal('name', 'Full name')}
        {personal('headline', 'Headline')}
        {personal('location', 'Location')}
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        {sectionDefs.map(s => (
          <EntryList
            key={s.id}
            title={s.title}
            placeholder={s.ph}
            items={p.sections[s.id] ?? []}
            onChange={items => setP({ ...p, sections: { ...p.sections, [s.id]: items } })}
          />
        ))}
      </div>
    </div>
  )
}
