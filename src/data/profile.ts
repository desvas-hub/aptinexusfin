import type { User } from '../types'
export interface ProfileData { personal: { name: string; headline: string; location: string }; sections: Record<string, string[]> }
export const sectionDefs = [
  { id: 'education', title: 'Education', ph: 'e.g. B.E. Mechanical Engineering, 2026' }, { id: 'subjects', title: 'Academic subjects', ph: 'e.g. Thermodynamics' },
  { id: 'technical', title: 'Technical skills', ph: 'e.g. Python' }, { id: 'soft', title: 'Soft skills', ph: 'e.g. Teamwork' },
  { id: 'interests', title: 'Interests', ph: 'e.g. Robotics' }, { id: 'experience', title: 'Work experience', ph: 'e.g. Manufacturing intern, 6 weeks' },
  { id: 'projects', title: 'Projects', ph: 'e.g. Line-following rover' }, { id: 'certifications', title: 'Certifications', ph: 'e.g. Python course certificate' },
  { id: 'achievements', title: 'Achievements', ph: 'e.g. Won college robotics contest' }, { id: 'goals', title: 'Career goals', ph: 'e.g. Work in robotics' },
]
export const loadProfile = (u: User): ProfileData => {
  try { const raw = localStorage.getItem(`aptinexus.profile.${u.id}`); if (raw) return JSON.parse(raw) } catch { /* fall through to defaults */ }
  return { personal: { name: u.name, headline: u.headline, location: '' }, sections: {} }
}
export const saveProfile = (u: User, p: ProfileData) => localStorage.setItem(`aptinexus.profile.${u.id}`, JSON.stringify(p))
export const completion = (p: ProfileData) => {
  const filled = sectionDefs.filter(s => (p.sections[s.id] ?? []).length > 0).length + Object.values(p.personal).filter(v => v.trim()).length
  return Math.round((100 * filled) / (sectionDefs.length + 3))
}
export const validateResume = (f: File): string | null => {
  if (!/\.(pdf|docx)$/i.test(f.name)) return 'Choose a PDF or DOCX file.'
  if (f.size > 5 * 1024 * 1024) return 'The file is larger than 5 MB. Choose a smaller file.'
  return null
}

