import { ApiError } from './api'
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
  }>
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
}

function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.max(1, Math.ceil(text.length / 4))
}

// Streams a chat completion through the APIHub gateway using a unified key.
export async function streamChatCompletion(opts: {
  model: string
  messages: ChatMessage[]
  temperature?: number
  key: string
  callbacks: StreamCallbacks
}): Promise<ChatResult> {
  const started = performance.now()
  let res: Response
  try {
    res = await fetch('/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${opts.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: opts.temperature ?? 0.7,
        stream: true,
      }),
    })
  } catch {
    throw new ApiError('Cannot reach the APIHub backend', 0)
  }

  if (!res.ok || !res.body) {
    let message = `${res.status} ${res.statusText}`
    let type: string | undefined
    try {
      const body = (await res.json()) as { error?: { message?: string; type?: string } }
      if (body?.error?.message) message = body.error.message
      if (body?.error?.type) type = body.error.type
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(message, res.status, type)
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
