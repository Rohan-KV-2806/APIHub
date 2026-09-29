import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../lib/api'
import type { ModelInfo, ProviderType, Service, Stats, UnifiedKey, UsageEntry } from '../lib/types'
import { StoreContext } from './store'
import { useToast } from '../components/ToastContext'

const LS_PREFIX = 'apihub.v1'
let migrated = false

function readLocal<T>(key: string): T {
  try {
    return JSON.parse(localStorage.getItem(`${LS_PREFIX}:${key}`) ?? '[]') as T
  } catch {
    return [] as T
  }
}

// One-time import of the old localStorage data into the backend.
async function migrateLocalStorage(): Promise<
  { services: number; keys: number; usage: number } | undefined
> {
  if (migrated) return undefined
  const services = readLocal<Service[]>('services')
  const keys = readLocal<UnifiedKey[]>('keys')
  const usage = readLocal<UsageEntry[]>('usage')
  if (services.length + keys.length + usage.length === 0) {
    migrated = true
    return undefined
  }
  const result = await api.post<{ services: number; keys: number; usage: number }>(
    '/api/migrate',
    { services, keys, usage },
  )
  for (const k of ['services', 'keys', 'usage']) localStorage.removeItem(`${LS_PREFIX}:${k}`)
  migrated = true
  return result
}

export function AppProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  const [services, setServices] = useState<Service[]>([])
  const [keys, setKeys] = useState<UnifiedKey[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const [s, k, st] = await Promise.all([
      api.get<Service[]>('/api/services'),
      api.get<UnifiedKey[]>('/api/keys'),
      api.get<Stats>('/api/stats?days=14'),
    ])
    setServices(s)
    setKeys(k)
    setStats(st)
    setConnected(true)
  }, [])

  const syncServiceModels = useCallback(async (serviceId: string) => {
    const res = await api.post<{ models: ModelInfo[] }>(`/api/services/${serviceId}/sync`)
    setServices((prev) =>
      prev.map((s) =>
        s.id === serviceId
          ? {
              ...s,
              models: res.models,
              modelsSyncedAt: Date.now(),
              status: 'connected',
              statusMessage: null,
            }
          : s,
      ),
    )
    return res.models
  }, [])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        const migration = await migrateLocalStorage()
        await refresh()
        if (migration && !cancelled) {
          toast(
            'success',
            `Migrated ${migration.services} services, ${migration.keys} keys and ${migration.usage} usage records to the backend`,
          )
        }
      } catch {
        if (!cancelled) setConnected(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [refresh, toast])

  // Retry every 5s while the backend is unreachable.
  useEffect(() => {
    if (connected !== false) return
    const timer = window.setInterval(() => {
      refresh().catch(() => undefined)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [connected, refresh])

  const value = useMemo(
    () => ({
      services,
      keys,
      stats,
      connected,
      loading,
      refresh,
      validateProvider: async (input: {
        type: ProviderType
        baseUrl: string
        apiKey: string
      }) => {
        const res = await api.post<{ ok: boolean; models: ModelInfo[] }>(
          '/api/providers/validate',
          input,
        )
        return res.models
      },
      addService: async (input: {
        name: string
        type: ProviderType
        baseUrl: string
        apiKey: string
      }) => {
        const service = await api.post<Service>('/api/services', input)
        setServices((prev) => [...prev, service])
        return service
      },
      updateService: async (
        id: string,
        patch: Partial<Omit<Service, 'id' | 'createdAt'>>,
      ) => {
        const service = await api.put<Service>(`/api/services/${id}`, patch)
        setServices((prev) => prev.map((s) => (s.id === id ? service : s)))
      },
      deleteService: async (id: string) => {
        await api.del(`/api/services/${id}`)
        setServices((prev) => prev.filter((s) => s.id !== id))
      },
      syncServiceModels,
      createKey: async (input: {
        name: string
        monthlyTokens: number | null
        monthlyRequests: number | null
      }) => {
        const key = await api.post<UnifiedKey>('/api/keys', input)
        setKeys((prev) => [...prev, key])
        return key
      },
      deleteKey: async (id: string) => {
        await api.del(`/api/keys/${id}`)
        setKeys((prev) => prev.filter((k) => k.id !== id))
      },
    }),
    [services, keys, stats, connected, loading, refresh, syncServiceModels],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
