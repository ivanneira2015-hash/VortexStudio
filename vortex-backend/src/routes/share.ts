import { Router, Request, Response } from 'express'
import { sql } from '../db.js'
import crypto from 'crypto'
import { GeneratedApp } from '../types.js'

const router = Router()
const TTL_MS = 24 * 60 * 60 * 1000

function generateId(): string {
  return crypto.randomBytes(8).toString('hex')
}

router.post('/', async (req: Request, res: Response) => {
  const { app } = req.body as { app?: GeneratedApp }

  if (!app || !app.screens?.length) {
    res.status(400).json({ error: 'app requerida con al menos una pantalla' })
    return
  }

  try {
    const shareId = generateId()
    const expiresAt = new Date(Date.now() + TTL_MS)

    await sql`
      INSERT INTO shared_apps (id, app_data, expires_at)
      VALUES (${shareId}, ${sql.json(app as unknown as Parameters<typeof sql.json>[0])}, ${expiresAt})
    `

    const frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:5174').split(',')[0].trim()
    res.json({ shareId, shareUrl: `${frontendUrl}/share/${shareId}` })
  } catch (err) {
    console.error('Error saving share:', err)
    res.status(500).json({ error: 'Error al guardar el share' })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const [entry] = await sql`
      SELECT app_data FROM shared_apps
      WHERE id = ${id} AND expires_at > NOW()
    `

    if (!entry) {
      res.status(404).json({ error: 'Share no encontrado o expirado (TTL 24h)' })
      return
    }

    res.json({ app: entry.app_data })
  } catch (err) {
    console.error('Error fetching share:', err)
    res.status(500).json({ error: 'Error al obtener el share' })
  }
})

export default router
