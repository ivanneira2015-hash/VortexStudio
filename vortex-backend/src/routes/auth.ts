import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { sql } from '../db.js'

const router = Router()
const SECRET = process.env.JWT_SECRET!

router.post('/register', async (req: Request, res: Response) => {
  const { email, password } = req.body
  if (!email || !password) { res.status(400).json({ error: 'email y password requeridos' }); return }

  const hash = await bcrypt.hash(password, 12)
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
  if (!email || !password) { res.status(400).json({ error: 'email y password requeridos' }); return }

  try {
    const [user] = await sql`SELECT id, email, password_hash FROM users WHERE email = ${email}`
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ error: 'Credenciales invalidas' }); return
    }

    const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '30d' })
    res.json({ token, user: { id: user.id, email: user.email } })
  } catch {
    res.status(500).json({ error: 'Error interno al iniciar sesión' })
  }
})

export default router
