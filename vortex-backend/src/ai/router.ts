import Groq from 'groq-sdk'

interface RouterOptions {
  systemPrompt: string
  userPrompt: string
  jsonMode?: boolean
  maxTokens?: number
  onChunk?: (chunk: string) => void
  byokGroq?: string
  byokAnthropic?: string
  byokOpenai?: string
  byokOllama?: boolean
}

export interface RouterResult {
  content: string
  provider: string
  model: string
}

export async function generate(opts: RouterOptions): Promise<RouterResult> {
  const groqKey = opts.byokGroq || process.env.GROQ_API_KEY
  if (groqKey) return generateGroq(opts, groqKey)

  const anthropicKey = opts.byokAnthropic || process.env.ANTHROPIC_API_KEY
  if (anthropicKey) return generateAnthropic(opts, anthropicKey)

  const openaiKey = opts.byokOpenai || process.env.OPENAI_API_KEY
  if (openaiKey) return generateOpenAI(opts, openaiKey)

  if (opts.byokOllama) {
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
    return generateOllama(opts, ollamaBaseUrl)
  }

  throw new Error('Sin proveedor de IA configurado. Agregá GROQ_API_KEY en .env (gratis en console.groq.com)')
}

async function generateGroq(opts: RouterOptions, apiKey: string): Promise<RouterResult> {
  const groq = new Groq({ apiKey })
  const model = 'llama-3.3-70b-versatile'
  const maxTokens = opts.maxTokens ?? 12000

  let completion
  try {
    completion = await groq.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: opts.systemPrompt },
      { role: 'user', content: opts.userPrompt },
    ],
      max_tokens: maxTokens,
      temperature: 0.2,
      response_format: opts.jsonMode !== false ? { type: 'json_object' } : undefined,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    // Detectar rate limit TPM o TPD y mostrar mensaje claro
    const retryMatch = msg.match(/Please try again in (\d+m[\d.]+s|\d+[\d.]+s)/)
    const retryIn = retryMatch ? ` Intentá en ${retryMatch[1].replace('m', ' min ').replace('s', ' seg')}.` : ''
    if (msg.includes('rate_limit_exceeded') || msg.includes('429')) {
      if (msg.includes('tokens per day') || msg.includes('TPD')) {
        throw new Error(`Límite diario de tokens de Groq alcanzado.${retryIn} Podés configurar tu propia API key en Configuración.`)
      }
      throw new Error(`Demasiadas solicitudes a Groq.${retryIn} Esperá un momento e intentá de nuevo.`)
    }
    throw err
  }

  const content = completion.choices[0].message.content ?? ''

  if (opts.onChunk) {
    const chunkSize = 80
    for (let i = 0; i < content.length; i += chunkSize) {
      opts.onChunk(content.slice(i, i + chunkSize))
    }
  }

  return { content, provider: 'groq', model }
}

async function generateAnthropic(opts: RouterOptions, apiKey: string): Promise<RouterResult> {
  const model = 'claude-opus-4-8'
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 12000,
      system: opts.systemPrompt,
      messages: [{ role: 'user', content: opts.userPrompt }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic error: ${res.status}`)
  const data = await res.json() as { content: Array<{ text: string }> }
  const content = data.content[0].text
  if (opts.onChunk) opts.onChunk(content)
  return { content, provider: 'anthropic', model }
}

async function generateOpenAI(opts: RouterOptions, apiKey: string): Promise<RouterResult> {
  const model = 'gpt-4o'
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 12000,
      response_format: opts.jsonMode !== false ? { type: 'json_object' } : undefined,
      messages: [
        { role: 'system', content: opts.systemPrompt },
        { role: 'user', content: opts.userPrompt },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`)
  const data = await res.json() as { choices: Array<{ message: { content: string } }> }
  const content = data.choices[0].message.content
  if (opts.onChunk) opts.onChunk(content)
  return { content, provider: 'openai', model }
}

async function generateOllama(opts: RouterOptions, baseUrl: string): Promise<RouterResult> {
  const model = process.env.OLLAMA_MODEL ?? 'llama3.1:8b'
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: opts.systemPrompt },
        { role: 'user', content: opts.userPrompt },
      ],
      stream: false,
      format: 'json',
    }),
  })
  if (!res.ok) throw new Error(`Ollama error: ${res.status} — asegurate de tener Ollama corriendo en ${baseUrl}`)
  const data = await res.json() as { message: { content: string } }
  const content = data.message.content
  if (opts.onChunk) opts.onChunk(content)
  return { content, provider: 'ollama', model }
}
