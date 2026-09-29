import {
  useCallback,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import { load, save } from '../lib/storage'
import { fetchProviderModels } from '../lib/providers'
import type { ProviderType, Service, UnifiedKey, UsageEntry } from '../lib/types'
import { StoreContext, generateUnifiedKey, uid } from './store'

export function AppProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<Service[]>(() => load('services', []))
  const [keys, setKeys] = useState<UnifiedKey[]>(() => load('keys', []))
  const [usage, setUsage] = useState<UsageEntry[]>(() => load('usage', []))

  useEffect(() => save('services', services), [services])
  useEffect(() => save('keys', keys), [keys])
  // Debounced: usage grows one entry per request and doesn't need instant writes.
  useEffect(() => save('usage', usage, 800), [usage])

  const patchService = useCallback((id: string, patch: Partial<Service>) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }, [])

  const syncModels = useCallback(
    async (serviceId: string) => {
      const service = services.find((s) => s.id === serviceId)
      if (!service) throw new Error('Service not found')
      try {
        const models = await fetchProviderModels(service)
        patchService(serviceId, {
          models,
          modelsSyncedAt: Date.now(),
          status: 'connected',
          statusMessage: null,
        })
        return models
      } catch (err) {
        patchService(serviceId, {
          status: 'error',
          statusMessage: err instanceof Error ? err.message : 'Connection failed',
        })
        throw err
      }
    },
    [services, patchService],
  )

  const value = useMemo(
    () => ({
      services,
      keys,
      usage,
      addService: async (input: {
        name: string
        type: ProviderType
        baseUrl: string
        apiKey: string
      }) => {
        const service: Service = {
          id: uid(),
          name: input.name,
          type: input.type,
          baseUrl: input.baseUrl,
          apiKey: input.apiKey,
          createdAt: Date.now(),
          models: [],
          modelsSyncedAt: null,
          status: 'untested',
          statusMessage: null,
        }
        setServices((prev) => [...prev, service])
        return service
      },
      updateService: (id: string, patch: Partial<Omit<Service, 'id' | 'createdAt'>>) =>
        patchService(id, patch),
      deleteService: (id: string) => {
        setServices((prev) => prev.filter((s) => s.id !== id))
      },
      syncModels,
      createKey: (input: {
        name: string
        monthlyTokens: number | null
        monthlyRequests: number | null
      }) => {
        const key: UnifiedKey = {
          id: uid(),
          name: input.name,
          key: generateUnifiedKey(),
          limits: { monthlyTokens: input.monthlyTokens, monthlyRequests: input.monthlyRequests },
          createdAt: Date.now(),
          lastUsedAt: null,
        }
        setKeys((prev) => [...prev, key])
        return key
      },
      deleteKey: (id: string) => {
        setKeys((prev) => prev.filter((k) => k.id !== id))
      },
      renameKey: (id: string, name: string) => {
        setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, name } : k)))
      },
      recordUsage: (entry: Omit<UsageEntry, 'id' | 'ts'> & { ts?: number }) => {
        const full: UsageEntry = { id: uid(), ts: entry.ts ?? Date.now(), ...entry }
        setUsage((prev) => [...prev, full])
        if (full.keyId) {
          setKeys((prev) =>
            prev.map((k) => (k.id === full.keyId ? { ...k, lastUsedAt: full.ts } : k)),
          )
        }
      },
    }),
    [services, keys, usage, syncModels, patchService],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
