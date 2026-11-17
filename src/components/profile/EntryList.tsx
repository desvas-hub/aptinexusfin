import { useState } from 'react'
import { Check, Pencil, Plus, Trash2 } from 'lucide-react'

interface Props { title: string; items: string[]; placeholder: string; onChange: (items: string[]) => void }
export default function EntryList({ title, items, placeholder, onChange }: Props) {
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<number | null>(null)
  const [text, setText] = useState('')
  const add = () => { const v = draft.trim(); if (v && !items.includes(v)) { onChange([...items, v]); setDraft('') } }
  const save = (i: number) => { const v = text.trim(); if (v) onChange(items.map((x, j) => (j === i ? v : x))); setEditing(null) }
  return (
    <section className="glass p-5" aria-label={title}>
      <h2 className="font-medium text-[#1d1d1f]">{title}</h2>
      {items.length === 0 && <p className="mt-2 text-sm text-[#6e6e73]">Nothing added yet.</p>}
      <ul className="mt-3 space-y-1.5">
        {items.map((it, i) => (
          <li key={it + i} className="flex items-center gap-2 rounded-lg bg-black/[0.05] px-3 py-1.5 text-sm">
            {editing === i ? <input autoFocus className="input !py-1" aria-label={`Edit ${it}`} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && save(i)} /> : <span className="flex-1">{it}</span>}
            {editing === i ? <button aria-label="Save" onClick={() => save(i)}><Check size={15} /></button>
              : <button aria-label={`Edit ${it}`} onClick={() => { setEditing(i); setText(it) }}><Pencil size={14} /></button>}
            <button aria-label={`Remove ${it}`} onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 size={14} className="text-[#d70015]" /></button>
          </li>))}
      </ul>
      <div className="mt-3 flex gap-2"><input className="input" placeholder={placeholder} aria-label={`Add to ${title}`} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <button className="btn-ghost" onClick={add} aria-label={`Add ${title} entry`}><Plus size={16} /></button></div>
    </section>
  )
}
