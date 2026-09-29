const PREFIX = 'apihub.v1'

function fullKey(key: string): string {
  return `${PREFIX}:${key}`
}

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(fullKey(key))
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

let saveTimer: number | undefined

// Usage entries are appended frequently; batch writes instead of one per event.
export function save(key: string, value: unknown, debounceMs = 0): void {
  const write = () => localStorage.setItem(fullKey(key), JSON.stringify(value))
  if (debounceMs <= 0) {
    write()
    return
  }
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(write, debounceMs)
}
