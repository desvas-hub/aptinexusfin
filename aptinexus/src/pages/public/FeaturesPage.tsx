const list = [
  ['SkillGraph', 'An interactive 3D map linking your skills, projects and careers.'], ['Career Discovery', 'Career matches based on skills in your profile.'],
  ['Skill Gap Analysis', 'Missing skills grouped by priority, with dependencies.'], ['Learning Roadmap', 'Ordered stages, tasks and milestones you can track.'],
  ['SkillProof', 'Evidence for each skill, from claimed to demonstrated.'], ['Assessment Centre', 'Practice quizzes for self-checking.'],
  ['What-If Simulator', 'Test hypothetical skills and projects without changing your profile.'], ['Progress & Analytics', 'Charts of your skills, projects and results.'],
]
export default function FeaturesPage() {
  return (
    <section className="mx-auto max-w-5xl px-5 pt-16">
      <h1 className="text-3xl font-semibold text-[#1d1d1f] md:text-4xl">Features</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{list.map(([t, d]) => <div key={t} className="glass p-4"><h2 className="font-medium text-[#1d1d1f]">{t}</h2><p className="mt-1 text-sm text-[#6e6e73]">{d}</p></div>)}</div>
    </section>
  )
}

