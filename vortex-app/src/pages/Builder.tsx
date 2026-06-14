import { useState, useRef, useEffect } from 'react'
import { GeneratedApp, AppStack, AppTarget } from '../types'
import { streamGenerate, streamEditScreen, streamBuildApk, StreamEvent } from '../api/client'
import { PhoneFrame } from '../components/PhoneFrame'
import { CodePanel } from '../components/CodePanel'
import { PromptBar } from '../components/PromptBar'
import { TemplatesGrid, Template } from '../components/Templates'

interface Message {
  role: 'user' | 'assistant' | 'status'
  content: string
}

type RightPanel = 'preview' | 'code'

const STACK_LABELS: Record<AppStack, string> = {
  flutter: 'Flutter',
  kotlin: 'Compose',
  react_native: 'React Native',
}

const TARGET_LABELS: Record<AppTarget, string> = {
  mobile: 'Celular',
  tv: 'Android TV',
  both: 'Celular + TV',
}

export function Builder() {
  const [app, setApp] = useState<GeneratedApp | null>(null)
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [stack, setStack] = useState<AppStack>('flutter')
  const [target, setTarget] = useState<AppTarget>('mobile')
  const [rightPanel, setRightPanel] = useState<RightPanel>('preview')

  // APK build state
  const [buildOpen, setBuildOpen] = useState(false)
  const [building, setBuilding] = useState(false)
  const [buildLogs, setBuildLogs] = useState<string[]>([])
  const [buildStatus, setBuildStatus] = useState('')
  const [buildResult, setBuildResult] = useState<{ buildId: string; fileName: string; size: number; apkPath?: string } | null>(null)
  const abortBuildRef = useRef<(() => void) | null>(null)

  // Screen editor state
  const [activeScreenIdx, setActiveScreenIdx] = useState(0)
  const [editPrompt, setEditPrompt] = useState('')
  const [editingScreen, setEditingScreen] = useState(false)
  const [showEditBar, setShowEditBar] = useState(false)

  const abortRef = useRef<(() => void) | null>(null)
  const abortEditRef = useRef<(() => void) | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (app) setActiveScreenIdx(0)
  }, [app])

  function handleBuildApk() {
    if (!app) return
    setBuildOpen(true)
    setBuildLogs([])
    setBuildStatus('')
    setBuildResult(null)
    setBuilding(true)

    if (abortBuildRef.current) abortBuildRef.current()

    abortBuildRef.current = streamBuildApk(
      { app },
      (event: StreamEvent) => {
        if (event.type === 'heartbeat') return
        if (event.type === 'status') {
          setBuildStatus(event.message ?? '')
        } else if (event.type === 'log') {
          setBuildLogs(prev => [...prev.slice(-200), event.message ?? ''])
        } else if (event.type === 'done') {
          setBuilding(false)
          setBuildStatus('APK listo')
          setBuildResult({
            buildId: event.buildId!,
            fileName: event.fileName!,
            size: event.size!,
            apkPath: event.apkPath,
          })
        } else if (event.type === 'error') {
          setBuilding(false)
          setBuildStatus(`Error: ${event.message}`)
        }
      },
    )
  }

  function handleDownloadApk() {
    if (!buildResult) return
    if (window.electron && buildResult.apkPath) {
      const dir = buildResult.apkPath.split(/[\\/]/).slice(0, -1).join('\\')
      window.electron.openFolder(dir)
    } else {
      const a = document.createElement('a')
      a.href = `/api/build/download/${buildResult.buildId}`
      a.download = buildResult.fileName
      a.click()
    }
  }

  async function handleExportZip() {
    if (!app) return
    const res = await fetch('/api/export/zip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app }),
    })
    if (!res.ok) return

    if (window.electron) {
      const projectsDir = await window.electron.getProjectsDir()
      const slug = app.app_name.toLowerCase().replace(/\s+/g, '_')
      const outPath = `${projectsDir}\\${slug}`
      await window.electron.saveFile(`${outPath}\\pubspec.yaml`, app.pubspec_yaml)
      await window.electron.saveFile(`${outPath}\\lib\\main.dart`, app.main_dart)
      for (const screen of app.screens) {
        const fileName = screen.name.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '') + '.dart'
        await window.electron.saveFile(`${outPath}\\lib\\screens\\${fileName}`, screen.code)
      }
      await window.electron.openFolder(outPath)
      addMsg({ role: 'status', content: `Proyecto guardado en ${outPath}` })
    } else {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${app.app_name.toLowerCase().replace(/\s+/g, '_')}.zip`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  function addMsg(msg: Message) {
    setMessages(prev => [...prev, msg])
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  function handleGenerate(prompt: string, s: AppStack, t: AppTarget) {
    if (abortRef.current) abortRef.current()
    setLoading(true)
    setShowEditBar(false)
    addMsg({ role: 'user', content: prompt })

    abortRef.current = streamGenerate(
      { prompt, stack: s, target: t },
      (event: StreamEvent) => {
        if (event.type === 'heartbeat') return
        if (event.type === 'status') {
          addMsg({ role: 'status', content: event.message! })
        } else if (event.type === 'done' && event.generation) {
          const generatedApp = event.generation.app
          setApp(generatedApp)
          setLoading(false)
          setRightPanel('preview')

          const rec = generatedApp.stack_recommendation
          if (rec && !rec.is_current_stack_ideal) {
            addMsg({ role: 'assistant', content: `__rec__${JSON.stringify(rec)}` })
          }
          addMsg({
            role: 'assistant',
            content: `${generatedApp.app_name} generada — ${generatedApp.screens.length} pantallas via ${event.generation.provider}`,
          })
        } else if (event.type === 'error') {
          setLoading(false)
          addMsg({ role: 'status', content: `Error: ${event.message}` })
        }
      },
    )
  }

  function handleTemplateSelect(tpl: Template) {
    setStack(tpl.stack)
    setTarget(tpl.target)
    handleGenerate(tpl.prompt, tpl.stack, tpl.target)
  }

  function handleEditScreen() {
    if (!app || !editPrompt.trim() || editingScreen) return
    const screenName = app.screens[activeScreenIdx]?.name
    if (!screenName) return

    if (abortEditRef.current) abortEditRef.current()
    setEditingScreen(true)
    addMsg({ role: 'user', content: `Editar "${screenName}": ${editPrompt}` })

    abortEditRef.current = streamEditScreen(
      { screenName, editPrompt, appContext: app, stack },
      (event: StreamEvent) => {
        if (event.type === 'heartbeat') return
        if (event.type === 'status') {
          addMsg({ role: 'status', content: event.message! })
        } else if (event.type === 'done' && event.screen) {
          setApp(prev => {
            if (!prev) return prev
            const screens = prev.screens.map(s =>
              s.name === event.screenName ? event.screen! : s
            )
            return { ...prev, screens }
          })
          setEditingScreen(false)
          setEditPrompt('')
          addMsg({ role: 'assistant', content: `Pantalla "${event.screenName}" actualizada` })
        } else if (event.type === 'error') {
          setEditingScreen(false)
          addMsg({ role: 'status', content: `Error al editar: ${event.message}` })
        }
      },
    )
  }

  function applyRecommendedStack(recStack: AppStack, recTarget: AppTarget) {
    setStack(recStack)
    setTarget(recTarget)
    addMsg({ role: 'status', content: `Stack cambiado a ${STACK_LABELS[recStack]} · ${TARGET_LABELS[recTarget]}` })
  }

  function toggleEditBar() {
    setShowEditBar(prev => {
      if (!prev) setTimeout(() => editInputRef.current?.focus(), 50)
      return !prev
    })
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">

      {/* ── TopNav ── */}
      <header className="h-16 flex-shrink-0 bg-surface border-b border-outline-variant flex items-center px-lg gap-md shadow-sm">
        <div className="flex items-center gap-sm">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-on-primary" style={{ fontSize: 18 }}>auto_awesome</span>
          </div>
          <span className="text-[15px] font-bold text-on-surface tracking-tight">Vortex Studio</span>
        </div>

        <div className="h-5 w-px bg-outline-variant mx-sm" />

        {app && (
          <div className="flex gap-xs bg-surface-container rounded-lg p-xs">
            {(['preview', 'code'] as RightPanel[]).map(panel => (
              <button
                key={panel}
                onClick={() => setRightPanel(panel)}
                className={`flex items-center gap-xs px-sm py-xs rounded-md text-[13px] font-medium transition-all duration-200
                  ${rightPanel === panel
                    ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                  }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                  {panel === 'preview' ? 'smartphone' : 'code'}
                </span>
                {panel === 'preview' ? 'Vista previa' : 'Código'}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1" />

        {app && (
          <div className="flex items-center gap-sm">
            <span className="text-[12px] text-on-surface-variant px-sm py-xs bg-surface-container rounded-full border border-outline-variant">
              {app.screens.length} pantallas · {STACK_LABELS[stack]}
            </span>
            <button
              onClick={handleExportZip}
              className="flex items-center gap-xs h-9 px-md rounded-lg border border-outline-variant text-on-surface-variant text-[13px] font-semibold hover:border-primary hover:text-primary active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                {window.electron ? 'folder_open' : 'download'}
              </span>
              {window.electron ? 'Guardar' : 'ZIP'}
            </button>
            <button
              onClick={handleBuildApk}
              className="flex items-center gap-xs h-9 px-md rounded-lg bg-primary text-on-primary text-[13px] font-semibold shadow-sm hover:brightness-90 active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>android</span>
              Build APK
            </button>
          </div>
        )}
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Izquierda: Conversación ── */}
        <aside className="w-[360px] flex-shrink-0 flex flex-col bg-surface-container border-r border-outline-variant">
          <div className="flex-1 overflow-y-auto px-md py-md flex flex-col gap-sm">
            {messages.length === 0
              ? <EmptyState
                  onExample={(ex) => handleGenerate(ex, stack, target)}
                  onTemplate={handleTemplateSelect}
                  loading={loading}
                />
              : messages.map((m, i) => (
                  <MessageBubble
                    key={i}
                    msg={m}
                    onApplyStack={applyRecommendedStack}
                  />
                ))
            }
            {loading && <LoadingMessage />}
            <div ref={messagesEndRef} />
          </div>

          <PromptBar
            onGenerate={handleGenerate}
            loading={loading}
            stack={stack}
            target={target}
            onStackChange={setStack}
            onTargetChange={setTarget}
          />
        </aside>

        {/* ── Derecha: Vista previa o Código ── */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {app ? (
            <>
              <div className="flex-1 overflow-hidden">
                {rightPanel === 'preview' && (
                  <div className="h-full flex flex-col items-center justify-center bg-background gap-lg p-lg">
                    <PhoneFrame
                      app={app}
                      isTv={target === 'tv'}
                      activeIndex={activeScreenIdx}
                      onScreenChange={(i) => setActiveScreenIdx(i)}
                    />
                    <div className="flex items-center gap-sm flex-wrap justify-center">
                      {app.is_tv_compatible && (
                        <span className="px-sm py-xs rounded-full text-[11px] font-semibold bg-secondary-container/50 text-on-secondary-container border border-secondary/20">
                          Compatible con TV
                        </span>
                      )}
                      <span className="text-[12px] text-on-surface-variant text-center max-w-xs">
                        {app.description}
                      </span>
                    </div>
                  </div>
                )}
                {rightPanel === 'code' && (
                  <CodePanel app={app} />
                )}
              </div>

              {/* ── Edit Bar ── */}
              {rightPanel === 'preview' && (
                <div className="flex-shrink-0 border-t border-outline-variant bg-surface">
                  {showEditBar ? (
                    <div className="flex items-center gap-sm px-md py-sm">
                      <div className="flex items-center gap-xs px-sm py-xs bg-primary/10 rounded-lg border border-primary/20 flex-shrink-0">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: 14 }}>edit</span>
                        <span className="text-[12px] font-medium text-primary">
                          {app.screens[activeScreenIdx]?.name.replace('Screen', '') ?? ''}
                        </span>
                      </div>
                      <input
                        ref={editInputRef}
                        value={editPrompt}
                        onChange={e => setEditPrompt(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleEditScreen()}
                        placeholder="Describí los cambios que querés aplicar..."
                        disabled={editingScreen}
                        className="flex-1 text-[13px] bg-surface-container border border-outline-variant rounded-lg px-md py-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                      />
                      <button
                        onClick={handleEditScreen}
                        disabled={editingScreen || !editPrompt.trim()}
                        className="flex items-center gap-xs px-md py-xs rounded-lg bg-primary text-on-primary text-[12px] font-semibold hover:brightness-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                      >
                        {editingScreen
                          ? <span className="w-3.5 h-3.5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                          : <span className="material-symbols-outlined" style={{ fontSize: 14 }}>send</span>
                        }
                        {editingScreen ? 'Aplicando...' : 'Aplicar'}
                      </button>
                      <button
                        onClick={() => setShowEditBar(false)}
                        className="p-xs rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors flex-shrink-0"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-md py-sm">
                      <span className="text-[12px] text-on-surface-variant">
                        Pantalla activa: <span className="font-medium text-on-surface">{app.screens[activeScreenIdx]?.name.replace('Screen', '') ?? ''}</span>
                      </span>
                      <button
                        onClick={toggleEditBar}
                        className="flex items-center gap-xs px-md py-xs rounded-lg border border-outline-variant text-[12px] font-medium text-on-surface-variant hover:border-primary hover:text-primary transition-all"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
                        Editar pantalla
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-background gap-lg">
              {loading ? <LoadingState /> : <PlaceholderState />}
            </div>
          )}
        </main>
      </div>

      {/* ── Build APK Modal ── */}
      {buildOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-outline-variant rounded-2xl shadow-2xl w-[640px] max-h-[80vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center gap-sm px-lg py-md border-b border-outline-variant">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${buildResult ? 'bg-[#3fb950]/10' : buildStatus.startsWith('Error') ? 'bg-red-500/10' : 'bg-primary/10'}`}>
                <span className={`material-symbols-outlined ${buildResult ? 'text-[#3fb950]' : buildStatus.startsWith('Error') ? 'text-red-400' : 'text-primary'}`} style={{ fontSize: 18 }}>
                  {buildResult ? 'check_circle' : buildStatus.startsWith('Error') ? 'error' : 'android'}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-on-surface">Build APK</p>
                <p className="text-[12px] text-on-surface-variant">{buildStatus || 'Iniciando...'}</p>
              </div>
              {!building && (
                <button onClick={() => setBuildOpen(false)} className="p-xs rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              )}
            </div>

            {/* Contenido principal */}
            {!building && buildStatus.startsWith('Error') && buildLogs.length === 0 ? (
              /* ── Flutter no instalado ── */
              <div className="flex-1 flex flex-col gap-md p-lg">
                <div className="flex items-start gap-md p-md rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="material-symbols-outlined text-amber-400 flex-shrink-0 mt-xs" style={{ fontSize: 20 }}>warning</span>
                  <div>
                    <p className="text-[13px] font-semibold text-on-surface mb-xs">Flutter SDK no está instalado</p>
                    <p className="text-[12px] text-on-surface-variant leading-relaxed">
                      Para compilar APKs reales necesitás Flutter en tu sistema. Es gratis y tarda ~5 minutos instalarlo.
                    </p>
                  </div>
                </div>

                <p className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wide">Pasos de instalación</p>
                <div className="flex flex-col gap-sm">
                  {[
                    { n: '1', text: 'Descargá Flutter SDK desde flutter.dev/docs/get-started/install' },
                    { n: '2', text: 'Descomprimí en C:\\flutter y agregá C:\\flutter\\bin al PATH del sistema' },
                    { n: '3', text: 'Reiniciá esta aplicación' },
                    { n: '4', text: 'Hacé click en "Build APK" de nuevo — tardará 2-5 min la primera vez' },
                  ].map(step => (
                    <div key={step.n} className="flex items-start gap-sm">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-px">{step.n}</span>
                      <p className="text-[12px] text-on-surface-variant leading-relaxed">{step.text}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-md border-t border-outline-variant flex items-center justify-between">
                  <p className="text-[11px] text-on-surface-variant">Mientras tanto podés exportar el código ZIP y abrirlo en Android Studio</p>
                  <button
                    onClick={handleExportZip}
                    className="flex items-center gap-xs h-8 px-md rounded-lg border border-outline-variant text-[12px] font-medium text-on-surface-variant hover:border-primary hover:text-primary transition-all"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>download</span>
                    Exportar ZIP
                  </button>
                </div>
              </div>
            ) : (
              /* ── Logs del build ── */
              <div className="flex-1 overflow-y-auto bg-[#0d1117] font-mono text-[11px] leading-relaxed p-md min-h-[200px] max-h-[360px]">
                {buildLogs.length === 0 && building && (
                  <span className="text-[#8b949e]">Iniciando Flutter build...</span>
                )}
                {buildLogs.map((line, i) => (
                  <div key={i} className={
                    line.toLowerCase().includes('error') ? 'text-[#ff7b72]' :
                    line.toLowerCase().includes('warning') ? 'text-[#d29922]' :
                    line.startsWith('Flutter') || line.includes('✓') ? 'text-[#3fb950]' :
                    'text-[#e6edf3]'
                  }>
                    {line}
                  </div>
                ))}
                {building && <span className="inline-block w-2 h-3 bg-[#58a6ff] animate-pulse ml-px" />}
              </div>
            )}

            {/* Footer (solo cuando hay logs o está compilando o terminó) */}
            {(buildResult || (building && buildLogs.length > 0) || (!buildStatus.startsWith('Error') && !building)) && (
              <div className="flex items-center justify-between px-lg py-md border-t border-outline-variant">
                {buildResult ? (
                  <>
                    <div className="flex items-center gap-sm">
                      <span className="material-symbols-outlined text-[#3fb950]" style={{ fontSize: 20 }}>check_circle</span>
                      <div>
                        <p className="text-[13px] font-semibold text-on-surface">{buildResult.fileName}</p>
                        <p className="text-[11px] text-on-surface-variant">{(buildResult.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                    </div>
                    <button
                      onClick={handleDownloadApk}
                      className="flex items-center gap-xs h-9 px-lg rounded-lg bg-primary text-on-primary text-[13px] font-semibold hover:brightness-90 transition-all"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                        {window.electron ? 'folder_open' : 'download'}
                      </span>
                      {window.electron ? 'Abrir carpeta' : 'Descargar APK'}
                    </button>
                  </>
                ) : building ? (
                  <div className="flex items-center gap-sm text-[12px] text-on-surface-variant">
                    <span className="w-3.5 h-3.5 border-2 border-outline border-t-primary rounded-full animate-spin" />
                    Compilando... puede tardar 2-5 minutos
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Sub-components ── */

interface RecData {
  recommended_stack: AppStack
  recommended_target: AppTarget
  reasoning: string
  is_current_stack_ideal: boolean
}

function MessageBubble({
  msg,
  onApplyStack,
}: {
  msg: Message
  onApplyStack: (s: AppStack, t: AppTarget) => void
}) {
  if (msg.role === 'assistant' && msg.content.startsWith('__rec__')) {
    const rec: RecData = JSON.parse(msg.content.slice(7))
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-md flex flex-col gap-sm">
        <div className="flex items-start gap-sm">
          <span className="material-symbols-outlined text-primary flex-shrink-0" style={{ fontSize: 18 }}>lightbulb</span>
          <div>
            <p className="text-[13px] font-semibold text-on-surface mb-xs">Recomendación de stack</p>
            <p className="text-[12px] text-on-surface-variant leading-relaxed">{rec.reasoning}</p>
          </div>
        </div>
        <button
          onClick={() => onApplyStack(rec.recommended_stack, rec.recommended_target)}
          className="self-start flex items-center gap-xs px-md py-xs rounded-lg bg-primary text-on-primary text-[12px] font-semibold hover:brightness-90 transition-all active:scale-[0.98]"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>swap_horiz</span>
          Cambiar a {STACK_LABELS[rec.recommended_stack]} · {TARGET_LABELS[rec.recommended_target]}
        </button>
      </div>
    )
  }

  if (msg.role === 'status') {
    return (
      <div className="flex items-center gap-sm text-[12px] text-on-surface-variant py-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-secondary flex-shrink-0" />
        {msg.content}
      </div>
    )
  }

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] px-md py-sm bg-primary text-on-primary rounded-2xl rounded-br-sm text-[13px] leading-relaxed">
          {msg.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] px-md py-sm bg-surface-container-lowest border border-outline-variant text-on-surface rounded-2xl rounded-bl-sm text-[13px] leading-relaxed shadow-sm">
        {msg.content}
      </div>
    </div>
  )
}

function LoadingMessage() {
  return (
    <div className="flex items-center gap-sm px-md py-sm bg-surface-container-lowest border border-outline-variant rounded-2xl rounded-bl-sm w-fit">
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  )
}

const EXAMPLES = [
  'App de delivery de comida con restaurantes, menú y seguimiento del pedido',
  'Control de gastos personales con dashboard y presupuesto por categorías',
  'Rastreador de ejercicios con rutinas, temporizador y progreso semanal',
]

function EmptyState({
  onExample,
  onTemplate,
  loading,
}: {
  onExample: (ex: string) => void
  onTemplate: (tpl: Template) => void
  loading: boolean
}) {
  const [tab, setTab] = useState<'ejemplos' | 'templates'>('templates')

  return (
    <div className="flex flex-col items-center text-center gap-lg w-full px-md py-xl">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
        <span className="material-symbols-outlined text-primary" style={{ fontSize: 24 }}>auto_awesome</span>
      </div>
      <div>
        <p className="text-[15px] font-semibold text-on-surface mb-xs">Describí tu app Android</p>
        <p className="text-[12px] text-on-surface-variant leading-relaxed max-w-xs">
          Genera código Flutter, Compose o React Native completo con vista previa instantánea.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-xs bg-surface-container rounded-lg p-xs w-full">
        {(['templates', 'ejemplos'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-xs text-[12px] font-medium rounded-md transition-all ${
              tab === t
                ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t === 'templates' ? 'Plantillas' : 'Ejemplos rápidos'}
          </button>
        ))}
      </div>

      {tab === 'templates' ? (
        <div className="w-full text-left">
          <TemplatesGrid onSelect={onTemplate} loading={loading} />
        </div>
      ) : (
        <div className="flex flex-col gap-xs w-full">
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => onExample(ex)}
              disabled={loading}
              className="w-full text-left px-md py-sm bg-surface-container-lowest border border-outline-variant rounded-xl text-[12px] text-on-surface-variant hover:border-primary hover:text-on-surface transition-all duration-200 shadow-sm disabled:opacity-50"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-lg">
      <div className="w-10 h-10 border-[3px] border-surface-container-high border-t-primary rounded-full animate-spin" />
      <p className="text-[13px] text-on-surface-variant">Generando tu app...</p>
      <p className="text-[11px] text-on-surface-variant/60">Puede tardar 20-40 segundos</p>
    </div>
  )
}

function PlaceholderState() {
  return (
    <div className="flex flex-col items-center gap-lg opacity-40">
      <div className="w-56 h-[440px] rounded-[28px] border-2 border-outline-variant bg-surface-container flex flex-col items-center p-xl gap-md">
        <div className="w-16 h-2 rounded-full bg-outline-variant" />
        <div className="w-full h-10 rounded-lg bg-outline-variant/60" />
        <div className="w-4/5 h-4 rounded bg-outline-variant/40" />
        <div className="w-3/5 h-4 rounded bg-outline-variant/40" />
        <div className="w-full h-20 rounded-xl bg-outline-variant/40 mt-sm" />
        <div className="w-full h-20 rounded-xl bg-outline-variant/40" />
      </div>
      <p className="text-[12px] text-on-surface-variant">La vista previa aparecerá aquí</p>
    </div>
  )
}
