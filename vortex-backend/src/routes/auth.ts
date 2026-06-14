import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { sql } from '../db.js'

const router = Router()
const SECRET = process.env.JWT_SECRET!

// Minimal bcrypt-free hash using SHA-256 (no native deps needed in dev)
// For production swap with bcrypt
async function hashPassword(pw: string): Promise<string> {
  const { createHash } = await import('crypto')
  return createHash('sha256').update(pw + SECRET).digest('hex')
}

router.post('/register', async (req: Request, res: Response) => {
  const { email, password } = req.body
  if (!email || !password) { res.status(400).json({ error: 'email y password requeridos' }); return }

  const hash = await hashPassword(password)
  try {
    const [user] = await sql`
      INSERT INTO users (email, password_hash) VALUES (${email}, ${hash}) RETURNING id, email
    `
    const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '30d' })
    res.json({ token, user: { id: user.id, email: user.email } })
  } catch {
    res.status(409).json({ error: 'Email ya registrado' })
  }
})

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body
  const hash = await hashPassword(password)

  const [user] = await sql`
    SELECT id, email FROM users WHERE email = ${email} AND password_hash = ${hash}
  `
  if (!user) { res.status(401).json({ error: 'Credenciales invalidas' }); return }

  const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '30d' })
  res.json({ token, user: { id: user.id, email: user.email } })
})

export default router
