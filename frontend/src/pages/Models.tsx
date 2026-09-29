import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Boxes, Layers, Loader2, RefreshCw, Search, Sparkles } from 'lucide-react'
import { useStore } from '../store/store'
import { PROVIDER_PRESETS } from '../lib/providers'
import { formatCompact } from '../lib/usage'
import { EmptyState } from '../components/EmptyState'
import { PlaygroundPicker } from '../components/PlaygroundPicker'
import { useToast } from '../components/ToastContext'
import type { ModelRef } from '../lib/types'

export function Models() {
  const { services, syncModels } = useStore()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [providerFilter, setProviderFilter] = useState('all')
  const [syncing, setSyncing] = useState(false)

  const models = useMemo<ModelRef[]>(
    () =>
      services.flatMap((s) =>
        s.models.map((m) => ({
          serviceId: s.id,
          provider: s.type,
          providerName: s.name,
          model: m,
        })),
      ),
    [services],
  )

  const filtered = useMemo(() => {
    let list = models
    if (providerFilter !== 'all') {
      list = list.filter((m) => m.serviceId === providerFilter)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (m) =>
          m.model.id.toLowerCase().includes(q) ||
          m.providerName.toLowerCase().includes(q),
      )
    }
    return list
  }, [models, search, providerFilter])

  const grouped = useMemo(() => {
    const byService = new Map<string, ModelRef[]>()
    for (const m of filtered) {
      const list = byService.get(m.providerName) ?? []
      list.push(m)
      byService.set(m.providerName, list)
    }
    return [...byService.entries()]
  }, [filtered])

  const refreshAll = async () => {
    setSyncing(true)
    const results = await Promise.allSettled(services.map((s) => syncModels(s.id)))
    const failed = results.filter((r) => r.status === 'rejected').length
    const ok = results.length - failed
    if (failed > 0) {
      toast('error', `${failed} service${failed > 1 ? 's' : ''} failed to sync`)
    } else {
      toast('success', `Synced models from ${ok} service${ok !== 1 ? 's' : ''}`)
    }
    setSyncing(false)
  }

  const clearFilters = () => {
    setSearch('')
    setProviderFilter('all')
  }

  const hasFilters = search.trim() !== '' || providerFilter !== 'all'

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Models</h1>
          <p className="page-desc">
            Every model across your connected services — search, filter, and open any of them in
            the Playground.
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn"
            onClick={() => void refreshAll()}
            disabled={syncing || services.length === 0}
          >
            {syncing ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
            Refresh
          </button>
        </div>
      </div>

      <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginBottom: 22 }}>
        <div className="input-wrap grow" style={{ minWidth: 200, maxWidth: 380 }}>
          <Search
            size={14}
            style={{ position: 'absolute', left: 10, color: 'var(--text-3)', zIndex: 1 }}
          />
          <input
            className="input"
            style={{ paddingLeft: 32 }}
            placeholder="Search models…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search models"
          />
        </div>
        <select
          className="select"
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          style={{ width: 170 }}
          aria-label="Filter by provider"
        >
          <option value="all">All providers</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <PlaygroundPicker services={services} style={{ width: 290 }} />
      </div>

      {services.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Boxes}
            title="No services connected"
            description="Add a service with a valid API key and its models appear here automatically."
            action={
              <Link to="/services" className="btn btn-primary">
                Go to Services
              </Link>
            }
          />
        </div>
      ) : models.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Sparkles}
            title="No models yet"
            description="Connect a service — or sync an existing one — and its models appear here automatically."
            action={
              <button
                type="button"
                className="btn"
                onClick={() => void refreshAll()}
                disabled={syncing}
              >
                {syncing ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
                Sync now
              </button>
            }
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Layers}
            title="No models match your filters"
            description="Try a different search term or clear the provider filter."
            action={
              hasFilters ? (
                <button type="button" className="btn" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {grouped.map(([providerName, refs]) => (
            <div key={providerName}>
              <div className="row" style={{ gap: 9, marginBottom: 10 }}>
                <span
                  className={`provider-tile ${refs[0].provider}`}
                  style={{ width: 24, height: 24, borderRadius: 7, fontSize: 10 }}
                >
                  {PROVIDER_PRESETS[refs[0].provider].name[0]}
                </span>
                <span style={{ fontWeight: 650, fontSize: 13.5 }}>{providerName}</span>
                <span className="count-chip">{refs.length}</span>
              </div>
              <div className="model-grid">
                {refs.map((ref) => (
                  <div className="model-card" key={`${ref.provider}/${ref.model.id}`}>
                    <div style={{ minWidth: 0 }}>
                      <div className="model-id">{ref.model.id}</div>
                      <div className="model-meta">
                        <span className="mono">{ref.provider}/{ref.model.id}</span>
                        {ref.model.context_window ? (
                          <span>· {formatCompact(ref.model.context_window)} ctx</span>
                        ) : null}
                        {ref.model.owned_by ? <span>· {ref.model.owned_by}</span> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
