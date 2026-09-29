import type { DailyPoint, Totals, UnifiedKey, UsageEntry } from './types'

export function computeTotals(entries: UsageEntry[]): Totals {
  if (entries.length === 0) {
    return { requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, avgLatencyMs: 0, errors: 0 }
  }
  let promptTokens = 0
  let completionTokens = 0
  let latency = 0
  let errors = 0
  for (const e of entries) {
    promptTokens += e.promptTokens
    completionTokens += e.completionTokens
    latency += e.latencyMs
    if (e.status >= 400) errors++
  }
  return {
    requests: entries.length,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    avgLatencyMs: Math.round(latency / entries.length),
    errors,
  }
}

function localDateKey(ts: number): string {
  const d = new Date(ts)
  const month = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

export function dailySeries(entries: UsageEntry[], days: number): DailyPoint[] {
  const byDate = new Map<string, DailyPoint>()
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = localDateKey(d.getTime())
    byDate.set(key, {
      date: key,
      label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      requests: 0,
      promptTokens: 0,
      completionTokens: 0,
    })
  }
  for (const e of entries) {
    const point = byDate.get(localDateKey(e.ts))
    if (!point) continue
    point.requests++
    point.promptTokens += e.promptTokens
    point.completionTokens += e.completionTokens
  }
  return [...byDate.values()]
}

export interface GroupStat {
  name: string
  requests: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  avgLatencyMs: number
}

function groupBy(
  entries: UsageEntry[],
  keyFn: (e: UsageEntry) => string,
): Map<string, { entry: UsageEntry[]; latency: number }> {
  const groups = new Map<string, { entry: UsageEntry[]; latency: number }>()
  for (const e of entries) {
    const key = keyFn(e)
    const g = groups.get(key) ?? { entry: [], latency: 0 }
    g.entry.push(e)
    g.latency += e.latencyMs
    groups.set(key, g)
  }
  return groups
}

function toStats(
  groups: Map<string, { entry: UsageEntry[]; latency: number }>,
): GroupStat[] {
  return [...groups.entries()].map(([name, g]) => {
    const totals = computeTotals(g.entry)
    return {
      name,
      requests: totals.requests,
      promptTokens: totals.promptTokens,
      completionTokens: totals.completionTokens,
      totalTokens: totals.totalTokens,
      avgLatencyMs: Math.round(g.latency / g.entry.length),
    }
  })
}

export function byProvider(entries: UsageEntry[]): GroupStat[] {
  return toStats(groupBy(entries, (e) => e.provider)).sort((a, b) => b.totalTokens - a.totalTokens)
}

export function byModel(entries: UsageEntry[], top = 8): GroupStat[] {
  return toStats(groupBy(entries, (e) => e.model)).sort((a, b) => b.requests - a.requests).slice(0, top)
}

export function byKey(
  entries: UsageEntry[],
  keys: UnifiedKey[],
): Array<GroupStat & { lastUsedAt: number | null }> {
  const keyName = new Map(keys.map((k) => [k.id, k.name]))
  return toStats(groupBy(entries, (e) => e.keyId ?? '—'))
    .map((g) => ({
      ...g,
      name: keyName.get(g.name) ?? (g.name === '—' ? 'Unknown key' : g.name),
      lastUsedAt: null,
    }))
    .sort((a, b) => b.requests - a.requests)
}

export function recentEntries(entries: UsageEntry[], n = 12): UsageEntry[] {
  return entries.slice().sort((a, b) => b.ts - a.ts).slice(0, n)
}

export function startOfMonth(ts = Date.now()): number {
  const d = new Date(ts)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function monthUsage(entries: UsageEntry[], keyId: string): { requests: number; totalTokens: number } {
  const from = startOfMonth()
  let requests = 0
  let totalTokens = 0
  for (const e of entries) {
    if (e.ts >= from && e.keyId === keyId) {
      requests++
      totalTokens += e.totalTokens
    }
  }
  return { requests, totalTokens }
}

export function formatNumber(n: number): string {
  return n.toLocaleString()
}

export function formatCompact(n: number): string {
  return n.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 1 })
}

export function formatLatency(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function timeAgo(ts: number | null): string {
  if (!ts) return 'Never'
  const diff = Date.now() - ts
  const minute = 60_000
  if (diff < minute) return 'Just now'
  if (diff < 60 * minute) return `${Math.floor(diff / minute)}m ago`
  if (diff < 24 * 60 * minute) return `${Math.floor(diff / (60 * minute))}h ago`
  return `${Math.floor(diff / (24 * 60 * minute))}d ago`
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
