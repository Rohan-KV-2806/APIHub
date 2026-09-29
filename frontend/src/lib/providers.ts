import type { ModelInfo, ProviderType, Service } from './types'

export interface ProviderPreset {
  type: ProviderType
  name: string
  baseUrl: string
  proxyBase: string
  docsUrl: string
  keyHint: string
}

export const PROVIDER_PRESETS: Record<ProviderType, ProviderPreset> = {
  groq: {
    type: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    proxyBase: '/proxy/groq',
    docsUrl: 'https://console.groq.com/keys',
    keyHint: 'gsk_...',
  },
  deepseek: {
    type: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    proxyBase: '/proxy/deepseek',
    docsUrl: 'https://platform.deepseek.com/api_keys',
    keyHint: 'sk-...',
  },
}

export const PROVIDER_TYPES: ProviderType[] = ['groq', 'deepseek']

function authHeaders(service: Pick<Service, 'apiKey'>): HeadersInit {
  return {
    Authorization: `Bearer ${service.apiKey}`,
    'Content-Type': 'application/json',
  }
}

// Try the configured endpoint directly first. If the browser blocks the call
// (provider does not allow CORS), fall back to the dev-server proxy for the
// known provider types. CORS failures reject before the request is sent, so
// a request is never executed twice.
export async function providerFetch(
  service: Pick<Service, 'type' | 'baseUrl' | 'apiKey'>,
  path: string,
  init: RequestInit = {},
  timeoutMs = 20000,
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const run = (base: string) =>
    fetch(`${base.replace(/\/$/, '')}${path}`, {
      ...init,
      headers: { ...authHeaders(service), ...(init.headers ?? {}) },
      signal: init.signal ?? controller.signal,
    })
  try {
    try {
      return await run(service.baseUrl)
    } catch (err) {
      if (init.signal?.aborted) throw err
      const preset = PROVIDER_PRESETS[service.type]
      if (!preset) throw err
      return await run(preset.proxyBase)
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchProviderModels(
  service: Pick<Service, 'type' | 'baseUrl' | 'apiKey'>,
): Promise<ModelInfo[]> {
  const res = await providerFetch(service, '/models')
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const body = (await res.json()) as { error?: { message?: string } }
      if (body?.error?.message) detail = body.error.message
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail)
  }
  const body = (await res.json()) as { data?: ModelInfo[] }
  return (body.data ?? []).slice().sort((a, b) => a.id.localeCompare(b.id))
}

export function findModelOwner(
  services: Service[],
  modelId: string,
): { service: Service; model: ModelInfo } | null {
  const [providerSlug, ...rest] = modelId.split('/')
  const bare = rest.length > 0 ? rest.join('/') : modelId

  for (const service of services) {
    if (
      providerSlug === service.type &&
      service.models.some((m) => m.id === modelId || m.id === bare)
    ) {
      const model = service.models.find((m) => m.id === modelId || m.id === bare)
      if (model) return { service, model }
    }
  }
  for (const service of services) {
    const model = service.models.find((m) => m.id === modelId)
    if (model) return { service, model }
  }
  return null
}
