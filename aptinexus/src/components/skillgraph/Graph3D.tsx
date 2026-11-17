import { useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import { type Group } from 'three'
import { catMeta, type GNode } from '../../data/graph'

export interface GraphProps { nodes: GNode[]; edges: [string, string][]; pos: Record<string, [number, number, number]>; visible: Set<string>; selected: string | null; matched: Set<string> | null; linked: Set<string>; onSelect: (id: string | null) => void; controls: React.MutableRefObject<any> }
const size: Record<string, number> = { Claimed: 0.3, Practised: 0.36, Demonstrated: 0.44 } // bigger node = stronger SkillProof status

function Lines({ pos, visible, selected, edges }: Pick<GraphProps, 'pos' | 'visible' | 'selected' | 'edges'>) {
  const [base, hot] = useMemo(() => {
    const b: number[] = [], h: number[] = []
    edges.forEach(([a, c]) => { if (visible.has(a) && visible.has(c)) (a === selected || c === selected ? h : b).push(...pos[a], ...pos[c]) })
    return [new Float32Array(b), new Float32Array(h)]
  }, [pos, visible, selected, edges])
  const seg = (arr: Float32Array, color: string, opacity: number) => (
    <lineSegments key={arr.length}><bufferGeometry><bufferAttribute attach="attributes-position" count={arr.length / 3} array={arr} itemSize={3} /></bufferGeometry><lineBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} /></lineSegments>)
  return <>{seg(base, '#8e8e93', 0.45)}{seg(hot, '#007AFF', 0.95)}</>
}

function NodeMesh({ n, position, dim, sel, onSelect }: { n: GNode; position: [number, number, number]; dim: boolean; sel: boolean; onSelect: (id: string) => void }) {
  const g = useRef<Group>(null)
  const invalidate = useThree(s => s.invalidate)
  useFrame(() => { const c = g.current; if (!c) return; const d = (sel ? 1.35 : 1) - c.scale.x; if (Math.abs(d) > 0.002) { c.scale.setScalar(c.scale.x + d * 0.18); invalidate() } })
  const r = size[n.status ?? ''] ?? 0.36, color = catMeta[n.cat].color
  return (
    <group ref={g} position={position}>
      <mesh onClick={e => { e.stopPropagation(); onSelect(n.id) }} onPointerOver={() => (document.body.style.cursor = 'pointer')} onPointerOut={() => (document.body.style.cursor = '')}>
        <sphereGeometry args={[r, 16, 16]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={sel ? 0.5 : 0.15} transparent opacity={dim ? 0.18 : 1} /></mesh>
      {!dim && <mesh raycast={() => null}><sphereGeometry args={[r * 2.2, 12, 12]} /><meshBasicMaterial color={color} transparent opacity={sel ? 0.22 : 0.12} depthWrite={false} /></mesh>}
      {!dim && <Html center distanceFactor={14} position={[0, -0.75, 0]} style={{ pointerEvents: 'none' }}><span className={`whitespace-nowrap text-[11px] [text-shadow:0_0_6px_#fff,0_0_2px_#fff] ${sel ? 'font-medium text-[#1d1d1f]' : 'text-[#3a3a3c]'}`}>{n.label}</span></Html>}
    </group>
  )
}

export default function Graph3D(p: GraphProps) {
  return (
    <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 4, 15], fov: 55 }} gl={{ antialias: false, powerPreference: 'low-power' }} onPointerMissed={() => p.onSelect(null)}>
      <fog attach="fog" args={['#f5f5f7', 16, 42]} />
      <ambientLight intensity={1.1} /><pointLight position={[10, 10, 10]} intensity={80} /><pointLight position={[-10, -6, -8]} intensity={30} color="#AF52DE" />
      
      <Lines pos={p.pos} visible={p.visible} selected={p.selected} edges={p.edges} />
      {p.nodes.filter(n => p.visible.has(n.id)).map(n => (
        <NodeMesh key={n.id} n={n} position={p.pos[n.id]} sel={n.id === p.selected} onSelect={p.onSelect}
          dim={!!((p.matched && !p.matched.has(n.id)) || (p.selected && n.id !== p.selected && !p.linked.has(n.id)))} />))}
      <OrbitControls ref={p.controls} enableDamping={false} minDistance={5} maxDistance={30} />
    </Canvas>
  )
}
