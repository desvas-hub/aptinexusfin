import { useEffect, useMemo, useRef, useState } from 'react'
import { RotateCcw, Search } from 'lucide-react'
import Graph3D from '../../components/skillgraph/Graph3D'
import Graph2D from '../../components/skillgraph/Graph2D'
import { Cat, catMeta, nextSteps, type GNode } from '../../data/graph'
import { skillGraphApi } from '../../services/api'

type GraphData = { nodes: GNode[]; edges: [string, string][] }
const hasWebGL = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false } }
const statuses = ['Claimed', 'Practised', 'Demonstrated', 'Verified']

function makeLayout(nodes: GNode[]): Record<string, [number, number, number]> {
  const out: Record<string, [number, number, number]> = {}
  ;(Object.keys(catMeta) as Cat[]).forEach((category, ci) => {
    const group = nodes.filter(n => n.cat === category)
    group.forEach((n, i) => {
      const y = group.length ? 1 - (2 * (i + 0.5)) / group.length : 0
      const r = Math.sqrt(1 - y * y)
      const a = i * 2.399963 + ci * 1.3
      const radius = catMeta[category].radius
      out[n.id] = [Math.cos(a) * r * radius, y * radius * 0.8, Math.sin(a) * r * radius]
    })
  })
  return out
}

export default function SkillGraphPage() {
  const controls = useRef<any>(null)
  const [webgl] = useState(hasWebGL)
  const [use3D, setUse3D] = useState(true)
  const [q, setQ] = useState('')
  const [hidden, setHidden] = useState<Set<Cat>>(new Set())
  const [selected, setSelected] = useState<string | null>(null)
  const [graph, setGraph] = useState<GraphData>({ nodes: [], edges: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    skillGraphApi.get().then(data => { if (active) setGraph(data as GraphData) })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Could not load the skill graph.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const pos = useMemo(() => makeLayout(graph.nodes), [graph.nodes])
  const visible = useMemo(() => new Set(graph.nodes.filter(n => !hidden.has(n.cat)).map(n => n.id)), [graph.nodes, hidden])
  const matched = useMemo(() => q.trim() ? new Set(graph.nodes.filter(n => n.label.toLowerCase().includes(q.toLowerCase())).map(n => n.id)) : null, [graph.nodes, q])
  const linked = useMemo(() => new Set(graph.edges.filter(([a, b]) => a === selected || b === selected).flat()), [graph.edges, selected])
  const node = graph.nodes.find(n => n.id === selected)
  const connected = graph.nodes.filter(n => n.id !== selected && linked.has(n.id))
  const props = { nodes: graph.nodes, edges: graph.edges, pos, visible, selected, matched, linked, onSelect: setSelected }
  const toggle = (c: Cat) => setHidden(h => { const s = new Set(h); s.has(c) ? s.delete(c) : s.add(c); return s })

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div><h1 className="text-2xl font-semibold text-[#1d1d1f]">SkillGraph</h1><p className="text-sm text-[#6e6e73]">Explore relationships between skills, projects and careers. Drag to rotate, scroll to zoom, and select a node for details.</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative"><Search size={15} className="absolute left-3 top-3 text-[#6e6e73]" /><input className="input w-56 pl-9" placeholder="Find a node" aria-label="Find a node" value={q} onChange={e => setQ(e.target.value)} /></div>
        {(Object.keys(catMeta) as Cat[]).map(c => (
          <button key={c} aria-pressed={!hidden.has(c)} onClick={() => toggle(c)} className={`btn-ghost gap-2 !py-1.5 ${hidden.has(c) ? 'opacity-40' : ''}`}><span className="h-2.5 w-2.5 rounded-full" style={{ background: catMeta[c].color }} />{catMeta[c].label}</button>))}
        <button className="btn-ghost !py-1.5" onClick={() => { controls.current?.reset(); setSelected(null); setQ('') }}><RotateCcw size={14} />Reset view</button>
        {webgl && <button className="btn-ghost !py-1.5" onClick={() => setUse3D(v => !v)}>{use3D ? 'Switch to 2D' : 'Switch to 3D'}</button>}
      </div>
      {loading && <p className="glass p-4 text-sm text-[#6e6e73]">Loading your skill graph…</p>}
      {error && <p role="alert" className="text-sm text-[#d70015]">{error}</p>}
      {!webgl && <p role="status" className="text-sm text-[#b25000]">3D rendering isn’t available in this browser, so you’re seeing the 2D view.</p>}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="glass graph-stage h-[60vh] min-h-[420px] overflow-hidden">{graph.nodes.length === 0 ? <div className="flex h-full flex-col items-center justify-center px-6 text-center"><h2 className="text-lg font-medium text-[#1d1d1f]">Your SkillGraph is ready to grow</h2><p className="mt-2 max-w-md text-sm text-[#6e6e73]">Add skills to your profile to see them here, along with career paths connected to those skills. Projects, experience and certifications will appear only after you add them.</p></div> : webgl && use3D ? <Graph3D {...props} controls={controls} /> : <Graph2D {...props} />}</div>
        <aside className="glass p-5" aria-live="polite">
          {node ? <>
            <h2 className="text-lg font-semibold text-[#1d1d1f]">{node.label}</h2>
            <p className="mt-1 text-sm" style={{ color: catMeta[node.cat].color }}>{catMeta[node.cat].label.replace(/s$/, '')}</p>
            <p className="mt-3 text-sm">{node.desc}</p>
            {node.status && <p className="mt-3 text-sm"><span className="text-[#6e6e73]">SkillProof status: </span><span className="text-[#1d1d1f]">{node.status}</span></p>}
            <h3 className="mt-4 text-sm font-medium text-[#1d1d1f]">Connected</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">{connected.map(c => <button key={c.id} className="rounded-full border border-black/[0.08] px-2.5 py-1 text-xs hover:bg-black/[0.06]" onClick={() => setSelected(c.id)}>{c.label}</button>)}</div>
            <h3 className="mt-4 text-sm font-medium text-[#1d1d1f]">Suggested next step</h3><p className="mt-1 text-sm">{nextSteps[node.cat]}</p>
          </> : <p className="text-sm text-[#6e6e73]">Select a node to see its details and connections.</p>}
          <div className="mt-6 border-t border-black/[0.08] pt-4 text-xs text-[#6e6e73]"><p className="mb-1 text-[#6e6e73]">SkillProof statuses</p>{statuses.join(' → ')}<p className="mt-1">Verified status requires independent review.</p></div>
        </aside>
      </div>
    </div>
  )
}
