const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const Store = require('electron-store')

const store = new Store()
const isDev = !app.isPackaged
const BACKEND_PORT = 3003
const FRONTEND_PORT = 5174

let mainWindow = null
let backendProcess = null
let frontendProcess = null

// ── Lanzar backend Express ────────────────────────────────────────
function startBackend() {
  const backendDir = isDev
    ? path.join(__dirname, '../../vortex-backend')
    : path.join(process.resourcesPath, 'vortex-backend')

  const cmd = isDev ? 'npx' : 'node'
  const args = isDev
    ? ['tsx', 'src/server.ts']
    : ['dist/server.js']

  backendProcess = spawn(cmd, args, {
    cwd: backendDir,
    env: { ...process.env, PORT: String(BACKEND_PORT) },
    shell: true,
  })

  backendProcess.stdout.on('data', d => console.log('[backend]', d.toString()))
  backendProcess.stderr.on('data', d => console.error('[backend]', d.toString()))

  return new Promise(resolve => {
    backendProcess.stdout.on('data', d => {
      if (d.toString().includes('localhost')) resolve(true)
    })
    setTimeout(resolve, 4000) // fallback: esperar 4s
  })
}

// ── Lanzar Vite dev server (solo en desarrollo) ───────────────────
function startFrontend() {
  if (!isDev) return Promise.resolve()

  const frontendDir = path.join(__dirname, '../../vortex-app')
  frontendProcess = spawn('npx', ['vite', '--port', String(FRONTEND_PORT)], {
    cwd: frontendDir,
    shell: true,
  })

  frontendProcess.stdout.on('data', d => console.log('[frontend]', d.toString()))

  return new Promise(resolve => {
    frontendProcess.stdout.on('data', d => {
      if (d.toString().includes('localhost')) resolve(true)
    })
    setTimeout(resolve, 6000)
  })
}

// ── Crear ventana principal ───────────────────────────────────────
function createWindow() {
  const { width = 1400, height = 900 } = store.get('windowBounds') ?? {}

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 1100,
    minHeight: 700,
    title: 'Vortex Studio',
    backgroundColor: '#F8F9FF',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    // Sin barra de menú nativa
    autoHideMenuBar: true,
  })

  const url = isDev
    ? `http://localhost:${FRONTEND_PORT}`
    : `file://${path.join(__dirname, '../../vortex-app/dist/index.html')}`

  mainWindow.loadURL(url)

  // Guardar tamaño de ventana al cerrar
  mainWindow.on('close', () => {
    store.set('windowBounds', mainWindow.getBounds())
  })

  // Abrir links externos en el browser del sistema
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' })
}

// ── IPC: abrir carpeta en Explorer ───────────────────────────────
ipcMain.handle('open-folder', async (_e, folderPath) => {
  shell.openPath(folderPath)
})

// ── IPC: guardar archivo en disco ────────────────────────────────
ipcMain.handle('save-file', async (_e, { filePath, content }) => {
  const fs = require('fs')
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filePath, content, 'utf8')
  return { ok: true }
})

// ── IPC: obtener ruta de proyectos ────────────────────────────────
ipcMain.handle('get-projects-dir', () => {
  return path.join(app.getPath('documents'), 'VortexStudio')
})

// ── IPC: obtener ruta de builds ───────────────────────────────────
ipcMain.handle('get-builds-dir', () => {
  return path.join(app.getPath('documents'), 'VortexStudio', 'builds')
})

// ── App lifecycle ─────────────────────────────────────────────────
app.whenReady().then(async () => {
  console.log('Starting Vortex Studio...')
  await startBackend()
  await startFrontend()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill()
  if (frontendProcess) frontendProcess.kill()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (backendProcess) backendProcess.kill()
  if (frontendProcess) frontendProcess.kill()
})
