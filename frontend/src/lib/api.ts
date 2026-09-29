export class ApiError extends Error {
  status: number
  type?: string

  constructor(message: string, status: number, type?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.type = type
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    })
  } catch {
    throw new ApiError('Cannot reach the SocksAPI backend', 0)
  }

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`
    let type: string | undefined
    try {
      const body = await res.json()
      if (body?.error?.message) message = body.error.message
      if (body?.error?.type) type = body.error.type
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(message, res.status, type)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
