import { providerFetch } from './providers'
import type { ChatMessage } from './types'

export interface ChatUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface StreamCallbacks {
  onDelta: (content: string) => void
  onReasoning?: (text: string) => void
}

export interface ChatResult {
  content: string
  reasoning: string
  usage: ChatUsage
  latencyMs: number
  status: number
}

interface ChatCompletionChunk {
  choices?: Array<{
    delta?: { content?: string | null; reasoning_content?: string | null }
    message?: { content?: string | null }
  }>
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
}

function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.max(1, Math.ceil(text.length / 4))
}

export async function streamChatCompletion(opts: {
  service: Parameters<typeof providerFetch>[0]
  model: string
  messages: ChatMessage[]
  temperature?: number
  callbacks: StreamCallbacks
}): Promise<ChatResult> {
  const started = performance.now()
  const res = await providerFetch(
    opts.service,
    '/chat/completions',
    {
      method: 'POST',
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: opts.temperature ?? 0.7,
        stream: true,
        stream_options: { include_usage: true },
      }),
    },
    300000,
  )

  if (!res.ok || !res.body) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const body = (await res.json()) as { error?: { message?: string } }
      if (body?.error?.message) detail = body.error.message
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''
  let reasoning = ''
  let usage: ChatUsage | null = null

  const handleEvent = (payload: string) => {
    if (payload === '[DONE]') return
    let chunk: ChatCompletionChunk
    try {
      chunk = JSON.parse(payload) as ChatCompletionChunk
    } catch {
      return
    }
    if (chunk.usage) {
      usage = {
        promptTokens: chunk.usage.prompt_tokens ?? 0,
        completionTokens: chunk.usage.completion_tokens ?? 0,
        totalTokens: chunk.usage.total_tokens ?? 0,
      }
    }
    const delta = chunk.choices?.[0]?.delta
    if (delta?.reasoning_content) {
      reasoning += delta.reasoning_content
      opts.callbacks.onReasoning?.(delta.reasoning_content)
    }
    if (delta?.content) {
      content += delta.content
      opts.callbacks.onDelta(delta.content)
    }
  }

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let newlineIndex: number
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIndex).replace(/\r$/, '')
      buffer = buffer.slice(newlineIndex + 1)
      if (line.startsWith('data:')) handleEvent(line.slice(5).trim())
    }
  }

  const finalUsage: ChatUsage =
    usage ?? {
      promptTokens: estimateTokens(opts.messages.map((m) => m.content).join('\n')),
      completionTokens: estimateTokens(content),
      totalTokens: 0,
    }
  if (!usage) finalUsage.totalTokens = finalUsage.promptTokens + finalUsage.completionTokens

  return {
    content,
    reasoning,
    usage: finalUsage,
    latencyMs: Math.round(performance.now() - started),
    status: res.status,
  }
}
