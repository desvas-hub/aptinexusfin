export interface Project { id: string; title: string; desc: string; tech: string[]; skills: string[]; link: string; image: string }
export interface Evidence { id: string; skill: string; type: 'Certification' | 'Experience' | 'Demonstration'; note: string; link: string }
export interface Result { id: string; assessment: string; skill: string; score: number; total: number; date: string }
export type ProofStatus = 'Not started' | 'Claimed' | 'Practised' | 'Demonstrated' | 'Verified' | 'Unknown'
/** Recorded evidence makes a skill Practised; linked project demonstrations make it Demonstrated. */
export function statusFor(skill: string, projects: Project[], ev: Evidence[], res: Result[], claimedSkills: string[] | null = []): ProofStatus {
  const items = [
    ...projects.filter(p => p.skills.includes(skill)).map(p => ({ strong: !!p.link })),
    ...ev.filter(e => e.skill === skill).map(e => ({ strong: e.type === 'Demonstration' && !!e.link })),
    ...res.filter(r => r.skill === skill && r.score / r.total >= 0.7).map(() => ({ strong: false })),
  ]
  if (items.some(i => i.strong)) return 'Demonstrated'
  if (items.length) return 'Practised'
  if (claimedSkills === null) return 'Unknown'
  return claimedSkills.some(claimed => claimed.trim().toLocaleLowerCase() === skill.toLocaleLowerCase()) ? 'Claimed' : 'Not started'
}

