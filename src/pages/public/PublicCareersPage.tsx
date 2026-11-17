import { useState } from 'react'
import { Link } from 'react-router-dom'
import { careers } from '../../data/careers'

export default function PublicCareersPage() {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All')
  const [open, setOpen] = useState<string | null>(null)
  const cats = ['All', ...Array.from(new Set(careers.map(c => c.category)))]
  const list = careers.filter(c => (cat === 'All' || c.category === cat) && `${c.title} ${c.category}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <section className="mx-auto max-w-5xl px-5 pt-16">
      <h1 className="text-3xl font-semibold text-[#1d1d1f] md:text-4xl">Explore careers</h1>
      <p className="mt-2 text-[#6e6e73]">Explore career paths and the skills commonly associated with them.</p>
      <div className="mt-6 flex flex-wrap gap-2"><input className="input w-56" placeholder="Search careers" aria-label="Search careers" value={q} onChange={e => setQ(e.target.value)} />
        {cats.map(c => <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)} className={`btn-ghost !py-1.5 ${cat === c ? 'bg-[#007AFF]/10 text-[#007AFF]' : ''}`}>{c}</button>)}</div>
      {list.length === 0 && <p className="glass mt-6 p-6">No careers match “{q}”.</p>}
      <div className="mt-6 grid gap-4 md:grid-cols-2">{list.map(c => (
        <article key={c.id} className="glass p-5"><p className="text-xs text-[#6e6e73]">{c.category}</p><h2 className="font-medium text-[#1d1d1f]">{c.title}</h2><p className="mt-2 text-sm">{c.why}</p>
          <button className="mt-3 text-sm text-[#007AFF]" aria-expanded={open === c.id} onClick={() => setOpen(open === c.id ? null : c.id)}>{open === c.id ? 'Hide details' : 'Required skills'}</button>
          {open === c.id && <p className="mt-2 text-sm"><span className="text-[#6e6e73]">Skills: </span>{c.required.join(', ')}</p>}</article>))}</div>
      <Link to="/register" className="btn-primary mt-8">Find my matches</Link>
    </section>
  )
}

