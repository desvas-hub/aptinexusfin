// Mock persistence adapter: localStorage standing in for the future database. Lives only in the mock layer.
export const mockKey = (name: string, uid: string | undefined) => name.startsWith('roadmap:') ? `aptinexus.roadmap.${uid}.${name.slice(8)}` : `aptinexus.${name}.${uid}`
export function readLocal<T>(name: string, uid: string | undefined, init: T): T { try { const r = localStorage.getItem(mockKey(name, uid)); return r ? (JSON.parse(r) as T) : init } catch { return init } }
export function writeLocal<T>(name: string, uid: string | undefined, v: T) { localStorage.setItem(mockKey(name, uid), JSON.stringify(v)) }
