import { useState } from 'react'
import { Eye, EyeOff, Info, KeyRound, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../store/store'
import { formatCompact, formatNumber, timeAgo } from '../lib/usage'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { CopyButton } from '../components/CopyButton'
import { EmptyState } from '../components/EmptyState'
import { PlaygroundPicker } from '../components/PlaygroundPicker'
import { useToast } from '../components/ToastContext'

function CreateKeyDialog({ onClose }: { onClose: () => void }) {
  const { createKey } = useStore()
  const toast = useToast()
  const [name, setName] = useState('')
  const [tokenLimit, setTokenLimit] = useState('')
  const [requestLimit, setRequestLimit] = useState('')
  const [created, setCreated] = useState<string | null>(null)

  const submit = async () => {
    if (name.trim() === '') return
    const key = await createKey({
      name: name.trim(),
      monthlyTokens: tokenLimit.trim() === '' ? null : Number(tokenLimit),
      monthlyRequests: requestLimit.trim() === '' ? null : Number(requestLimit),
    })
    setCreated(key.key)
    toast('success', `Key "${name.trim()}" created`)
  }

  if (created) {
    return (
      <Modal
        title="Unified key created"
        description="Copy it now — this is your master key for all providers."
        onClose={onClose}
        footer={
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="code-block">
            <span className="code-lang">key</span>
            <CopyButton value={created} className="icon-btn" />
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', paddingRight: 40 }}>
              {created}
            </pre>
          </div>
          <p className="field-hint">
            Use it in the Playground to call any model from your connected services. When the
            SocksAPI backend ships, this same key works with any OpenAI-compatible client.
          </p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      title="Create a unified key"
      description="One key that routes to every model across your services."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={name.trim() === ''}>
            <Plus size={14} /> Create key
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="field">
          <label className="field-label" htmlFor="key-name">
            Key name
          </label>
          <input
            id="key-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Laptop, Continue, Side projects"
            autoFocus
          />
          <span className="field-hint">Label it so you know where it's used.</span>
        </div>
        <div className="form-row">
          <div className="field">
            <label className="field-label" htmlFor="key-tok">
              Monthly token limit
            </label>
            <input
              id="key-tok"
              className="input"
              type="number"
              min={0}
              value={tokenLimit}
              onChange={(e) => setTokenLimit(e.target.value)}
              placeholder="Unlimited"
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="key-req">
              Monthly request limit
            </label>
            <input
              id="key-req"
              className="input"
              type="number"
              min={0}
              value={requestLimit}
              onChange={(e) => setRequestLimit(e.target.value)}
              placeholder="Unlimited"
            />
          </div>
        </div>
        <p className="field-hint">
          Limits are optional — leave blank for unlimited. When a limit is hit, requests with that
          key are blocked until next month.
        </p>
      </div>
    </Modal>
  )
}

export function UnifiedApi() {
  const { services, keys, deleteKey } = useStore()
  const toast = useToast()
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Unified API</h1>
          <p className="page-desc">
            One API surface for every model you have access to — create a key, pick any model, and
            go.
          </p>
        </div>
        <div className="page-actions">
          <PlaygroundPicker services={services} style={{ width: 300 }} />
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            <Plus size={15} /> Create key
          </button>
        </div>
      </div>

      <div className="info-banner">
        <Info size={16} />
        <div>
          <strong>How it works:</strong> a unified key routes requests to the right provider
          automatically — address a model as <span className="mono">provider/model-id</span> and
          SocksAPI picks the service that serves it. Every request is tracked on your dashboard and
          counts against the key's limits. Use the same key from any OpenAI-compatible client at{' '}
          <span className="mono">/v1</span>.
        </div>
      </div>

      <div className="section">
        <div className="section-title">
          <KeyRound size={15} /> Your keys <span className="count-chip">{keys.length}</span>
        </div>
        {keys.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={KeyRound}
              title="No unified keys yet"
              description="Create your first key to start using models across all connected services from a single credential."
              action={
                <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
                  <Plus size={15} /> Create key
                </button>
              }
            />
          </div>
        ) : (
          <div className="stack-sm" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {keys.map((k) => {
              const used = k.monthUsage
              const tokPct =
                k.limits.monthlyTokens && k.limits.monthlyTokens > 0
                  ? Math.min(100, (used.totalTokens / k.limits.monthlyTokens) * 100)
                  : null
              const reqPct =
                k.limits.monthlyRequests && k.limits.monthlyRequests > 0
                  ? Math.min(100, (used.requests / k.limits.monthlyRequests) * 100)
                  : null
              const isRevealed = revealed.has(k.id)
              return (
                <div className="key-row" key={k.id}>
                  <div className="key-visual">
                    <KeyRound size={16} />
                  </div>
                  <div className="grow">
                    <div className="row" style={{ gap: 10 }}>
                      <span style={{ fontWeight: 650 }}>{k.name}</span>
                      <span className="chip chip-muted">created {timeAgo(k.createdAt)}</span>
                      <span className="chip chip-muted">last used {timeAgo(k.lastUsedAt)}</span>
                    </div>
                    <div className="row" style={{ gap: 8, marginTop: 6 }}>
                      <code className="key-value">
                        {isRevealed ? k.key : `${k.key.slice(0, 7)}${'•'.repeat(18)}${k.key.slice(-4)}`}
                      </code>
                      <button
                        type="button"
                        className="icon-btn"
                        style={{ width: 26, height: 26 }}
                        onClick={() =>
                          setRevealed((prev) => {
                            const next = new Set(prev)
                            if (next.has(k.id)) next.delete(k.id)
                            else next.add(k.id)
                            return next
                          })
                        }
                        aria-label={isRevealed ? 'Hide key' : 'Reveal key'}
                      >
                        {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <CopyButton value={k.key} />
                    </div>
                    <div className="row" style={{ gap: 14, marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                        This month: {formatNumber(used.requests)} requests ·{' '}
                        {formatCompact(used.totalTokens)} tokens
                      </span>
                      {tokPct !== null && (
                        <span
                          style={{
                            width: 120,
                            display: 'inline-flex',
                            flexDirection: 'column',
                            gap: 4,
                          }}
                        >
                          <span style={{ fontSize: 11 }}>
                            {formatCompact(used.totalTokens)} /{' '}
                            {formatCompact(k.limits.monthlyTokens!)} tok
                          </span>
                          <span className="limit-bar" style={{ marginTop: 0 }}>
                            <span
                              className={`limit-bar-fill${tokPct >= 100 ? ' over' : ''}`}
                              style={{ width: `${tokPct}%` }}
                            />
                          </span>
                        </span>
                      )}
                      {reqPct !== null && (
                        <span
                          style={{
                            width: 120,
                            display: 'inline-flex',
                            flexDirection: 'column',
                            gap: 4,
                          }}
                        >
                          <span style={{ fontSize: 11 }}>
                            {used.requests} / {formatNumber(k.limits.monthlyRequests!)} req
                          </span>
                          <span className="limit-bar" style={{ marginTop: 0 }}>
                            <span
                              className={`limit-bar-fill${reqPct >= 100 ? ' over' : ''}`}
                              style={{ width: `${reqPct}%` }}
                            />
                          </span>
                        </span>
                      )}
                      {tokPct === null && reqPct === null && (
                        <span className="chip chip-accent">Unlimited</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="icon-btn danger"
                    onClick={() => setDeleting(k.id)}
                    aria-label={`Delete key ${k.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {creating && <CreateKeyDialog onClose={() => setCreating(false)} />}
      {deleting && (
        <ConfirmDialog
          title="Delete this key?"
          description="Requests made with this key will stop being attributed to it. The key cannot be recovered."
          onConfirm={() => {
            void deleteKey(deleting)
            setDeleting(null)
            toast('success', 'Key deleted')
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
