import type { SkillStatus } from '../types'
export type Cat = 'skill' | 'subject' | 'project' | 'experience' | 'certification' | 'career'
export interface GNode { id: string; label: string; cat: Cat; status?: SkillStatus; desc: string }
export const catMeta: Record<Cat, { label: string; color: string; radius: number }> = {
  skill: { label: 'Skills', color: '#007AFF', radius: 4.5 }, subject: { label: 'Subjects', color: '#AF52DE', radius: 5.5 },
  project: { label: 'Projects', color: '#34C759', radius: 3 }, experience: { label: 'Experience', color: '#FF9F0A', radius: 3.6 },
  certification: { label: 'Certifications', color: '#5AC8FA', radius: 6.2 }, career: { label: 'Careers', color: '#5856D6', radius: 7.4 },
}
export const nextSteps: Record<Cat, string> = {
  skill: 'Build a small project that uses this skill and link it as evidence.', subject: 'Apply this subject in a practical project.',
  project: 'Add a description, a link and the skills it demonstrates.', experience: 'List the tasks you performed and the skills used.',
  certification: 'Attach the certificate or credential ID as evidence.', career: 'Review the missing skills for this career in Career Discovery.',
}

