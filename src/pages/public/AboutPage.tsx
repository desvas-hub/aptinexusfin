import { Link } from 'react-router-dom'
export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 pt-16">
      <h1 className="text-3xl font-semibold text-[#1d1d1f] md:text-4xl">About AptiNexus</h1>
      <p className="mt-4 text-lg text-[#6e6e73]">AptiNexus helps students and professionals understand what they can already do, see where it could lead, and plan what to learn next.</p>
      <h2 className="mt-10 text-xl font-medium text-[#1d1d1f]">Our mission</h2>
      <p className="mt-2">Most people know their degree or job title, but not the full set of abilities behind it. We connect your subjects, skills, projects and experience so the links between them become visible, including links to careers you may not have considered.</p>
      <h2 className="mt-8 text-xl font-medium text-[#1d1d1f]">Our approach</h2>
      <p className="mt-2">Everything is built around a skill graph: a map of how abilities relate to each other, to evidence such as projects, and to careers. From that map we estimate fit, find gaps and build learning roadmaps.</p>
      <h2 className="mt-8 text-xl font-medium text-[#1d1d1f]">What AptiNexus is not</h2>
      <p className="mt-2">It is not a resume builder, a job board, a chatbot, a personality test or a course platform. Skill verification requires independent review.</p>
      <Link to="/register" className="btn-primary mt-8">Create your account</Link>
    </article>
  )
}

