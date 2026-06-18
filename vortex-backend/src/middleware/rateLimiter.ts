import rateLimit from 'express-rate-limit'

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados intentos. Intentá de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
})

export const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { error: 'Límite de generaciones alcanzado. Esperá un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
})

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Demasiadas solicitudes.' },
  standardHeaders: true,
  legacyHeaders: false,
})
