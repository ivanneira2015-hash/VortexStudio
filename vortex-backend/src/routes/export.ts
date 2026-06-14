import { Router, Request, Response } from 'express'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const archiver = require('archiver') as (format: string, opts?: object) => import('archiver').Archiver
import { GeneratedApp } from '../types.js'

const router = Router()

// POST /api/export/zip  — body: { app: GeneratedApp }
router.post('/zip', (req: Request, res: Response) => {
  const app = req.body.app as GeneratedApp
  if (!app?.app_name) { res.status(400).json({ error: 'app requerida' }); return }

  const slug = app.app_name.toLowerCase().replace(/\s+/g, '_')

  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', `attachment; filename="${slug}.zip"`)

  const archive = archiver('zip', { zlib: { level: 9 } })
  archive.pipe(res)
  archive.on('error', (err: unknown) => { console.error('ZIP error:', err); res.destroy() })

  // pubspec.yaml
  archive.append(app.pubspec_yaml ?? '', { name: `${slug}/pubspec.yaml` })

  // main.dart
  archive.append(app.main_dart ?? '', { name: `${slug}/lib/main.dart` })

  // Una pantalla por archivo
  for (const screen of app.screens ?? []) {
    const fileName = toSnakeCase(screen.name) + '.dart'
    archive.append(screen.code ?? '', { name: `${slug}/lib/screens/${fileName}` })
  }

  // README mínimo
  const readme = `# ${app.app_name}\n\n${app.description}\n\n## Cómo usar\n\n\`\`\`bash\nflutter pub get\nflutter run\n\`\`\`\n`
  archive.append(readme, { name: `${slug}/README.md` })

  archive.finalize()
})

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
}

export default router
