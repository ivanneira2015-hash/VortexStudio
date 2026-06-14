import { Router, Request, Response } from 'express'
import { AppStack, AppTarget, GeneratedApp, GeneratedScreen } from '../types.js'
import { generate } from '../ai/router.js'
import { getSystemPrompt, getScreenEditPrompt } from '../ai/prompts.js'
import { sql } from '../db.js'

const router = Router()

// ── POST /api/generate — app completa ────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const {
    prompt,
    projectId,
    stack = 'flutter' as AppStack,
    target = 'mobile' as AppTarget,
    byokGroq, byokAnthropic, byokOpenai,
  } = req.body

  if (!prompt?.trim()) { res.status(400).json({ error: 'prompt requerido' }); return }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`)

  // Heartbeat para que el cliente sepa que sigue vivo
  const heartbeat = setInterval(() => send({ type: 'heartbeat' }), 3000)

  try {
    send({ type: 'status', message: 'Analizando tu idea...' })

    const systemPrompt = getSystemPrompt(stack as AppStack, target as AppTarget)
    const userPrompt = buildUserPrompt(prompt, stack as AppStack, target as AppTarget)

    send({ type: 'status', message: `Generando app con ${stack === 'flutter' ? 'Flutter' : stack === 'kotlin' ? 'Jetpack Compose' : 'React Native'}...` })

    const result = await generate({
      systemPrompt,
      userPrompt,
      jsonMode: true,
      maxTokens: 8000,
      byokGroq,
      byokAnthropic,
      byokOpenai,
    })

    clearInterval(heartbeat)
    send({ type: 'status', message: 'Procesando resultado...' })

    let appData: GeneratedApp
    try {
      appData = JSON.parse(result.content) as GeneratedApp
    } catch {
      // Intento de extracción si hay texto extra
      const match = result.content.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('La IA no devolvió JSON válido. Intentá de nuevo.')
      appData = JSON.parse(match[0]) as GeneratedApp
    }

    if (!appData.screens?.length) {
      throw new Error('La IA no generó ninguna pantalla. Intentá con un prompt más detallado.')
    }

    const savedId = projectId
      ? await saveGeneration(projectId, prompt, appData, result.model, result.provider)
      : null

    send({
      type: 'done',
      generation: { id: savedId, app: appData, provider: result.provider, model: result.model },
    })
    res.end()
  } catch (err: unknown) {
    clearInterval(heartbeat)
    const message = err instanceof Error ? err.message : 'Error desconocido'
    send({ type: 'error', message })
    res.end()
  }
})

// ── POST /api/generate/screen — editar una pantalla individual ───
router.post('/screen', async (req: Request, res: Response) => {
  const { screenName, editPrompt, appContext, stack = 'flutter', byokGroq, byokAnthropic, byokOpenai } = req.body

  if (!screenName || !editPrompt) {
    res.status(400).json({ error: 'screenName y editPrompt requeridos' }); return
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`)
  const heartbeat = setInterval(() => send({ type: 'heartbeat' }), 3000)

  try {
    send({ type: 'status', message: `Editando pantalla "${screenName}"...` })

    const systemPrompt = getScreenEditPrompt(stack as AppStack)
    const userPrompt = `App: "${appContext?.app_name ?? 'App'}" — ${appContext?.description ?? ''}

Pantalla a editar: ${screenName}
Código actual:
${appContext?.screens?.find((s: GeneratedScreen) => s.name === screenName)?.code ?? '(no disponible)'}

Cambios solicitados: ${editPrompt}

Devolvé SOLO el JSON de esta pantalla mejorada con los cambios aplicados.`

    const result = await generate({
      systemPrompt,
      userPrompt,
      jsonMode: true,
      maxTokens: 4000,
      byokGroq,
      byokAnthropic,
      byokOpenai,
    })

    clearInterval(heartbeat)

    const screen = JSON.parse(result.content) as GeneratedScreen
    send({ type: 'done', screen, screenName })
    res.end()
  } catch (err: unknown) {
    clearInterval(heartbeat)
    send({ type: 'error', message: err instanceof Error ? err.message : 'Error al editar pantalla' })
    res.end()
  }
})

async function saveGeneration(
  projectId: string, prompt: string, app: GeneratedApp, model: string, provider: string,
): Promise<string> {
  const [row] = await sql`
    INSERT INTO generations (project_id, prompt, code, preview, model_used, provider_used)
    VALUES (
      ${projectId}, ${prompt},
      ${sql.json(app as unknown as Record<string, unknown>)},
      ${sql.json(app.screens.map(s => s.preview) as unknown as Record<string, unknown>[])},
      ${model}, ${provider}
    )
    RETURNING id
  `
  return row.id as string
}

function buildUserPrompt(prompt: string, stack: AppStack, target: AppTarget): string {
  const targetLabel = target === 'tv' ? 'Android TV' : target === 'both' ? 'celular y Android TV' : 'Android'
  const stackLabel = stack === 'flutter' ? 'Flutter' : stack === 'kotlin' ? 'Jetpack Compose' : 'React Native'
  return `Crear una app ${targetLabel} con ${stackLabel}:

${prompt}

Generá una app COMPLETA y PROFESIONAL con 4-6 pantallas. El código debe ser funcional, con datos de ejemplo realistas, estado real, y navegación completa entre todas las pantallas. No uses código genérico ni placeholders vacíos.`
}

export default router
