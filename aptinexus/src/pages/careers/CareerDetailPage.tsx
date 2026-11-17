import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AiAdvisorPanel from '../../components/ai/AiAdvisorPanel'
import { useAuth } from '../../contexts/AuthContext'
import { loadProfile } from '../../data/profile'
import type { Career } from '../../data/careers'
import { careersApi, gapsApi, profilesApi } from '../../services/api'

interface GapResult { strengths: string[]; missing: string[]; optional: string[] }
const List = ({ title, items }: { title: string; items: string[] }) => (
  <section className="glass p-5">
    <h2 className="mb-2 font-medium text-[#1d1d1f]">{title}</h2>
    <ul className="list-inside list-disc space-y-1 text-sm">
      {items.map(i => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  </section>
)

export default function CareerDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [career, setCareer] = useState<Career | null>(null)
  const [gap, setGap] = useState<GapResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id || !user) return
    let active = true
    setLoading(true)
    setError('')
    setCareer(null)
    setGap(null)
    Promise.all([careersApi.get(id), profilesApi.get(user.id, loadProfile(user))])
      .then(async ([item, profile]) => {
        if (!item) throw new Error('That career wasn’t found.')
        if (active) setCareer(item as Career)
        return gapsApi.analyse(id, profile.sections?.technical ?? [])
      })
      .then(result => {
        if (active && result) setGap(result as GapResult)
      })
      .catch(e => {
        if (active) setError(e instanceof Error ? e.message : 'Could not load this career.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id, user])

  const ListBlock = List
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {loading && <p className="glass p-5 text-sm text-[#6e6e73]">Loading career details…</p>}
      {error && (
        <p role="alert" className="glass p-5 text-sm text-[#d70015]">
          {error}
        </p>
      )}
      {career && (
        <>
          <div>
            <p className="text-sm text-[#6e6e73]">{career.category}</p>
            <h1 className="text-2xl font-semibold text-[#1d1d1f]">{career.title}</h1>
            <p className="mt-2">{career.why}</p>
            <div className="mt-3 flex gap-2">
              <Link className="btn-primary" to={`/app/gaps?career=${career.id}`}>
                Analyse my skill gaps
              </Link>
              <Link className="btn-ghost" to={`/app/roadmap?career=${career.id}`}>
                Open roadmap
              </Link>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ListBlock
              title="Required skills"
              items={career.required.map(
                skill =>
                  `${skill} · ${
                    gap?.strengths.some(s => s.toLocaleLowerCase() === skill.toLocaleLowerCase())
                      ? 'In your profile'
                      : gap
                        ? 'Needed'
                        : 'Checking profile'
                  }`
              )}
            />
            {gap && (
              <ListBlock
                title="Additional skills to consider"
                items={gap.optional.length ? gap.optional : ['No additional skills identified']}
              />
            )}
            <ListBlock title="Learning areas" items={career.learn} />
          </div>
          <AiAdvisorPanel focus="courses" focusCareerId={career.id} />
        </>
      )}
    </div>
  )
}
