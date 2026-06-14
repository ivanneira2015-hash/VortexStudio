import { Router, Request, Response } from 'express'
import { GeneratedApp } from '../types.js'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { spawn, execSync } from 'child_process'

const router = Router()

// Temp store para APK downloads (buildId → apkPath)
const apkStore = new Map<string, { path: string; fileName: string; size: number }>()

// ── POST /api/build/apk — SSE stream del build ────────────────────
router.post('/apk', async (req: Request, res: Response) => {
  const app = req.body.app as GeneratedApp
  if (!app?.app_name) { res.status(400).json({ error: 'app requerida' }); return }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`)
  const heartbeat = setInterval(() => send({ type: 'heartbeat' }), 3000)

  try {
    const slug = app.app_name
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      || 'vortex_app'

    const buildId = randomUUID()
    const projectDir = join(tmpdir(), `vortex_${buildId}`, slug)

    send({ type: 'status', message: 'Preparando proyecto Flutter...' })

    mkdirSync(join(projectDir, 'lib', 'screens'), { recursive: true })
    writeFileSync(join(projectDir, 'pubspec.yaml'), app.pubspec_yaml ?? '')
    writeFileSync(join(projectDir, 'lib', 'main.dart'), app.main_dart ?? '')

    for (const screen of app.screens ?? []) {
      const fileName = toSnakeCase(screen.name) + '.dart'
      writeFileSync(join(projectDir, 'lib', 'screens', fileName), screen.code ?? '')
    }

    send({ type: 'status', message: 'Archivos escritos. Buscando Flutter SDK...' })

    const flutterCmd = findFlutter()
    if (!flutterCmd) {
      clearInterval(heartbeat)
      send({
        type: 'error',
        message:
          'Flutter SDK no encontrado. Instalalo desde https://flutter.dev/docs/get-started/install y asegurate de que esté en el PATH.',
      })
      res.end()
      return
    }

    send({ type: 'log', message: `Flutter encontrado: ${flutterCmd}` })
    send({ type: 'status', message: 'Descargando dependencias (flutter pub get)...' })

    await runCommand(flutterCmd, ['pub', 'get'], projectDir, (line) =>
      send({ type: 'log', message: line }),
    )

    send({ type: 'status', message: 'Compilando APK release... (puede tardar 2-5 minutos)' })

    await runCommand(
      flutterCmd,
      ['build', 'apk', '--release', '--no-tree-shake-icons'],
      projectDir,
      (line) => send({ type: 'log', message: line }),
    )

    const apkPath = join(
      projectDir,
      'build',
      'app',
      'outputs',
      'flutter-apk',
      'app-release.apk',
    )

    if (!existsSync(apkPath)) {
      throw new Error('APK no encontrado después del build. Revisá los logs.')
    }

    const { statSync } = await import('fs')
    const { size } = statSync(apkPath)
    const fileName = `${slug}.apk`

    apkStore.set(buildId, { path: apkPath, fileName, size })

    clearInterval(heartbeat)
    send({ type: 'done', buildId, fileName, size, apkPath })
    res.end()
  } catch (err: unknown) {
    clearInterval(heartbeat)
    send({ type: 'error', message: err instanceof Error ? err.message : 'Error en el build' })
    res.end()
  }
})

// ── GET /api/build/download/:id — descargar APK ───────────────────
router.get('/download/:id', (req: Request, res: Response) => {
  const entry = apkStore.get(req.params.id)
  if (!entry || !existsSync(entry.path)) {
    res.status(404).json({ error: 'APK no encontrado o expirado' })
    return
  }
  res.setHeader('Content-Type', 'application/vnd.android.package-archive')
  res.setHeader('Content-Disposition', `attachment; filename="${entry.fileName}"`)
  res.sendFile(entry.path)
})

// ── GET /api/build/check — verifica si Flutter está disponible ────
router.get('/check', (_req: Request, res: Response) => {
  const flutterCmd = findFlutter()
  res.json({
    flutterAvailable: !!flutterCmd,
    flutterPath: flutterCmd ?? null,
  })
})

function findFlutter(): string | null {
  try {
    const result = execSync(
      process.platform === 'win32' ? 'where flutter' : 'which flutter',
      { encoding: 'utf8', timeout: 5000 },
    )
    const p = result.trim().split('\n')[0].trim()
    if (p) return p
  } catch { /* not found in PATH */ }

  // Rutas comunes en Windows
  if (process.platform === 'win32') {
    const common = [
      join(process.env.USERPROFILE ?? 'C:\\Users\\eze2', 'flutter', 'bin', 'flutter.bat'),
      'C:\\flutter\\bin\\flutter.bat',
      'C:\\src\\flutter\\bin\\flutter.bat',
      'C:\\development\\flutter\\bin\\flutter.bat',
    ]
    for (const p of common) {
      if (existsSync(p)) return p
    }
  }
  return null
}

function runCommand(
  cmd: string,
  args: string[],
  cwd: string,
  onLine: (line: string) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, shell: true })

    const handle = (d: Buffer) =>
      d.toString()
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .forEach(onLine)

    proc.stdout.on('data', handle)
    proc.stderr.on('data', handle)
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Proceso salió con código ${code}`))))
    proc.on('error', reject)
  })
}

function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
}

export default router
