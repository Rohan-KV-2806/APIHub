// Mock OpenAI-compatible provider for local development and testing APIHub
// without real API keys. Serves GET /models and POST /chat/completions
// (streaming + non-streaming) with permissive CORS.
//
//   node scripts/mock-provider.mjs        # listens on http://localhost:4111
//
// Then add a service in APIHub with endpoint http://localhost:4111 and any
// API key value.
import http from 'node:http'
import { randomUUID } from 'node:crypto'

const PORT = process.env.PORT ? Number(process.env.PORT) : 4111

const MODELS = [
  { id: 'mock-llama-8b', object: 'model', created: 0, owned_by: 'MockLabs', context_window: 131072 },
  { id: 'mock-llama-70b', object: 'model', created: 0, owned_by: 'MockLabs', context_window: 131072 },
  { id: 'mock-reasoner', object: 'model', created: 0, owned_by: 'MockLabs', context_window: 65536 },
]

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'GET' && req.url?.endsWith('/models')) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ object: 'list', data: MODELS }))
    return
  }

  if (req.method === 'POST' && req.url?.endsWith('/chat/completions')) {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      let payload = {}
      try {
        payload = JSON.parse(body || '{}')
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: { message: 'Invalid JSON body' } }))
        return
      }

      if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: { message: 'Missing API key (mock provider)' } }))
        return
      }

      const lastUser = [...(payload.messages ?? [])].reverse().find((m) => m.role === 'user')
      const prompt = lastUser?.content ?? 'Hello'
      const reply = `You said: "${prompt}". This is a mock reply streamed from the APIHub mock provider.`
      const promptTokens = Math.max(1, Math.ceil(String(prompt).length / 4))
      const completionTokens = Math.max(1, Math.ceil(reply.length / 4))

      if (payload.stream) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        })
        const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`)
        send({ id: randomUUID(), object: 'chat.completion.chunk', choices: [{ index: 0, delta: { role: 'assistant' } }] })
        if (String(payload.model).includes('reasoner')) {
          send({ choices: [{ index: 0, delta: { reasoning_content: 'Thinking briefly about the reply... ' } }] })
        }
        for (const word of reply.split(' ')) {
          send({ choices: [{ index: 0, delta: { content: `${word} ` } }] })
          // Small delay so streaming is observable.
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 30)
        }
        send({
          choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
          usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens },
        })
        res.write('data: [DONE]\n\n')
        res.end()
        return
      }

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          id: randomUUID(),
          object: 'chat.completion',
          choices: [{ index: 0, message: { role: 'assistant', content: reply }, finish_reason: 'stop' }],
          usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens },
        }),
      )
    })
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: { message: `No route: ${req.method} ${req.url}` } }))
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Mock provider listening on http://localhost:${PORT}`)
})
