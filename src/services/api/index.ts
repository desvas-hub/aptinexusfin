import { request } from './client'
import { userData } from './userData'
import { careers, type Career } from '../../data/careers'
import type { LibSkill } from '../../data/skills'
import type { Resource } from '../../data/resources'
import type { Assessment } from '../../data/assessments'
import type { ProfileData } from '../../data/profile'
import type {
  AiRecommendationsResult,
  CareerMatch,
  DashboardData,
  NotificationItem,
  ResumeAnalysis,
  SkillMicroQuiz,
  SkillMicroQuizSubmission,
  User,
} from '../../types'

const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) })
const put = (body: unknown): RequestInit => ({ method: 'PUT', body: JSON.stringify(body) })

export const authApi = {
  login: (email: string, password: string) =>
    request<{ user: User; token: string }>('/auth/login', post({ email, password })),
  register: (name: string, email: string, password: string) =>
    request<{ user: User; token: string }>('/auth/register', post({ name, email, password })),
}

export const analyticsApi = {
  dashboard: () => request<DashboardData>('/analytics/dashboard'),
}

export const notificationsApi = {
  list: () => request<NotificationItem[]>('/notifications'),
  getRead: () => request<string[]>('/notifications/read'),
  saveRead: (ids: string[]) => request<string[]>('/notifications/read', put(ids)),
}

export const profilesApi = {
  get: (uid: string, init: ProfileData) => userData.get('profile', uid, init),
  save: (uid: string, p: ProfileData) => userData.save('profile', uid, p),
}

export const roadmapApi = {
  progress: (uid: string | undefined, careerId: string) =>
    userData.get<string[]>(`roadmap:${careerId}`, uid, []),
  totalDone: async (uid: string | undefined) =>
    (
      await Promise.all(careers.map(c => userData.get<string[]>(`roadmap:${c.id}`, uid, [])))
    ).reduce((n, l) => n + l.length, 0),
}

export const careersApi = {
  list: () => request<Career[]>('/careers'),
  get: (id: string) => request<Career>(`/careers/${id}`),
}

export const skillsApi = {
  list: () => request<LibSkill[]>('/skills'),
}

export const resourcesApi = {
  list: () => request<Resource[]>('/resources'),
}

export const assessmentsApi = {
  list: () => request<Assessment[]>('/assessments'),
  submit: (id: string, answers: number[]) =>
    request<{
      assessmentId: string
      score: number
      total: number
      percentage: number
      correctAnswers: number[]
      feedback: string
    }>(`/assessments/${id}/submit`, post({ answers })),
}

export const skillGraphApi = {
  get: () => request<{ nodes: unknown[]; edges: [string, string][] }>('/skillgraph'),
}

export const resumeApi = {
  analyse: (file: File) => {
    const body = new FormData()
    body.append('file', file)
    return request<ResumeAnalysis>('/resume/analyze', { method: 'POST', body })
  },
}

export const matchingApi = {
  recommendations: (_have: string[] = []) => request<CareerMatch[]>('/careers/matches'),
}

export const gapsApi = {
  analyse: (careerId: string, _have: string[] = []) =>
    request<{ careerId?: string; strengths: string[]; missing: string[]; optional: string[]; method?: string }>(
      `/careers/${careerId}/gaps`
    ),
}

export const whatIfApi = {
  simulate: (extraSkills: string[], _have: string[] = []) =>
    request<{ id: string; current: number; hypothetical: number; change: number; stillNeeded: string[] }[]>(
      '/what-if',
      post({ extraSkills })
    ),
}

export const aiApi = {
  recommendations: (params?: { focus?: string; focusCareerId?: string }) =>
    request<AiRecommendationsResult>('/ai/recommendations', post(params || {})),
  generateSkillQuiz: (skill: string) =>
    request<SkillMicroQuiz>('/ai/skill-quiz', post({ skill })),
  submitSkillQuiz: (quizToken: string, answers: number[]) =>
    request<SkillMicroQuizSubmission>('/ai/skill-quiz/submit', post({ quizToken, answers })),
}
