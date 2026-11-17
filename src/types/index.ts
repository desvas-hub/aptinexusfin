export type SkillStatus = 'Not started' | 'Claimed' | 'Practised' | 'Demonstrated' | 'Verified'

export interface User {
  id: string
  name: string
  email: string
  headline: string
}

export interface Skill {
  id: string
  name: string
  category: string
  status: SkillStatus
}

export interface CareerMatch {
  id: string
  title: string
  category: string
  compatibility: number
  missingSkills: number
  matched?: string[]
  missing?: string[]
}

export interface ProgressPoint {
  month: string
  skills: number
  demonstrated: number
}

export interface DashboardData {
  profileCompletion?: number
  readiness: number
  skills?: Skill[]
  skillCounts: Record<SkillStatus, number>
  careers: CareerMatch[]
  progress: ProgressPoint[]
  strengths: string[]
  focusSkills: { name: string; priority: string; career: string }[]
  activities: { id: string; text: string; when: string }[]
  assessmentCount?: number
}

export type NotificationCategory =
  | 'Learning reminder'
  | 'Roadmap milestone'
  | 'Skill recommendation'
  | 'Assessment result'
  | 'Profile update'

export interface NotificationItem {
  id: string
  cat: NotificationCategory
  title: string
  body: string
  when: string
  actionPath?: string
  actionLabel?: string
}

export type ProfileSectionId =
  | 'name'
  | 'headline'
  | 'location'
  | 'education'
  | 'subjects'
  | 'technical'
  | 'soft'
  | 'interests'
  | 'experience'
  | 'projects'
  | 'certifications'
  | 'achievements'
  | 'goals'

export interface ProfileCorrection {
  section: ProfileSectionId
  currentValue?: string
  suggestedValue: string
  reason: string
}

export interface SkillNormalization {
  rawSkill: string
  canonicalSkill: string
  reason: string
}

export interface AiCareerTarget {
  careerId: string
  title: string
  fitScore: number
  rationale: string
  matchedSkills: string[]
  missingCoreSkills: string[]
  bridgeSkills: string[]
  suggestedHeadline?: string
}

export interface AiCourseRecommendation {
  resourceId?: string
  title: string
  skill: string
  type: string
  level: string
  url: string
  reason: string
  targetCareerTitle: string
  priority: 'Immediate' | 'Next' | 'Stretch'
}

export interface AiRecommendationsResult {
  summary: string
  careerTargets: AiCareerTarget[]
  courseRecommendations: AiCourseRecommendation[]
  profileCorrections: ProfileCorrection[]
  skillNormalizations: SkillNormalization[]
  generatedBy: string
}

export interface SkillMicroQuizQuestion {
  q: string
  options: string[]
}

export interface SkillMicroQuiz {
  skill: string
  title: string
  quizToken: string
  questions: SkillMicroQuizQuestion[]
  generatedBy: string
}

export interface SkillMicroQuizSubmission {
  skill: string
  score: number
  total: number
  percentage: number
  verified: boolean
  statusUpgrade: 'Practised' | 'Claimed'
  correctAnswers: number[]
  explanations: string[]
  feedback: string
}

export interface ResumeSuggestion {
  section: ProfileSectionId
  item: string
  reason?: string
}

export interface ResumeAnalysis {
  fileName: string
  summary: string
  extracted: Record<string, string[]>
  suggestions: ResumeSuggestion[]
  profileCorrections?: ProfileCorrection[]
  skillNormalizations?: SkillNormalization[]
  recommendedCareerIds?: string[]
  missingSections: string[]
  generatedBy?: string
}
