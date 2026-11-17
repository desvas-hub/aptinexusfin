import { useEffect, useMemo, useState } from 'react'
import AiAdvisorPanel from '../../components/ai/AiAdvisorPanel'
import { resourcesApi } from '../../services/api'
import type { Resource, ResType } from '../../data/resources'

const types: ('All' | ResType)[] = ['All', 'Course', 'Documentation', 'Tutorial', 'Video', 'Book', 'Practical project']
const lv = { Beginner: 1, Intermediate: 2, Advanced: 3 }
export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [q, setQ] = useState('')
  const [type, setType] = useState<(typeof types)[number]>('All')
  const [sort, setSort] = useState<'title' | 'level'>('level')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    resourcesApi.list().then(items => { if (active) setResources(items as Resource[]) })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Could not load resources.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  const list = useMemo(() => resources.filter(r => (type === 'All' || r.type === type) && `${r.title} ${r.skill}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : lv[a.level] - lv[b.level]), [resources, q, type, sort])
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div><h1 className="text-2xl font-semibold text-[#1d1d1f]">Learning Resources</h1><p className="text-sm text-[#6e6e73]">Browse learning material by skill, format and difficulty. Check each provider's page for current availability.</p></div>
      <AiAdvisorPanel focus="courses" />
      <div className="flex flex-wrap gap-2"><input className="input w-56" placeholder="Search resources or skills" aria-label="Search resources" value={q} onChange={e => setQ(e.target.value)} />
        <select className="input !w-auto" aria-label="Type" value={type} onChange={e => setType(e.target.value as typeof type)}>{types.map(t => <option key={t}>{t}</option>)}</select>
        <select className="input !w-auto" aria-label="Sort" value={sort} onChange={e => setSort(e.target.value as typeof sort)}><option value="level">Sort by level</option><option value="title">Sort by title</option></select></div>
      {loading && <p className="glass p-5 text-sm text-[#6e6e73]">Loading resources…</p>}
      {error && <p role="alert" className="text-sm text-[#d70015]">{error}</p>}
      {!loading && list.length === 0 && <p className="glass p-6">No resources match. Clear the search or choose another type.</p>}
      <div className="grid gap-3 sm:grid-cols-2">{list.map((r, i) => (
        <article key={r.title + i} className="glass p-4"><p className="text-xs text-[#6e6e73]">{r.type} · {r.level}</p><h2 className="mt-1 text-[#1d1d1f]">{r.title}</h2><p className="text-sm">Skill: {r.skill}</p>
          {r.url ? <a href={r.url} target="_blank" rel="noreferrer noopener" className="mt-2 inline-block text-sm text-[#007AFF]">Open resource</a> : <p className="mt-2 text-xs text-[#6e6e73]">Resource link not yet added</p>}</article>))}</div>
    </div>
  )
}
