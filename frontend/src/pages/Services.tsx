import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plug,
  Plus,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useStore } from '../store/store'
import { PROVIDER_PRESETS, PROVIDER_TYPES } from '../lib/providers'
import type { ProviderType, Service } from '../lib/types'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { CopyButton } from '../components/CopyButton'
import { EmptyState } from '../components/EmptyState'
import { useToast } from '../components/ToastContext'
import { timeAgo } from '../lib/usage'

type TestState =
  | { phase: 'idle' }
  | { phase: 'testing' }
  | { phase: 'ok'; count: number; sample: string[] }
  | { phase: 'error'; message: string }

interface ServiceDialogProps {
  service: Service | null
  onClose: () => void
}

function ServiceDialog({ service, onClose }: ServiceDialogProps) {
  const { addService, updateService, validateProvider } = useStore()
  const toast = useToast()
  const [type, setType] = useState<ProviderType>(service?.type ?? 'groq')
  const [name, setName] = useState(service?.name ?? PROVIDER_PRESETS[service?.type ?? 'groq'].name)
  const [baseUrl, setBaseUrl] = useState(
    service?.baseUrl ?? PROVIDER_PRESETS[service?.type ?? 'groq'].baseUrl,
  )
  const [apiKey, setApiKey] = useState(service?.apiKey ?? '')
  const [showKey, setShowKey] = useState(false)
  const [test, setTest] = useState<TestState>(
    service?.status === 'connected'
      ? { phase: 'ok', count: service.models.length, sample: [] }
      : { phase: 'idle' },
  )
  const [saving, setSaving] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const preset = PROVIDER_PRESETS[type]
  const effectiveName = name.trim() || preset.name

  const pickType = (t: ProviderType) => {
    setType(t)
    if (!service) {
      setBaseUrl(PROVIDER_PRESETS[t].baseUrl)
      setName(PROVIDER_PRESETS[t].name)
    }
  }

  const fieldsReady = baseUrl.trim() !== '' && apiKey.trim() !== ''
  const effectiveTest: TestState = fieldsReady ? test : { phase: 'idle' }

  // Load models automatically as soon as an endpoint + key are available.
  useEffect(() => {
    if (!fieldsReady) return
    const timer = window.setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current?.abort()
      abortRef.current = controller
      setTest({ phase: 'testing' })
      try {
        const models = await validateProvider({
          type,
          baseUrl: baseUrl.trim(),
          apiKey: apiKey.trim(),
        })
        if (controller.signal.aborted) return
        setTest({
          phase: 'ok',
          count: models.length,
          sample: models.slice(0, 4).map((m) => m.id),
        })
      } catch (err) {
        if (controller.signal.aborted) return
        setTest({ phase: 'error', message: err instanceof Error ? err.message : 'Connection failed' })
      }
    }, 700)
    return () => window.clearTimeout(timer)
  }, [type, fieldsReady, baseUrl, apiKey, validateProvider])

  useEffect(() => () => abortRef.current?.abort(), [])

  const canSave = fieldsReady && effectiveTest.phase !== 'testing'

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      if (service) {
        await updateService(service.id, {
          name: effectiveName,
          type,
          baseUrl: baseUrl.trim(),
          apiKey: apiKey.trim(),
        })
        toast('success', `"${effectiveName}" updated`)
      } else {
        await addService({
          name: effectiveName,
          type,
          baseUrl: baseUrl.trim(),
          apiKey: apiKey.trim(),
        })
        toast('success', `"${effectiveName}" added`)
      }
      onClose()
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={service ? 'Edit service' : 'Add a service'}
      description="Connect an AI provider. Models are fetched automatically once the endpoint and API key are in place."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={!canSave || saving}>
            {saving && <Loader2 size={14} className="spin" />}
            {service ? 'Save changes' : 'Add service'}
          </button>
        </>
      }
    >
      <div className="stack-sm" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="field">
          <span className="field-label">Provider</span>
          <div className="row" style={{ gap: 10 }}>
            {PROVIDER_TYPES.map((t) => {
              const p = PROVIDER_PRESETS[t]
              const active = type === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => pickType(t)}
                  className="card card-hover"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    borderColor: active ? 'var(--accent-border)' : undefined,
                    background: active ? 'var(--accent-soft)' : undefined,
                  }}
                >
                  <span className={`provider-tile small ${t}`}>{p.name[0]}</span>
                  <span style={{ fontWeight: 600, fontSize: 13.5 }}>{p.name}</span>
                </button>
              )
            })}
            <div
              className="card"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                opacity: 0.5,
              }}
            >
              <span className="provider-tile small custom">?</span>
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>Custom — soon</span>
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label className="field-label" htmlFor="svc-name">
              Display name
            </label>
            <input
              id="svc-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={preset.name}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="svc-key">
              API key
            </label>
            <div className="input-wrap">
              <input
                id="svc-key"
                className="input mono"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={preset.keyHint}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="svc-url">
            Endpoint
          </label>
          <input
            id="svc-url"
            className="input mono"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={preset.baseUrl}
            spellCheck={false}
          />
          <span className="field-hint">
            Get a key at{' '}
            <a href={preset.docsUrl} target="_blank" rel="noreferrer">
              {preset.docsUrl.replace('https://', '')}
            </a>
          </span>
        </div>

        <div style={{ minHeight: 24 }}>
          {effectiveTest.phase === 'testing' && (
            <span className="row" style={{ color: 'var(--text-2)', fontSize: 13, gap: 8 }}>
              <Loader2 size={14} className="spin" /> Fetching available models…
            </span>
          )}
          {effectiveTest.phase === 'ok' && (
            <span className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <span className="chip chip-success">
                <CheckCircle2 size={12} /> Connected · {effectiveTest.count} models
              </span>
              {effectiveTest.sample.slice(0, 3).map((m) => (
                <span key={m} className="chip chip-muted mono" style={{ fontSize: 10.5 }}>
                  {m}
                </span>
              ))}
            </span>
          )}
          {effectiveTest.phase === 'error' && (
            <span className="field-error row" style={{ gap: 6 }}>
              <XCircle size={13} style={{ flexShrink: 0 }} /> {effectiveTest.message}
            </span>
          )}
          {effectiveTest.phase === 'idle' && (
            <span className="field-hint">Enter an API key to validate the endpoint and list models.</span>
          )}
        </div>
      </div>
    </Modal>
  )
}

