import { Router, Request, Response } from 'express'
import { GeneratedApp } from '../types.js'

const router = Router()

const MAX_SHARES = 100
const TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

interface ShareEntry {
  app: GeneratedApp
  createdAt: number
}

// In-memory store: shareId → entry
const store = new Map<string, ShareEntry>()

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function evictOldest(): void {
  // Remove expired entries first
  const now = Date.now()
  for (const [id, entry] of store.entries()) {
    if (now - entry.createdAt > TTL_MS) store.delete(id)
  }

  // If still over limit, remove oldest entries
  if (store.size >= MAX_SHARES) {
    const sorted = [...store.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)
    const toRemove = sorted.slice(0, store.size - MAX_SHARES + 1)
    for (const [id] of toRemove) store.delete(id)
  }
}

// ── POST /api/share ───────────────────────────────────────────────
router.post('/', (req: Request, res: Response) => {
  const { app } = req.body as { app?: GeneratedApp }

  if (!app || !app.screens?.length) {
    res.status(400).json({ error: 'app requerida con al menos una pantalla' })
    return
  }

  evictOldest()

  const shareId = generateId()
  store.set(shareId, { app, createdAt: Date.now() })

  const frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:5174').split(',')[0].trim()
  const shareUrl = `${frontendUrl}/share/${shareId}`

  res.json({ shareId, shareUrl })
})

// ── GET /api/share/:id ────────────────────────────────────────────
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const entry = store.get(id)

  if (!entry) {
    res.status(404).json({ error: 'Share no encontrado o expirado' })
    return
  }

  // Check TTL
  if (Date.now() - entry.createdAt > TTL_MS) {
    store.delete(id)
    res.status(404).json({ error: 'Share expirado (TTL 24h)' })
    return
  }

  res.json({ app: entry.app })
})

export default router
