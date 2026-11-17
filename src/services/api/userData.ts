import { request } from './client'
import { readLocal, writeLocal } from '../mock/store'

// Each entry becomes a REST endpoint for the future FastAPI backend (see docs/API_CONTRACT.md).
const paths: Record<string, string> = { projects: '/projects', evidence: '/skillproof/evidence', results: '/assessments/results', settings: '/users/me/settings', notifRead: '/notifications/read', profile: '/profiles/me' }
const pathOf = (name: string) => (name.startsWith('roadmap:') ? `/roadmaps/${name.slice(8)}/progress` : paths[name])

export const userData = {
  get: <T,>(name: string, uid: string | undefined, init: T) => request<T>(pathOf(name), undefined, async () => readLocal(name, uid, init)),
  save: <T,>(name: string, uid: string | undefined, value: T) => request<T>(pathOf(name), { method: 'PUT', body: JSON.stringify(value) }, async () => { writeLocal(name, uid, value); return value }),
}
