import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GitBranch, Route, Sparkles, Target } from 'lucide-react'

const nodes = [[50, 50, 9, 'Profile'], [20, 25, 6, 'Skill'], [78, 22, 6, 'Project'], [85, 62, 6, 'Career'], [55, 85, 6, 'Evidence'], [18, 70, 6, 'Learning']] as const
const features = [
  { icon: GitBranch, title: 'SkillGraph', text: 'See how your subjects, skills and projects connect to each other and to careers.' },
  { icon: Target, title: 'Career discovery', text: 'Compare your profile skills with career requirements across domains.' },
  { icon: Route, title: 'Learning roadmaps', text: 'Turn each skill gap into ordered stages, projects and milestones.' },
  { icon: Sparkles, title: 'SkillProof', text: 'Separate what you claim from what you have practised, demonstrated and had verified.' },
]

export default function Landing() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-10 pt-16 md:grid-cols-2 md:pt-24">
        <div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-[#1d1d1f] md:text-5xl">Discover What You’re <span className="grad-text">Capable Of.</span></h1>
          <p className="mt-5 max-w-lg text-lg text-[#6e6e73]">An intelligent platform that connects your skills, uncovers unexpected career opportunities and builds a roadmap to your future.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link to="/register" className="btn-primary px-6">Get Started</Link><Link to="/careers" className="btn-ghost px-6">Explore Careers</Link></div>
          <p className="mt-4 text-sm text-[#6e6e73]">Connect abilities. Discover opportunities. Build your future.</p>
        </div>
        <div className="glass graph-stage float aspect-square p-2" aria-label="Animated preview of a skill graph">
          <svg viewBox="0 0 100 100" className="h-full w-full"><defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
            {nodes.slice(1).map(([x, y], i) => <motion.line key={i} x1={50} y1={50} x2={x} y2={y} stroke="#AF52DE" strokeOpacity=".5" strokeWidth=".4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, delay: i * 0.15 }} />)}
            {nodes.map(([x, y, r, label], i) => (
              <motion.g key={label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.15 }}>
                <circle cx={x} cy={y} r={r} fill={i === 0 ? '#007AFF' : '#5AC8FA'} fillOpacity={i === 0 ? 0.9 : 0.25} stroke="#5AC8FA" strokeWidth=".4" filter="url(#glow)" />
                <text x={x} y={y + r + 4} textAnchor="middle" fontSize="3.4" fill="#3a3a3c">{label}</text>
              </motion.g>
            ))}
          </svg>
        </div>
      </section>
      <section id="features" className="mx-auto max-w-6xl px-5 pt-20">
        <h2 className="text-2xl font-semibold text-[#1d1d1f] md:text-3xl">Not a resume builder. Not a job board.</h2>
        <p className="mt-2 max-w-xl text-[#6e6e73]">AptiNexus maps what you know and shows where it can lead.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(f => <div key={f.title} className="glass p-5"><f.icon className="text-[#007AFF]" size={22} /><h3 className="mt-3 font-medium text-[#1d1d1f]">{f.title}</h3><p className="mt-1 text-sm text-[#6e6e73]">{f.text}</p></div>)}
        </div>
      </section>
      <section id="how" className="mx-auto max-w-6xl px-5 pt-20">
        <h2 className="text-2xl font-semibold text-[#1d1d1f] md:text-3xl">How it works <Link to="/how-it-works" className="ml-2 text-sm font-normal text-[#007AFF]">See the full journey</Link></h2>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {['Build your profile', 'Discover your skills', 'Explore career opportunities', 'Identify skill gaps', 'Follow your learning roadmap', 'Demonstrate your abilities'].map((s, i) => <li key={s} className="glass flex items-center gap-3 p-4"><span className="grid h-7 w-7 place-items-center rounded-full bg-nexus-blue/20 text-sm text-[#007AFF]">{i + 1}</span>{s}</li>)}
        </ol>
        <div className="glass mt-16 p-8 text-center"><h2 className="text-2xl font-semibold text-[#1d1d1f]">Start with what you already know.</h2><Link to="/register" className="btn-primary mt-5">Create your account</Link></div>
      </section>
    </>
  )
}

