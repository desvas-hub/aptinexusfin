function normalizeApiBase(raw?: string): string {
  const trimmed = (raw ?? '').trim().replace(/\/+$/, '')
  if (!trimmed) return '/api/v1'
  if (trimmed.endsWith('/api/v1')) return trimmed
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return `${trimmed}/api/v1`
  }
  return trimmed
}

export const API_BASE_URL: string = normalizeApiBase(import.meta.env.VITE_API_BASE_URL)
export const USE_MOCK = false

let accessToken: string | null = null
export const setAccessToken = (t: string | null) => {
  accessToken = t
}

const FALLBACK_BASES = ['/api/v1', 'http://localhost:3000/api/v1', 'http://localhost:8000/api/v1']

/** Single entry point for every API module. Static mock mode is permanently disabled. */
export async function request<T>(
  path: string,
  init?: RequestInit,
  _unusedFallback?: () => Promise<T>
): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && init?.body instanceof FormData
  const headers = new Headers(init?.headers)
  if (!isForm && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const bases = Array.from(new Set([API_BASE_URL, ...FALLBACK_BASES]))
  let lastError: Error | null = null

  for (const base of bases) {
    try {
      const res = await fetch(`${base}${path}`, { ...init, headers })
      const contentType = (res.headers.get('content-type') || '').toLowerCase()
      const rawText = await res.text()

      // Detect HTML SPA fallback responses (<!doctype html>) and try next base
      if (
        contentType.includes('text/html') ||
        rawText.trimStart().toLowerCase().startsWith('<!doctype html') ||
        rawText.trimStart().toLowerCase().startsWith('<html')
      ) {
        lastError = new Error(`API endpoint returned HTML fallback at ${base}${path}`)
        continue
      }

      let parsed: unknown = null
      try {
        parsed = rawText ? JSON.parse(rawText) : null
      } catch {
        lastError = new Error(`Invalid JSON response from ${base}${path}`)
        continue
      }

      if (!res.ok) {
        const detail =
          parsed && typeof parsed === 'object' && 'detail' in parsed
            ? String((parsed as { detail?: unknown }).detail)
            : `Request failed (${res.status})`
        throw new Error(detail)
      }

      return parsed as T
    } catch (err) {
      if (err instanceof TypeError) {
        // Network error (e.g. connection refused on port 8000), try next candidate base
        lastError = err
        continue
      }
      throw err
    }
  }

  throw lastError || new Error(`Unable to reach AptiNexus API for ${path}`)
}
