import { Router, Request, Response } from 'express'
import { GeneratedApp } from '../types.js'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir, userInfo } from 'os'
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

    send({ type: 'status', message: 'Preparando proyecto Flutter...', percent: 5, step: 'init' })

    mkdirSync(join(projectDir, 'lib', 'screens'), { recursive: true })
    writeFileSync(join(projectDir, 'pubspec.yaml'), app.pubspec_yaml ?? '')
    writeFileSync(join(projectDir, 'lib', 'main.dart'), app.main_dart ?? '')

    for (const screen of app.screens ?? []) {
      const fileName = toSnakeCase(screen.name) + '.dart'
      writeFileSync(join(projectDir, 'lib', 'screens', fileName), screen.code ?? '')
    }

    send({ type: 'status', message: 'Archivos escritos. Buscando Flutter SDK...', percent: 10, step: 'detect_sdk' })
    send({ type: 'progress', percent: 10, step: 'detect_sdk' })

    const flutterCmd = findFlutter()
    if (!flutterCmd) {
      clearInterval(heartbeat)
      send({
        type: 'error',
        message:
          'Flutter SDK no encontrado. Instalalo desde https://flutter.dev/docs/get-started/install y asegurate de que esté en el PATH.',
        percent: 0,
        step: 'error',
      })
      res.end()
      return
    }

    send({ type: 'log', message: `Flutter encontrado: ${flutterCmd}` })
    send({ type: 'status', message: 'Descargando dependencias (flutter pub get)...', percent: 20, step: 'pub_get' })
    send({ type: 'progress', percent: 20, step: 'pub_get' })

    await runCommand(flutterCmd, ['pub', 'get'], projectDir, (line) => {
      send({ type: 'log', message: line })
      // Incrementar gradualmente durante pub get (20% → 30%)
      send({ type: 'progress', percent: 25, step: 'pub_get' })
    })

    send({ type: 'status', message: 'Dependencias listas.', percent: 30, step: 'pub_get_done' })
    send({ type: 'progress', percent: 30, step: 'pub_get_done' })

    send({ type: 'status', message: 'Compilando APK release... (puede tardar 2-5 minutos)', percent: 35, step: 'build' })
    send({ type: 'progress', percent: 35, step: 'build' })

    let buildPercent = 35
    await runCommand(
      flutterCmd,
      ['build', 'apk', '--release', '--no-tree-shake-icons'],
      projectDir,
      (line) => {
        send({ type: 'log', message: line })
        // Incrementar porcentaje gradualmente durante el build (35% → 90%)
        if (buildPercent < 90) {
          buildPercent = Math.min(buildPercent + 1, 90)
          send({ type: 'progress', percent: buildPercent, step: 'build' })
        }
      },
    )

    send({ type: 'status', message: 'Build completado. Verificando APK...', percent: 92, step: 'verify' })
    send({ type: 'progress', percent: 92, step: 'verify' })

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
    send({ type: 'progress', percent: 100, step: 'done' })
    send({ type: 'done', buildId, fileName, size, apkPath, percent: 100 })
    res.end()
  } catch (err: unknown) {
    clearInterval(heartbeat)
    send({ type: 'error', message: err instanceof Error ? err.message : 'Error en el build', percent: 0, step: 'error' })
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

// ── POST /api/build/github-actions — genera YAML para CI/CD en la nube ──
router.post('/github-actions', (req: Request, res: Response) => {
  const app = req.body.app as GeneratedApp
  if (!app?.app_name) {
    res.status(400).json({ error: 'app requerida' })
    return
  }

  const slug = app.app_name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    || 'vortex-app'

  const yaml = generateGithubActionsYaml(slug)

  res.json({
    yaml,
    fileName: 'build.yml',
    path: '.github/workflows/build.yml',
    instructions: [
      'Copiá el contenido YAML en tu repositorio en .github/workflows/build.yml',
      'Hacé push a la rama main para disparar el build automáticamente',
      'El APK estará disponible en la pestaña Actions → Artifacts de tu repo de GitHub',
      'No requiere Flutter instalado localmente — todo corre en la nube gratis',
    ],
  })
})

// ── GET /api/build/flutter-install-guide — guía de instalación por OS ──
router.get('/flutter-install-guide', (_req: Request, res: Response) => {
  const platform = process.platform as NodeJS.Platform
  const guide = getInstallGuide(platform)
  res.json(guide)
})

function findFlutter(): string | null {
  // 1. Buscar en PATH primero (más confiable)
  try {
    const result = execSync(
      process.platform === 'win32' ? 'where flutter' : 'which flutter',
      { encoding: 'utf8', timeout: 5000 },
    )
    const p = result.trim().split('\n')[0].trim()
    if (p) return p
  } catch { /* not found in PATH */ }

  // 2. Rutas específicas por plataforma
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA ?? ''
    const appData = process.env.APPDATA ?? ''
    const userProfile = process.env.USERPROFILE ?? ''
    let username = ''
    try { username = userInfo().username } catch { /* ignore */ }

    const candidates = [
      // Variables de entorno de Windows
      join(localAppData, 'flutter', 'bin', 'flutter.bat'),
      join(appData, 'flutter', 'bin', 'flutter.bat'),
      // Programs bajo LOCALAPPDATA
      join(localAppData, 'Programs', 'flutter', 'bin', 'flutter.bat'),
      // Carpeta del usuario (USERPROFILE)
      join(userProfile, 'flutter', 'bin', 'flutter.bat'),
      // Ruta con username explícito (por si USERPROFILE no está)
      username ? `C:\\Users\\${username}\\AppData\\Local\\flutter\\bin\\flutter.bat` : '',
      username ? `C:\\Users\\${username}\\AppData\\Roaming\\flutter\\bin\\flutter.bat` : '',
      username ? `C:\\Users\\${username}\\AppData\\Local\\Programs\\flutter\\bin\\flutter.bat` : '',
      // Program Files
      'C:\\Program Files\\flutter\\bin\\flutter.bat',
      'C:\\Program Files (x86)\\flutter\\bin\\flutter.bat',
      // Rutas clásicas
      join(userProfile, 'flutter', 'bin', 'flutter.bat'),
      'C:\\flutter\\bin\\flutter.bat',
      'C:\\src\\flutter\\bin\\flutter.bat',
      'C:\\development\\flutter\\bin\\flutter.bat',
      'D:\\flutter\\bin\\flutter.bat',
    ].filter(Boolean)

    for (const p of candidates) {
      if (p && existsSync(p)) return p
    }

    // 3. Buscar en carpetas del PATH que contengan "flutter"
    try {
      const pathDirs = (process.env.PATH ?? '').split(';')
      for (const dir of pathDirs) {
        if (dir.toLowerCase().includes('flutter')) {
          const candidate = join(dir, 'flutter.bat')
          if (existsSync(candidate)) return candidate
          const candidate2 = join(dir, '..', 'bin', 'flutter.bat')
          if (existsSync(candidate2)) return candidate2
        }
      }
    } catch { /* ignore */ }
  }

  // macOS / Linux
  if (process.platform === 'darwin' || process.platform === 'linux') {
    const home = process.env.HOME ?? ''
    const candidates = [
      join(home, 'flutter', 'bin', 'flutter'),
      join(home, 'development', 'flutter', 'bin', 'flutter'),
      '/opt/flutter/bin/flutter',
      '/usr/local/flutter/bin/flutter',
      '/usr/local/bin/flutter',
    ]
    for (const p of candidates) {
      if (existsSync(p)) return p
    }

    // Buscar en PATH con "flutter"
    try {
      const pathDirs = (process.env.PATH ?? '').split(':')
      for (const dir of pathDirs) {
        if (dir.toLowerCase().includes('flutter')) {
          const candidate = join(dir, 'flutter')
          if (existsSync(candidate)) return candidate
        }
      }
    } catch { /* ignore */ }
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

function generateGithubActionsYaml(appSlug: string): string {
  return `name: Build Flutter APK

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  build:
    name: Build Release APK
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Java 17
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'

      - name: Set up Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.x'
          channel: stable
          cache: true

      - name: Get Flutter version
        run: flutter --version

      - name: Install dependencies
        run: flutter pub get

      - name: Run tests (optional)
        run: flutter test
        continue-on-error: true

      - name: Build APK (release)
        run: flutter build apk --release --no-tree-shake-icons

      - name: Upload APK artifact
        uses: actions/upload-artifact@v4
        with:
          name: ${appSlug}-release
          path: build/app/outputs/flutter-apk/app-release.apk
          retention-days: 30
          if-no-files-found: error
`
}

function getInstallGuide(platform: NodeJS.Platform): {
  platform: string
  displayName: string
  steps: string[]
  downloadUrl: string
  notes: string[]
} {
  if (platform === 'win32') {
    return {
      platform: 'windows',
      displayName: 'Windows',
      downloadUrl: 'https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.32.0-stable.zip',
      steps: [
        '1. Descargá el SDK desde https://flutter.dev/docs/get-started/install/windows',
        '2. Extraé el zip en C:\\flutter (evitá rutas con espacios o caracteres especiales)',
        '3. Abrí el Panel de Control → Sistema → Variables de entorno',
        '4. En "Variables del usuario", editá la variable PATH y agregá: C:\\flutter\\bin',
        '5. Abrí una nueva terminal PowerShell y ejecutá: flutter doctor',
        '6. Instalá Android Studio desde https://developer.android.com/studio',
        '7. En Android Studio: Tools → SDK Manager → instala Android SDK 33+',
        '8. Ejecutá: flutter doctor --android-licenses y aceptá todas las licencias',
        '9. Verificá todo con: flutter doctor -v (todos los ítems deben tener checkmark)',
      ],
      notes: [
        'Requerís tener Git instalado: https://git-scm.com/download/win',
        'Si instalás Flutter en otro disco (D:\\), ajustá el PATH según corresponda',
        'Para builds APK solo necesitás el Android SDK, no hace falta un emulador',
      ],
    }
  }

  if (platform === 'darwin') {
    return {
      platform: 'mac',
      displayName: 'macOS',
      downloadUrl: 'https://storage.googleapis.com/flutter_infra_release/releases/stable/macos/flutter_macos_arm64_3.32.0-stable.zip',
      steps: [
        '1. Descargá el SDK desde https://flutter.dev/docs/get-started/install/macos',
        '2. Extraé el zip y movelo a ~/flutter',
        '3. Agregá Flutter al PATH editando ~/.zshrc: export PATH="$HOME/flutter/bin:$PATH"',
        '4. Ejecutá: source ~/.zshrc',
        '5. Verificá con: flutter doctor',
        '6. Instalá Android Studio desde https://developer.android.com/studio',
        '7. En Android Studio: Tools → SDK Manager → instala Android SDK 33+',
        '8. Ejecutá: flutter doctor --android-licenses y aceptá todas las licencias',
        '9. Para apps iOS también necesitás Xcode desde la App Store',
      ],
      notes: [
        'En Apple Silicon (M1/M2/M3) usá la versión arm64 del SDK',
        'Para builds solo APK no necesitás Xcode',
        'Podés usar Homebrew: brew install --cask flutter',
      ],
    }
  }

  // Linux
  return {
    platform: 'linux',
    displayName: 'Linux',
    downloadUrl: 'https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.32.0-stable.tar.xz',
    steps: [
      '1. Descargá el SDK desde https://flutter.dev/docs/get-started/install/linux',
      '2. Extraé: tar xf flutter_linux_*-stable.tar.xz -C ~/development/',
      '3. Agregá al PATH en ~/.bashrc: export PATH="$HOME/development/flutter/bin:$PATH"',
      '4. Ejecutá: source ~/.bashrc',
      '5. Verificá con: flutter doctor',
      '6. Instalá dependencias: sudo apt-get install libglu1-mesa clang cmake ninja-build libgtk-3-dev',
      '7. Instalá Android Studio desde https://developer.android.com/studio',
      '8. En Android Studio: Tools → SDK Manager → instala Android SDK 33+',
      '9. Ejecutá: flutter doctor --android-licenses y aceptá todas las licencias',
    ],
    notes: [
      'Snap: snap install flutter --classic (más fácil pero puede tener limitaciones)',
      'Asegurate de tener curl, git, unzip, xz-utils instalados',
      'Para builds solo APK no necesitás configurar el entorno de desktop Linux',
    ],
  }
}

export default router
