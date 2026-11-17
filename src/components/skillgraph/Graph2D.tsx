import { catMeta } from '../../data/graph'
import type { GraphProps } from './Graph3D'

/** Simplified 2D fallback used when WebGL is unavailable. */
export default function Graph2D({ nodes, edges, pos, visible, selected, matched, linked, onSelect }: Omit<GraphProps, 'controls'>) {
  const P = (id: string) => ({ x: 50 + pos[id][0] * 5.5, y: 50 + pos[id][2] * 5.5 })
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" role="img" aria-label="2D skill graph">
      {edges.filter(([a, b]) => visible.has(a) && visible.has(b)).map(([a, b]) => <line key={a + b} x1={P(a).x} y1={P(a).y} x2={P(b).x} y2={P(b).y} stroke={a === selected || b === selected ? '#007AFF' : '#8e8e93'} strokeOpacity={0.4} strokeWidth={0.3} />)}
      {nodes.filter(n => visible.has(n.id)).map(n => {
        const dim = (matched && !matched.has(n.id)) || (selected && n.id !== selected && !linked.has(n.id))
        return <g key={n.id} tabIndex={0} role="button" aria-label={n.label} onClick={() => onSelect(n.id)} onKeyDown={e => e.key === 'Enter' && onSelect(n.id)} opacity={dim ? 0.25 : 1} className="cursor-pointer">
          <circle cx={P(n.id).x} cy={P(n.id).y} r={n.id === selected ? 2 : 1.4} fill={catMeta[n.cat].color} /><text x={P(n.id).x} y={P(n.id).y + 3.6} fontSize="2" textAnchor="middle" fill="#3a3a3c">{n.label}</text></g>
      })}
    </svg>
  )
}
