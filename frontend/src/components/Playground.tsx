import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUp, Eraser, Loader2, Send } from 'lucide-react'
import { useStore } from '../store/store'
import { findModelOwner } from '../lib/providers'
import { streamChatCompletion } from '../lib/chat'
import { formatLatency, monthUsage } from '../lib/usage'
import { useToast } from './ToastContext'
import type { ChatMessage } from '../lib/types'

interface DisplayMessage extends ChatMessage {
  id: string
}

export function Playground({
  model,
  onModelChange,
}: {
  model: string | null
  onModelChange: (model: string) => void
}) {
  const { services, keys, usage, recordUsage } = useStore()
  const toast = useToast()

  const allModels = useMemo(
    () =>
      services.flatMap((s) =>
        s.models.map((m) => ({ value: `${s.type}/${m.id}`, label: `${s.type}/${m.id}` })),
      ),
    [services],
  )

  const selectedModel =
    model && allModels.some((m) => m.value === model) ? model : (allModels[0]?.value ?? '')

  const [localKeyId, setLocalKeyId] = useState<string>(keys[0]?.id ?? '')
  const selectedKeyId = keys.some((k) => k.id === localKeyId) ? localKeyId : (keys[0]?.id ?? '')

  const [temperature, setTemperature] = useState(0.7)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [busy, setBusy] = useState(false)
  const [lastUsage, setLastUsage] = useState<{
    promptTokens: number
    completionTokens: number
    latencyMs: number
  } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, busy])

  const sessionTokens = useMemo(
    () => messages.reduce((n, m) => n + Math.ceil((m.content?.length ?? 0) / 4), 0),
    [messages],
  )

  if (services.length === 0) {
    return (
      <div className="card">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            padding: '44px 20px',
            textAlign: 'center',
          }}
        >
          <Send size={26} style={{ color: 'var(--accent-2)', opacity: 0.7 }} />
          <div style={{ fontWeight: 650 }}>No models available</div>
          <p className="empty-desc">
            Add a service with a valid API key and its models show up here automatically.
          </p>
          <Link to="/services" className="btn btn-primary" style={{ marginTop: 8 }}>
            Go to Services
          </Link>
        </div>
      </div>
    )
  }

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    if (!selectedModel) {
      toast('error', 'Pick a model first')
      return
    }
    const key = keys.find((k) => k.id === selectedKeyId)
    if (!key) {
      toast('error', 'Create a unified key first')
      return
    }

    const limitsCheck = monthUsage(usage, key.id)
    if (key.limits.monthlyRequests !== null && limitsCheck.requests >= key.limits.monthlyRequests) {
      toast('error', `Monthly request limit reached for "${key.name}"`)
      return
    }
    if (key.limits.monthlyTokens !== null && limitsCheck.totalTokens >= key.limits.monthlyTokens) {
      toast('error', `Monthly token limit reached for "${key.name}"`)
      return
    }

    const owner = findModelOwner(services, selectedModel)
    if (!owner) {
      toast('error', `No connected service provides "${selectedModel}". Sync models on the Services page.`)
      return
    }

    const userMsg: DisplayMessage = { id: crypto.randomUUID(), role: 'user', content: text }
    const history: ChatMessage[] = [
      ...(systemPrompt.trim() ? [{ role: 'system' as const, content: systemPrompt.trim() }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: text },
    ]
    const assistantId = crypto.randomUUID()

    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: 'assistant', content: '' }])
    setInput('')
    setBusy(true)

    try {
      const result = await streamChatCompletion({
        service: owner.service,
        model: owner.model.id,
        messages: history,
        temperature,
        callbacks: {
          onDelta: (delta) =>
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + delta } : m)),
            ),
          onReasoning: (chunk) =>
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, reasoning: (m.reasoning ?? '') + chunk } : m,
              ),
            ),
        },
      })
      setLastUsage({
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        latencyMs: result.latencyMs,
      })
      recordUsage({
        keyId: key.id,
        keyName: key.name,
        serviceId: owner.service.id,
        provider: owner.service.type,
        model: `${owner.service.type}/${owner.model.id}`,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalTokens: result.usage.totalTokens,
        latencyMs: result.latencyMs,
        status: result.status,
        stream: true,
      })
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== assistantId))
      toast('error', err instanceof Error ? err.message : 'Request failed')
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="chat-window">
      <div
        className="row"
        style={{
          gap: 10,
          padding: '10px 14px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          flexWrap: 'wrap',
        }}
      >
        <select
          className="select"
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          style={{ flex: 2, minWidth: 220 }}
          aria-label="Model"
        >
          {services.map((s) => (
            <optgroup key={s.id} label={s.name}>
              {s.models.map((m) => (
                <option key={m.id} value={`${s.type}/${m.id}`}>
                  {m.id}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <select
          className="select"
          value={selectedKeyId}
          onChange={(e) => setLocalKeyId(e.target.value)}
          style={{ flex: 1, minWidth: 140 }}
          aria-label="Unified key"
        >
          {keys.length === 0 && <option value="">No key selected</option>}
          {keys.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
        <div className="row" style={{ gap: 6 }}>
          <span className="text-3" style={{ fontSize: 11.5 }}>
            Temp
          </span>
          <input
            className="input"
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            style={{ width: 62, padding: '7px 9px' }}
            aria-label="Temperature"
          />
        </div>
        <button
          type="button"
          className="icon-btn"
          title="Clear conversation"
          onClick={() => {
            setMessages([])
            setLastUsage(null)
          }}
          disabled={messages.length === 0}
        >
          <Eraser size={15} />
        </button>
      </div>

      <div className="chat-scroll" ref={scrollRef}>
        {messages.length === 0 && !systemPrompt && (
          <div
            style={{
              margin: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              color: 'var(--text-3)',
              textAlign: 'center',
              padding: '0 30px',
            }}
          >
            <div
              className="logo-mark"
              style={{ width: 46, height: 46, borderRadius: 14, marginBottom: 4 }}
            >
              <Send size={19} />
            </div>
            <div style={{ fontWeight: 650, color: 'var(--text-2)' }}>
              One key, every model
            </div>
            <p style={{ fontSize: 12.5, lineHeight: 1.6 }}>
              Chat with any model from your connected services. Requests are attributed to the
              selected unified key and tracked on the dashboard.
            </p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`chat-msg ${m.role}`}>
            <div className="chat-avatar">{m.role === 'user' ? 'You' : 'AI'}</div>
            <div style={{ minWidth: 0 }}>
              {m.reasoning && (
                <details className="chat-bubble reasoning">
                  <summary>Reasoning</summary>
                  {m.reasoning}
                </details>
              )}
              <div className="chat-bubble">
                {m.content || (busy && m.role === 'assistant' && messages[messages.length - 1]?.id === m.id ? (
                  <span className="typing-dots">
                    <span />
                    <span />
                    <span />
                  </span>
                ) : null)}
              </div>
            </div>
          </div>
        ))}
        {busy && messages[messages.length - 1]?.role === 'user' && (
          <div className="chat-msg assistant">
            <div className="chat-avatar">AI</div>
            <div className="chat-bubble">
              <span className="typing-dots">
                <span />
                <span />
                <span />
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="chat-foot">
        <div className="chat-input-row grow">
          <textarea
            ref={inputRef}
            className="textarea chat-input"
            rows={1}
            placeholder="Send a message… (Enter to send, Shift+Enter for a new line)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
            disabled={busy}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void send()}
            disabled={busy || input.trim() === ''}
            aria-label="Send message"
          >
            {busy ? <Loader2 size={15} className="spin" /> : <ArrowUp size={15} />}
          </button>
        </div>
        <div className="row" style={{ gap: 14 }}>
          {lastUsage && (
            <span className="usage-pill">
              {lastUsage.promptTokens} in / {lastUsage.completionTokens} out ·{' '}
              {formatLatency(lastUsage.latencyMs)}
            </span>
          )}
          {systemPrompt.trim() === '' ? (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setSystemPrompt('You are a helpful assistant.')}
            >
              + System prompt
            </button>
          ) : (
            <div className="row" style={{ gap: 6 }}>
              <span className="chip chip-accent">System</span>
              <button
                type="button"
                className="icon-btn"
                style={{ width: 26, height: 26 }}
                title="Remove system prompt"
                onClick={() => setSystemPrompt('')}
              >
                <Eraser size={12} />
              </button>
            </div>
          )}
          <span className="usage-pill">~{sessionTokens} tok in conversation</span>
        </div>
      </div>
    </div>
  )
}
