import type { DashboardData } from '../../types'

export const delay = <T,>(v: T, ms = 400) => new Promise<T>(r => setTimeout(() => r(v), ms))
export const emptyDashboard: DashboardData = {
  profileCompletion: 0,
  readiness: 0,
  skills: [],
  skillCounts: {
    'Not started': 0,
    Claimed: 0,
    Practised: 0,
    Demonstrated: 0,
    Verified: 0,
  },
  careers: [],
  progress: [],
  strengths: [],
  focusSkills: [],
  activities: [],
}
