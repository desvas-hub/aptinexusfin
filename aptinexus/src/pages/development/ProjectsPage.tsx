import { useToast } from '../../contexts/ToastContext'
import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { library } from '../../data/skills'
import { statusFor, type Evidence, type Project, type Result } from '../../data/evidence'
import { isHttpUrl } from '../../utils/store'
import { useRemote } from '../../hooks/useRemote'

const blank: Project = { id: '', title: '', desc: '', tech: [], skills: [], link: '', image: '' }
export default function ProjectsPage() {
  const uid = useAuth().user?.id
  const toast = useToast()
  const [projects, setProjects] = useRemote<Project[]>('projects', uid, [])
  const [ev] = useRemote<Evidence[]>('evidence', uid, [])
  const [res] = useRemote<Result[]>('results', uid, [])
  const [form, setForm] = useState<Project | null>(null)
  const [tech, setTech] = useState('')
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [open, setOpen] = useState<string | null>(null)

  const start = (p: Project) => { setForm(p); setTech(p.tech.join(', ')); setErrs({}) }
  const save = () => {
    if (!form) return
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = 'Enter a project title.'
    if (form.link && !isHttpUrl(form.link)) e.link = 'Enter a link starting with http:// or https://.'
    if (form.image && !isHttpUrl(form.image)) e.image = 'Enter an image link starting with http:// or https://.'
    setErrs(e); if (Object.keys(e).length) return
    const p = { ...form, tech: tech.split(',').map(t => t.trim()).filter(Boolean), id: form.id || Date.now().toString(36) }
    setProjects(form.id ? projects.map(x => (x.id === p.id ? p : x)) : [...projects, p]); setForm(null); toast.push('Project saved')
  }
  const field = (k: 'title' | 'desc' | 'link' | 'image', label: string) => (
    <div><label htmlFor={k} className="mb-1 block text-sm">{label}</label><input id={k} className="input" value={form![k]} onChange={e => setForm({ ...form!, [k]: e.target.value })} />{errs[k] && <p role="alert" className="mt-1 text-xs text-[#d70015]">{errs[k]}</p>}</div>)
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-end justify-between"><div><h1 className="text-2xl font-semibold text-[#1d1d1f]">Project Portfolio</h1><p className="text-sm text-[#6e6e73]">Projects with a link count as stronger SkillProof evidence.</p></div>
        <button className="btn-primary" onClick={() => start(blank)}><Plus size={16} />Add project</button></div>
      {projects.length === 0 && <p className="glass p-6">No projects yet. Add one to start building evidence for your skills.</p>}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{projects.map(p => (
        <article key={p.id} className="glass overflow-hidden">
          {p.image && <img src={p.image} alt="" className="h-36 w-full object-cover" loading="lazy" />}
          <div className="p-4"><div className="flex justify-between gap-2"><h2 className="font-medium text-[#1d1d1f]">{p.title}</h2>
            <span className="flex gap-2"><button aria-label={`Edit ${p.title}`} onClick={() => start(p)}><Pencil size={14} /></button><button aria-label={`Delete ${p.title}`} onClick={() => confirm(`Delete “${p.title}”?`) && (setProjects(projects.filter(x => x.id !== p.id)), toast.push('Project deleted'))}><Trash2 size={14} className="text-[#d70015]" /></button></span></div>
            <p className="mt-1 text-sm">{p.desc}</p><p className="mt-2 text-xs text-[#6e6e73]">{p.tech.join(' · ')}</p>
            {p.link && <a href={p.link} target="_blank" rel="noreferrer noopener" className="mt-2 block text-xs text-[#007AFF]">Project link</a>}
            <button className="mt-3 text-xs text-[#007AFF]" aria-expanded={open === p.id} onClick={() => setOpen(open === p.id ? null : p.id)}>{open === p.id ? 'Hide evidence' : 'View SkillProof evidence'}</button>
            {open === p.id && <ul className="mt-2 space-y-1 text-sm">{p.skills.length ? p.skills.map(s => <li key={s}>{s}: <span className="text-[#1d1d1f]">{statusFor(s, projects, ev, res)}</span></li>) : <li className="text-[#6e6e73]">No skills linked yet.</li>}</ul>}</div></article>))}</div>
      {form && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/25 p-4" onClick={() => setForm(null)} onKeyDown={e => e.key === 'Escape' && setForm(null)}>
          <div role="dialog" aria-modal="true" aria-label="Project form" className="glass my-8 w-full max-w-lg space-y-3 bg-white/85 p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-[#1d1d1f]">{form.id ? 'Edit project' : 'Add project'}</h2>
            {field('title', 'Title')}{field('desc', 'Description')}
            <div><label htmlFor="tech" className="mb-1 block text-sm">Technologies (comma separated)</label><input id="tech" className="input" value={tech} onChange={e => setTech(e.target.value)} /></div>
            <fieldset><legend className="mb-1 text-sm">Skills used</legend><div className="flex flex-wrap gap-1.5">{library.map(l => { const on = form.skills.includes(l.name)
              return <button type="button" key={l.name} aria-pressed={on} onClick={() => setForm({ ...form, skills: on ? form.skills.filter(s => s !== l.name) : [...form.skills, l.name] })} className={`rounded-full border px-2.5 py-1 text-xs ${on ? 'border-[#007AFF] text-[#007AFF]' : 'border-black/[0.08]'}`}>{l.name}</button> })}</div></fieldset>
            {field('link', 'Project link (optional)')}{field('image', 'Image link (optional)')}
            <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setForm(null)}>Cancel</button><button className="btn-primary" onClick={save}>Save project</button></div>
          </div></div>)}
    </div>
  )
}

