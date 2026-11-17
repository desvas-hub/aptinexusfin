import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Career } from '../../data/careers'
import { careersApi } from '../../services/api'

export default function ExploreCareersPage() {
  const [careers, setCareers] = useState<Career[]>([])
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    careersApi.list().then(items => { if (active) setCareers(items as Career[]) })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Could not load careers.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const cats = ['All', ...Array.from(new Set(careers.map(c => c.category)))]
  const list = careers.filter(c => (cat === 'All' || c.category === cat) && `${c.title} ${c.category}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div><h1 className="text-2xl font-semibold text-[#1d1d1f]">Explore Careers</h1><p className="text-sm text-[#6e6e73]">Browse the AptiNexus career catalog, whether or not a role currently matches your profile.</p></div>
      <div className="flex flex-wrap gap-2"><input className="input w-56" placeholder="Search careers" aria-label="Search careers" value={q} onChange={e => setQ(e.target.value)} />
        {cats.map(c => <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)} className={`btn-ghost !py-1.5 ${cat === c ? 'bg-[#007AFF]/10 text-[#007AFF]' : ''}`}>{c}</button>)}</div>
      {loading && <p className="glass p-5 text-sm text-[#6e6e73]">Loading careers…</p>}
      {error && <p role="alert" className="text-sm text-[#d70015]">{error}</p>}
      {!loading && list.length === 0 && <p className="glass p-6">No careers match “{q}”.</p>}
      <div className="grid gap-4 md:grid-cols-2">{list.map(c => (
        <Link key={c.id} to={`/app/careers/${c.id}`} className="glass block p-5 hover:bg-white/90"><p className="text-xs text-[#6e6e73]">{c.category}</p><h2 className="mt-1 font-medium text-[#1d1d1f]">{c.title}</h2><p className="mt-2 text-sm">{c.why}</p></Link>))}</div>
    </div>
  )
}

