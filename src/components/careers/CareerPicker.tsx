import { careers } from '../../data/careers'
export default function CareerPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (<div className="flex items-center gap-2"><label htmlFor="career" className="text-sm">Target career</label>
    <select id="career" className="input !w-auto" value={value} onChange={e => onChange(e.target.value)}>{careers.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>)
}
