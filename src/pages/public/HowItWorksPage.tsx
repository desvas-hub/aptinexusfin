import { Link } from 'react-router-dom'
import { BadgeCheck, Compass, GitBranch, Map, Target, UserRound } from 'lucide-react'

const steps = [
  { icon: UserRound, title: 'Build your profile', text: 'Add your education, subjects, skills, projects and goals, or upload a resume and review what it finds.' },
  { icon: GitBranch, title: 'Discover your skills', text: 'See how your skills, subjects and projects connect in an interactive 3D SkillGraph.' },
  { icon: Compass, title: 'Explore career opportunities', text: 'Browse careers that fit your profile, including ones in domains you had not considered.' },
  { icon: Target, title: 'Identify skill gaps', text: 'Compare your skills with a career’s requirements and see what to learn first.' },
  { icon: Map, title: 'Follow your learning roadmap', text: 'Work through ordered stages with practical projects and milestones, and tick them off.' },
  { icon: BadgeCheck, title: 'Demonstrate your abilities', text: 'Back each skill with projects, quizzes and other evidence in SkillProof.' },
]
export default function HowItWorksPage() {
  return (
    <section className="mx-auto max-w-3xl px-5 pt-16">
      <h1 className="text-3xl font-semibold text-[#1d1d1f] md:text-4xl">How AptiNexus works</h1>
      <p className="mt-3 text-[#6e6e73]">Six steps from what you know now to what you can show.</p>
      <ol className="mt-10 space-y-6 border-l border-black/[0.08] pl-8">
        {steps.map((s, i) => (
          <li key={s.title} className="relative"><span className="absolute -left-[50px] grid h-9 w-9 place-items-center rounded-full border border-black/[0.08] bg-white/85"><s.icon size={16} className="text-[#007AFF]" /></span>
            <h2 className="text-lg font-medium text-[#1d1d1f]">{i + 1}. {s.title}</h2><p className="mt-1">{s.text}</p></li>))}
      </ol>
      <Link to="/register" className="btn-primary mt-10">Get started</Link>
    </section>
  )
}
