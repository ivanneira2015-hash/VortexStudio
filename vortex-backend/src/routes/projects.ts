import { Router, Response } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { AuthRequest } from '../types.js'
import { sql } from '../db.js'

const router = Router()

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const projects = await sql`
    SELECT p.*, COUNT(g.id)::int AS generation_count
    FROM projects p
    LEFT JOIN generations g ON g.project_id = p.id
    WHERE p.user_id = ${req.user!.id}
    GROUP BY p.id
    ORDER BY p.updated_at DESC
  `
  res.json(projects)
})

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { name, description, stack = 'flutter', target = 'mobile' } = req.body
  if (!name) { res.status(400).json({ error: 'name requerido' }); return }

  const [project] = await sql`
    INSERT INTO projects (user_id, name, description, stack, target)
    VALUES (${req.user!.id}, ${name}, ${description ?? null}, ${stack}, ${target})
    RETURNING *
  `
  res.status(201).json(project)
})

router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const [project] = await sql`
    SELECT * FROM projects WHERE id = ${req.params.id} AND user_id = ${req.user!.id}
  `
  if (!project) { res.status(404).json({ error: 'Not found' }); return }

  const generations = await sql`
    SELECT id, prompt, preview, model_used, provider_used, created_at
    FROM generations WHERE project_id = ${req.params.id}
    ORDER BY created_at DESC
  `
  res.json({ ...project, generations })
})

router.get('/:id/generations/:genId', requireAuth, async (req: AuthRequest, res: Response) => {
  const [gen] = await sql`
    SELECT g.* FROM generations g
    JOIN projects p ON p.id = g.project_id
    WHERE g.id = ${req.params.genId} AND p.user_id = ${req.user!.id}
  `
  if (!gen) { res.status(404).json({ error: 'Not found' }); return }
  res.json(gen)
})

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  await sql`DELETE FROM projects WHERE id = ${req.params.id} AND user_id = ${req.user!.id}`
  res.json({ ok: true })
})

export default router
