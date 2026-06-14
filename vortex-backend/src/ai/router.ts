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

  // JSON mode + no streaming = salida garantizada y válida
  const completion = await groq.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: opts.systemPrompt },
      { role: 'user', content: opts.userPrompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.2, // más determinista = código más correcto
    response_format: opts.jsonMode !== false ? { type: 'json_object' } : undefined,
  })

  const content = completion.choices[0].message.content!

  // Si hay onChunk (streaming simulado), emitimos el contenido en chunks
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
