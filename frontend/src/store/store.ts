import { createContext, useContext } from 'react'
import type { ModelInfo, ProviderType, Service, Stats, UnifiedKey } from '../lib/types'

export interface AppStore {
  services: Service[]
  keys: UnifiedKey[]
  stats: Stats | null
  connected: boolean | null // null = still checking
  loading: boolean
  refresh: () => Promise<void>
  validateProvider: (input: {
    type: ProviderType
    baseUrl: string
    apiKey: string
  }) => Promise<ModelInfo[]>
  addService: (input: {
    name: string
    type: ProviderType
    baseUrl: string
    apiKey: string
  }) => Promise<Service>
  updateService: (id: string, patch: Partial<Omit<Service, 'id' | 'createdAt'>>) => Promise<void>
  deleteService: (id: string) => Promise<void>
  syncServiceModels: (serviceId: string) => Promise<ModelInfo[]>
  createKey: (input: {
    name: string
    monthlyTokens: number | null
    monthlyRequests: number | null
  }) => Promise<UnifiedKey>
  deleteKey: (id: string) => Promise<void>
}

export const StoreContext = createContext<AppStore | null>(null)

export function useStore(): AppStore {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used within AppProvider')
  return store
}