function ServiceCard({ service, onEdit, onDelete }: {
  service: Service
  onEdit: () => void
  onDelete: () => void
}) {
  const { syncServiceModels } = useStore()
  const toast = useToast()
  const [showKey, setShowKey] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const masked = service.apiKey.length > 8
    ? `${service.apiKey.slice(0, 5)}${'•'.repeat(12)}${service.apiKey.slice(-4)}`
    : '••••••••'

  const resync = async () => {
    setSyncing(true)
    try {
      const models = await syncServiceModels(service.id)
      toast('success', `Synced ${models.length} models from ${service.name}`)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const statusChip =
    service.status === 'connected' ? (
      <span className="chip chip-success">
        <span className="chip-dot" /> Connected
      </span>
    ) : service.status === 'error' ? (
      <span className="chip chip-danger" title={service.statusMessage ?? undefined}>
        <span className="chip-dot" /> Error
      </span>
    ) : (
      <span className="chip chip-muted">
        <span className="chip-dot" /> Not tested
      </span>
    )

  return (
    <div className="card card-hover" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="row-between">
        <div className="row" style={{ gap: 12 }}>
          <span className={`provider-tile ${service.type}`}>{PROVIDER_PRESETS[service.type].name[0]}</span>
          <div>
            <div className="card-title">{service.name}</div>
            <div className="card-sub mono truncate" style={{ maxWidth: 260 }}>
              {service.baseUrl}
            </div>
          </div>
        </div>
        {statusChip}
      </div>

      <div className="row-between">
        <div className="row" style={{ gap: 8 }}>
          <span className="key-value">{showKey ? service.apiKey : masked}</span>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setShowKey((v) => !v)}
            aria-label={showKey ? 'Hide key' : 'Show key'}
          >
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <CopyButton value={service.apiKey} />
        </div>
        <span className="text-3" style={{ fontSize: 12 }}>
          {service.models.length > 0
            ? `${service.models.length} models · synced ${timeAgo(service.modelsSyncedAt)}`
            : 'No models yet'}
        </span>
      </div>

      {service.models.length > 0 && (
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {service.models.slice(0, 5).map((m) => (
            <span key={m.id} className="chip chip-muted mono" style={{ fontSize: 10.5 }}>
              {m.id}
            </span>
          ))}
          {service.models.length > 5 && (
            <span className="chip chip-accent" style={{ fontSize: 10.5 }}>
              +{service.models.length - 5} more
            </span>
          )}
        </div>
      )}

      <div className="row" style={{ gap: 6, marginTop: 'auto' }}>
        <button type="button" className="btn btn-sm" onClick={resync} disabled={syncing}>
          {syncing ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />}
          Sync models
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={onEdit}>
          <Pencil size={13} /> Edit
        </button>
        <button type="button" className="icon-btn danger" onClick={onDelete} aria-label="Delete service">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

export function Services() {
  const { services, deleteService, syncServiceModels } = useStore()
  const [dialogFor, setDialogFor] = useState<'add' | Service | null>(null)
  const [deleting, setDeleting] = useState<Service | null>(null)

  // Keep model catalogs fresh (stale after 10 minutes) without spamming.
  useEffect(() => {
    const stale = services.filter(
      (s) => s.apiKey && (!s.modelsSyncedAt || Date.now() - s.modelsSyncedAt > 10 * 60 * 1000),
    )
    stale.forEach((s) => {
      syncServiceModels(s.id).catch(() => undefined)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const grid = useMemo(
    () =>
      services.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 14 }}>
          {services.map((s) => (
            <ServiceCard
              key={s.id}
              service={s}
              onEdit={() => setDialogFor(s)}
              onDelete={() => setDeleting(s)}
            />
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={Plug}
            title="No services connected"
            description="Add your first AI provider — APIHub currently supports Groq and DeepSeek. Once connected, its models become available across the dashboard and unified API."
            action={
              <button type="button" className="btn btn-primary" onClick={() => setDialogFor('add')}>
                <Plus size={15} /> Add service
              </button>
            }
          />
        </div>
      ),
    [services],
  )

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Services</h1>
          <p className="page-desc">
            Your connected AI providers. Keys are stored encrypted on the backend and used to route
            unified API traffic.
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={() => setDialogFor('add')}>
            <Plus size={15} /> Add service
          </button>
        </div>
      </div>
      {grid}

      {dialogFor && (
        <ServiceDialog service={dialogFor === 'add' ? null : dialogFor} onClose={() => setDialogFor(null)} />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete "${deleting.name}"?`}
          description="Usage history is kept, but the service and its key will be removed from APIHub."
          onConfirm={() => {
            void deleteService(deleting.id)
            setDeleting(null)
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
