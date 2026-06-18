import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth.js'
import projectsRouter from './routes/projects.js'
import generateRouter from './routes/generate.js'
import exportRouter from './routes/export.js'
import buildRouter from './routes/build.js'
import shareRouter from './routes/share.js'
import { authLimiter, generateLimiter, globalLimiter } from './middleware/rateLimiter.js'

const app = express()
const PORT = Number(process.env.PORT) || 3001

const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:5174')
  .split(',').map(o => o.trim())

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error('CORS not allowed'))
  },
  credentials: true,
}))
app.use(express.json())
app.use(globalLimiter)

app.get('/health', (_req, res) => res.json({ ok: true, version: '0.1.0' }))
app.use('/api/auth', authLimiter, authRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/generate', generateLimiter, generateRouter)
app.use('/api/export', exportRouter)
app.use('/api/build', buildRouter)
app.use('/api/share', shareRouter)

app.listen(PORT, () => console.log(`Vortex backend → http://localhost:${PORT}`))
