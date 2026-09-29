export type ProviderType = 'groq' | 'deepseek'

export interface ModelInfo {
  id: string
  owned_by?: string
  context_window?: number
  created?: number
}

export interface Service {
  id: string
  name: string
  type: ProviderType
  baseUrl: string
  apiKey: string
  createdAt: number
  models: ModelInfo[]
  modelsSyncedAt: number | null
  status: 'untested' | 'connected' | 'error'
  statusMessage: string | null
}

export interface KeyLimits {
  monthlyTokens: number | null
  monthlyRequests: number | null
}

export interface UnifiedKey {
  id: string
  name: string
  key: string
  limits: KeyLimits
  createdAt: number
  lastUsedAt: number | null
}

export interface UsageEntry {
  id: string
  ts: number
  keyId: string | null
  keyName: string | null
  serviceId: string
  provider: ProviderType
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  latencyMs: number
  status: number
  stream: boolean
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  reasoning?: string
}

export interface DailyPoint {
  date: string
  label: string
  requests: number
  promptTokens: number
  completionTokens: number
}

export interface ModelRef {
  serviceId: string
  provider: ProviderType
  providerName: string
  model: ModelInfo
}

export interface Totals {
  requests: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  avgLatencyMs: number
  errors: number
}
