import type { ProviderType } from './types'

export interface ProviderPreset {
  type: ProviderType
  name: string
  baseUrl: string
  docsUrl: string
  keyHint: string
}

// UI-only metadata — all provider communication now happens in the backend.
export const PROVIDER_PRESETS: Record<ProviderType, ProviderPreset> = {
  groq: {
    type: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    docsUrl: 'https://console.groq.com/keys',
    keyHint: 'gsk_...',
  },
  deepseek: {
    type: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    docsUrl: 'https://platform.deepseek.com/api_keys',
    keyHint: 'sk-...',
  },
}

export const PROVIDER_TYPES: ProviderType[] = ['groq', 'deepseek']
