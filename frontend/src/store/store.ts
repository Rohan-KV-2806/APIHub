import { createContext, useContext } from 'react'
import type { ModelInfo, ProviderType, Service, UnifiedKey, UsageEntry } from '../lib/types'

export function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function generateUnifiedKey(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return `ah-${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}`
}

export interface AppStore {
  services: Service[]
  keys: UnifiedKey[]
  usage: UsageEntry[]
  addService: (input: {
    name: string
    type: ProviderType
    baseUrl: string
    apiKey: string
  }) => Promise<Service>
  updateService: (id: string, patch: Partial<Omit<Service, 'id' | 'createdAt'>>) => void
  deleteService: (id: string) => void
  syncModels: (serviceId: string) => Promise<ModelInfo[]>
  createKey: (input: {
    name: string
    monthlyTokens: number | null
    monthlyRequests: number | null
  }) => UnifiedKey
  deleteKey: (id: string) => void
  renameKey: (id: string, name: string) => void
  recordUsage: (entry: Omit<UsageEntry, 'id' | 'ts'> & { ts?: number }) => void
}

export const StoreContext = createContext<AppStore | null>(null)

export function useStore(): AppStore {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used within AppProvider')
  return store
}
