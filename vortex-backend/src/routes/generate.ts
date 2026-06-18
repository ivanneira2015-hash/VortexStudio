import { Router, Request, Response } from 'express'
import { AppStack, AppTarget, GeneratedApp, GeneratedScreen } from '../types.js'
import { generate } from '../ai/router.js'
import { getSystemPrompt, getScreenEditPrompt, getScreenCodePrompt, buildScreenCodeUserPrompt } from '../ai/prompts.js'
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
      maxTokens: 10000,
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

    // ── Post-procesamiento: regenerar pantallas incompletas ────────
    const incompleteScreens = appData.screens.filter(s => !s.code || s.code.length < 200)
    if (incompleteScreens.length > 0) {
      send({ type: 'status', message: `Completando código faltante (${incompleteScreens.length} pantalla${incompleteScreens.length > 1 ? 's' : ''})...` })

      const appInfo = {
        app_name: appData.app_name,
        description: appData.description,
        screens: appData.screens.map(s => ({ name: s.name, route: s.route })),
      }

      for (const screen of incompleteScreens) {
        try {
          const screenResult = await generate({
            systemPrompt: getScreenCodePrompt(stack as AppStack),
            userPrompt: buildScreenCodeUserPrompt(
              { name: screen.name, description: screen.description, code: screen.code ?? '' },
              appInfo,
              stack as AppStack,
            ),
            jsonMode: true,
            maxTokens: 6000,
            byokGroq,
            byokAnthropic,
            byokOpenai,
          })
          const screenData = JSON.parse(screenResult.content) as { code?: string }
          if (screenData.code && screenData.code.length > 200) {
            screen.code = screenData.code
          }
        } catch {
          // Pantalla no regenerable — dejamos el código parcial
        }
      }
    }
    // ─────────────────────────────────────────────────────────────

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

// ── POST /api/generate/image — wireframe/screenshot → app ───────
router.post('/image', async (req: Request, res: Response) => {
  const {
    imageBase64,
    imageType = 'image/jpeg',
    stack = 'flutter' as AppStack,
    target = 'mobile' as AppTarget,
    byokAnthropic,
  } = req.body

  if (!imageBase64?.trim()) { res.status(400).json({ error: 'imageBase64 requerido' }); return }

  const anthropicKey = byokAnthropic || process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    res.status(400).json({ error: 'La generación desde imagen requiere ANTHROPIC_API_KEY' })
    return
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`)
  const heartbeat = setInterval(() => send({ type: 'heartbeat' }), 3000)

  try {
    send({ type: 'status', message: 'Analizando wireframe...' })

    const systemPrompt = `Analizá este wireframe o captura de pantalla de una app y generá código ${
      stack === 'flutter' ? 'Flutter' : stack === 'kotlin' ? 'Jetpack Compose' : 'React Native'
    } que replique la UI que ves. ${getSystemPrompt(stack as AppStack, target as AppTarget)}`

    const stackLabel = stack === 'flutter' ? 'Flutter' : stack === 'kotlin' ? 'Jetpack Compose' : 'React Native'
    send({ type: 'status', message: `Generando app ${stackLabel} desde imagen...` })

    const mediaType = imageType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

    const res2 = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: `Analizá esta imagen y generá el JSON completo de la app con todas las pantallas que puedas inferir. Devolvé ÚNICAMENTE JSON válido con la estructura GeneratedApp.`,
              },
            ],
          },
        ],
      }),
    })

    clearInterval(heartbeat)

    if (!res2.ok) {
      const errBody = await res2.text()
      throw new Error(`Anthropic error ${res2.status}: ${errBody}`)
    }

    send({ type: 'status', message: 'Procesando resultado...' })

    const data = await res2.json() as { content: Array<{ text: string }> }
    const raw = data.content[0].text

    let appData: GeneratedApp
    try {
      appData = JSON.parse(raw) as GeneratedApp
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('La IA no devolvió JSON válido desde la imagen. Intentá de nuevo.')
      appData = JSON.parse(match[0]) as GeneratedApp
    }

    if (!appData.screens?.length) {
      throw new Error('La IA no generó ninguna pantalla desde la imagen. Intentá con una imagen más clara.')
    }

    send({
      type: 'done',
      generation: { id: null, app: appData, provider: 'anthropic', model: 'claude-sonnet-4-6' },
    })
    res.end()
  } catch (err: unknown) {
    clearInterval(heartbeat)
    const message = err instanceof Error ? err.message : 'Error desconocido al procesar imagen'
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
      ${sql.json(app as unknown as Parameters<typeof sql.json>[0])},
      ${sql.json(app.screens.map(s => s.preview) as unknown as Parameters<typeof sql.json>[0])},
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

Generá una app COMPLETA y PROFESIONAL con 3-4 pantallas (MÁXIMO 4). El código debe ser funcional, navegación real entre pantallas, datos de ejemplo realistas y específicos al dominio, sin placeholders ni console.log como handlers.`
}

export default router
