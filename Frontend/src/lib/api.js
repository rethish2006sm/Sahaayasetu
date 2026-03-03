const normalizeBackendUrl = (raw) => {
  const trimmed = String(raw || '').replace(/\/+$/, '')
  return trimmed || 'http://127.0.0.1:5000'
}

const API_BASE = normalizeBackendUrl(import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000')
const inFlightMutations = new Map()

function parseErrorDetail(detail, fallbackStatus) {
  if (!detail) return `Request failed (${fallbackStatus})`
  if (typeof detail === 'string') return detail

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          const loc = Array.isArray(item.loc) ? item.loc.join('.') : ''
          const msg = item.msg || JSON.stringify(item)
          return loc ? `${loc}: ${msg}` : msg
        }
        return String(item)
      })
      .join(' | ')
  }

  if (typeof detail === 'object') {
    return detail.message || detail.msg || JSON.stringify(detail)
  }

  return String(detail)
}

export async function apiRequest(path, { method = 'GET', token, body } = {}) {
  const normalizedMethod = String(method || 'GET').toUpperCase()
  const isMutation = normalizedMethod !== 'GET'
  const mutationKey = isMutation
    ? `${normalizedMethod}:${path}:${body ? JSON.stringify(body) : ''}`
    : null

  if (isMutation && inFlightMutations.has(mutationKey)) {
    return inFlightMutations.get(mutationKey)
  }

  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body) headers['Content-Type'] = 'application/json'

  const requestPromise = (async () => {
    let res
    try {
      res = await fetch(`${API_BASE}${path}`, {
        method: normalizedMethod,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })
    } catch (err) {
      throw new Error(
        `Cannot connect to backend at ${API_BASE}. Start backend server and try again.`,
      )
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(parseErrorDetail(err.detail, res.status))
    }

    if (res.status === 204) return null
    return res.json()
  })()

  if (!isMutation) {
    return requestPromise
  }

  inFlightMutations.set(mutationKey, requestPromise)
  try {
    return await requestPromise
  } finally {
    inFlightMutations.delete(mutationKey)
  }
}

export { API_BASE }

