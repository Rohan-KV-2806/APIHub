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

export function dayLabel(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}
