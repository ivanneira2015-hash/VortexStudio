import { Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AuthRequest } from '../types.js'

const SECRET = process.env.JWT_SECRET!

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token requerido' })
    return
  }
  try {
    const payload = jwt.verify(header.slice(7), SECRET) as { id: string; email: string }
    req.user = payload
    next()
  } catch {
    res.status(401).json({ error: 'Token invalido' })
  }
}
