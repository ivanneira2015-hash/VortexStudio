const BASE = '/api'

function getToken() { return localStorage.getItem('vortex_token') }

function headers(): HeadersInit {
  const t = getToken()
  return {
    'Content-Type': 'application/json',
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, { ...init, headers: headers() })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  post: <T>(path: string, body: unknown) =>
    req<T>(path, { method: 'POST', body: JSON.stringify(body) }),

  get: <T>(path: string) => req<T>(path),

  del: <T>(path: string) => req<T>(path, { method: 'DELETE' }),
}

export function setToken(token: string) { localStorage.setItem('vortex_token', token) }
export function clearToken() { localStorage.removeItem('vortex_token') }
export function isLoggedIn() { return !!getToken() }

export interface StreamEvent {
  type: 'status' | 'chunk' | 'done' | 'error' | 'heartbeat' | 'log'
  message?: string
  content?: string
  generation?: {
    id: string | null
    app: import('../types').GeneratedApp
    provider: string
    model: string
  }
  screen?: import('../types').GeneratedScreen
  screenName?: string
  // APK build
  buildId?: string
  fileName?: string
  size?: number
  apkPath?: string
}

export function streamGenerate(
  body: Record<string, unknown>,
  onEvent: (e: StreamEvent) => void,
): () => void {
  const controller = new AbortController()

  ;(async () => {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            onEvent(JSON.parse(line.slice(6)) as StreamEvent)
          } catch { /* ignore malformed */ }
        }
      }
    }
  })().catch(err => {
    if (err.name !== 'AbortError') onEvent({ type: 'error', message: err.message })
  })

  return () => controller.abort()
}

export function streamEditScreen(
  body: Record<string, unknown>,
  onEvent: (e: StreamEvent) => void,
): () => void {
  const controller = new AbortController()

  ;(async () => {
    const res = await fetch('/api/generate/screen', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try { onEvent(JSON.parse(line.slice(6)) as StreamEvent) } catch { /* ignore */ }
        }
      }
    }
  })().catch(err => {
    if (err.name !== 'AbortError') onEvent({ type: 'error', message: err.message })
  })

  return () => controller.abort()
}

export function streamBuildApk(
  body: Record<string, unknown>,
  onEvent: (e: StreamEvent) => void,
): () => void {
  const controller = new AbortController()

  ;(async () => {
    const res = await fetch('/api/build/apk', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try { onEvent(JSON.parse(line.slice(6)) as StreamEvent) } catch { /* ignore */ }
        }
      }
    }
  })().catch(err => {
    if (err.name !== 'AbortError') onEvent({ type: 'error', message: err.message })
  })

  return () => controller.abort()
}

export function streamGenerateFromImage(
  body: {
    imageBase64: string
    imageType: string
    stack: import('../types').AppStack
    target: import('../types').AppTarget
    byokAnthropic?: string
  },
  onEvent: (e: StreamEvent) => void,
): () => void {
  const controller = new AbortController()

  ;(async () => {
    const res = await fetch('/api/generate/image', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try { onEvent(JSON.parse(line.slice(6)) as StreamEvent) } catch { /* ignore */ }
        }
      }
    }
  })().catch(err => {
    if (err.name !== 'AbortError') onEvent({ type: 'error', message: err.message })
  })

  return () => controller.abort()
}

export async function shareApp(
  app: import('../types').GeneratedApp,
): Promise<{ shareId: string; shareUrl: string }> {
  const res = await fetch('/api/share', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ app }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export async function checkFlutter(): Promise<{ flutterAvailable: boolean; flutterPath: string | null }> {
  const res = await fetch('/api/build/check', { headers: headers() })
  return res.json()
}
