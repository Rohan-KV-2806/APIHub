import { useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  Coins,
  Gauge,
  KeyRound,
  Plug,
  Timer,
  Zap,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useStore } from '../store/store'
import {
  dayLabel,
  formatCompact,
  formatLatency,
  formatNumber,
  formatTime,
} from '../lib/usage'
import { PROVIDER_PRESETS } from '../lib/providers'
import { EmptyState } from '../components/EmptyState'

const PROVIDER_COLORS: Record<string, string> = { groq: '#f55036', deepseek: '#4d6bfe' }

interface TipPayloadItem {
  name?: string
  value?: number | string
  color?: string
  dataKey?: string | number
}

function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TipPayloadItem[]
  label?: string | number
}) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: '#151b2c',
        border: '1px solid #2a3450',
        borderRadius: 10,
        padding: '10px 12px',
        fontSize: 12.5,
        boxShadow: '0 12px 32px -12px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{ color: '#9aa4b8', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map((p) => (
        <div key={String(p.dataKey)} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 3,
              background: p.color,
              display: 'inline-block',
            }}
          />
          <span style={{ color: '#9aa4b8' }}>{p.name}</span>
          <span style={{ marginLeft: 'auto', color: '#e8ecf4', fontVariantNumeric: 'tabular-nums' }}>
            {typeof p.value === 'number' ? formatNumber(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function StatCard({
  icon: Icon,
  value,
  label,
  foot,
}: {
  icon: typeof Zap
  value: string
  label: string
  foot: string
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">
        <Icon size={17} />
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
      <div className="stat-foot">{foot}</div>
    </div>
  )
}

export function Dashboard() {
  const { services, keys, stats } = useStore()
  const navigate = useNavigate()

  const connectedServices = services.filter((s) => s.status === 'connected').length

  if (!stats) return null

  const totals = stats.totals
  const daily = stats.daily.map((d) => ({ ...d, label: dayLabel(d.date) }))
  const providers = stats.byProvider
  const topModels = stats.byModel
  const recent = stats.recent

  const providerTotal = providers.reduce((n, p) => n + p.requests, 0)

  if (services.length === 0 && totals.requests === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-desc">Usage across all your AI services, in one place.</p>
          </div>
        </div>
        <div className="card">
          <EmptyState
            icon={Plug}
            title="Welcome to APIHub"
            description="Connect your first AI provider to start tracking requests, tokens and latency. Groq and DeepSeek are supported today — more coming soon."
            action={
              <button type="button" className="btn btn-primary" onClick={() => navigate('/services')}>
                Add your first service <ArrowRight size={15} />
              </button>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-desc">Usage across all your AI services, in one place.</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          icon={Activity}
          value={formatNumber(totals.requests)}
          label="Total requests"
          foot={`${formatNumber(totals.errors)} failed`}
        />
        <StatCard
          icon={Coins}
          value={formatCompact(totals.totalTokens)}
          label="Tokens spent"
          foot={`${formatCompact(totals.promptTokens)} in · ${formatCompact(totals.completionTokens)} out`}
        />
        <StatCard
          icon={Timer}
          value={formatLatency(totals.avgLatencyMs)}
          label="Avg latency"
          foot="Across all requests"
        />
        <StatCard
          icon={Plug}
          value={`${connectedServices}/${services.length}`}
          label="Services connected"
          foot={`${services.reduce((n, s) => n + s.models.length, 0)} models available`}
        />
        <StatCard
          icon={KeyRound}
          value={formatNumber(keys.length)}
          label="Unified keys"
          foot={keys.length > 0 ? 'Manage on the Unified API page' : 'Create one on the Unified API page'}
        />
      </div>

      <div className="section grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))' }}>
        <div className="card">
          <div className="row-between" style={{ marginBottom: 14 }}>
            <div>
              <div className="card-title">Requests</div>
              <div className="card-sub">Daily request count · last 14 days</div>
            </div>
            <span className="chip chip-accent">
              <Zap size={11} /> {formatNumber(totals.requests)} total
            </span>
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="fillRequests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c6cff" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#7c6cff" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1c2436" strokeDasharray="3 6" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#6b7590', fontSize: 11 }}
                  axisLine={{ stroke: '#1c2436' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#6b7590', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTip />} cursor={{ stroke: '#2a3450' }} />
                <Area
                  type="monotone"
                  dataKey="requests"
                  name="Requests"
                  stroke="#7c6cff"
                  strokeWidth={2}
                  fill="url(#fillRequests)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="row-between" style={{ marginBottom: 14 }}>
            <div>
              <div className="card-title">Tokens</div>
              <div className="card-sub">Prompt vs completion tokens · last 14 days</div>
            </div>
            <div className="row" style={{ gap: 12, fontSize: 12, color: 'var(--text-2)' }}>
              <span className="row" style={{ gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 3, background: '#818cf8' }} /> Prompt
              </span>
              <span className="row" style={{ gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 3, background: '#f59e0b' }} /> Completion
              </span>
            </div>
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: -6 }}>
                <CartesianGrid stroke="#1c2436" strokeDasharray="3 6" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#6b7590', fontSize: 11 }}
                  axisLine={{ stroke: '#1c2436' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#6b7590', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => formatCompact(v)}
                />
                <Tooltip content={<ChartTip />} cursor={{ stroke: '#2a3450' }} />
                <Area
                  type="monotone"
                  dataKey="promptTokens"
                  name="Prompt"
                  stackId="tok"
                  stroke="#818cf8"
                  strokeWidth={1.8}
                  fill="#818cf8"
                  fillOpacity={0.28}
                />
                <Area
                  type="monotone"
                  dataKey="completionTokens"
                  name="Completion"
                  stackId="tok"
                  stroke="#f59e0b"
                  strokeWidth={1.8}
                  fill="#f59e0b"
                  fillOpacity={0.28}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="section grid" style={{ gridTemplateColumns: 'minmax(340px, 5fr) minmax(420px, 7fr)' }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 4 }}>
            Traffic by provider
          </div>
          <div className="card-sub" style={{ marginBottom: 18 }}>
            Share of requests per service
          </div>
          {providerTotal > 0 ? (
            <>
              <div
                style={{
                  display: 'flex',
                  height: 14,
                  borderRadius: 999,
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                }}
              >
                {providers.map((p) => (
                  <div
                    key={p.name}
                    style={{
                      width: `${(p.requests / providerTotal) * 100}%`,
                      background: PROVIDER_COLORS[p.name] ?? '#64748b',
                    }}
                  />
                ))}
              </div>
              <div className="stack-sm" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {providers.map((p) => (
                  <div key={p.name} className="row-between">
                    <span className="row" style={{ gap: 9 }}>
                      <span
                        className={`provider-tile ${p.name}`}
                        style={{ width: 22, height: 22, borderRadius: 7, fontSize: 10 }}
                      >
                        {PROVIDER_PRESETS[p.name as keyof typeof PROVIDER_PRESETS]?.name[0] ?? '?'}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 13.5 }}>{PROVIDER_PRESETS[p.name as keyof typeof PROVIDER_PRESETS]?.name ?? p.name}</span>
                    </span>
                    <span className="text-2" style={{ fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
                      {formatNumber(p.requests)} req · {formatCompact(p.totalTokens)} tok ·{' '}
                      {((p.requests / providerTotal) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-3" style={{ fontSize: 13 }}>
              No traffic recorded yet — make a request from the playground or via your unified key.
            </p>
          )}
        </div>

        <div className="card">
          <div className="row-between" style={{ marginBottom: 12 }}>
            <div>
              <div className="card-title">Top models</div>
              <div className="card-sub">Most used models by request count</div>
            </div>
          </div>
          {topModels.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Requests</th>
                    <th>Tokens</th>
                    <th>Avg latency</th>
                  </tr>
                </thead>
                <tbody>
                  {topModels.map((m) => (
                    <tr key={m.name}>
                      <td className="strong mono" style={{ fontSize: 12 }}>
                        {m.name}
                      </td>
                      <td className="num">{formatNumber(m.requests)}</td>
                      <td className="num">{formatCompact(m.totalTokens)}</td>
                      <td className="num">{formatLatency(m.avgLatencyMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-3" style={{ fontSize: 13 }}>
              No model usage yet.
            </p>
          )}
        </div>
      </div>

      <div className="section card">
        <div style={{ marginBottom: 12 }}>
          <div className="card-title">Recent requests</div>
          <div className="card-sub">Latest activity across all services</div>
        </div>
        {recent.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Model</th>
                  <th>Provider</th>
                  <th>Key</th>
                  <th>Prompt</th>
                  <th>Completion</th>
                  <th>Latency</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((e) => (
                  <tr key={e.id}>
                    <td className="text-3">{formatTime(e.ts)}</td>
                    <td className="strong mono" style={{ fontSize: 12 }}>
                      {e.model}
                    </td>
                    <td>
                      <span className={`provider-tile ${e.provider}`} style={{ width: 20, height: 20, borderRadius: 6, fontSize: 9, display: 'inline-grid' }}>
                        {PROVIDER_PRESETS[e.provider].name[0]}
                      </span>
                    </td>
                    <td className="text-3">{e.keyName ?? '—'}</td>
                    <td className="num">{formatNumber(e.promptTokens)}</td>
                    <td className="num">{formatNumber(e.completionTokens)}</td>
                    <td className="num">{formatLatency(e.latencyMs)}</td>
                    <td>
                      <span className={`chip ${e.status < 400 ? 'chip-success' : 'chip-danger'}`}>
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Gauge}
            title="No requests yet"
            description="Every request you make through the Playground is tracked here — tokens, latency and errors."
          />
        )}
      </div>
    </div>
  )
}
