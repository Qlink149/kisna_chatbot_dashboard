const BASE_URL = import.meta.env.VITE_API_URL
const CLIENT_ID = 'kisna'

const withClientId = (params = new URLSearchParams()) => {
  params.set('client_id', CLIENT_ID)
  return params
}

// Shared by every call below: JSON requests via `api()` and the multipart
// media upload via `apiUpload()`, both funnel their fetch Response through
// this so the 401/403 redirect and error-shape handling stay in one place.
const handleApiResponse = async (res) => {
  if (res.status === 401 || res.status === 403) {
    const err = await res.json().catch(() => null)
    const detail = err?.detail
    // detail is a plain string for most 401s (bad password, missing API
    // key); the session-auth dependency sends {message, reason} so the
    // login page can tell "signed out elsewhere" apart from "never logged in".
    const message = (typeof detail === 'string' ? detail : detail?.message) || 'Unauthorized'
    const reason = typeof detail === 'object' ? detail?.reason : null

    if (window.location.pathname !== '/login') {
      if (reason === 'session_replaced') {
        try { sessionStorage.setItem('kisna_logout_reason', reason) } catch { /* ignore */ }
      }
      window.location.href = '/login'
    }
    throw new Error(message)
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  if (res.status === 204) return null
  return res.json()
}

const api = async (url, method = 'GET', body = null) => {
  const options = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  }
  if (body) options.body = JSON.stringify(body)

  const res = await fetch(`${BASE_URL}${url}`, options)
  return handleApiResponse(res)
}

// Multipart upload -- can't go through api(): that hardcodes JSON. Omit
// Content-Type entirely so the browser sets the multipart boundary itself.
const apiUpload = async (url, formData) => {
  const res = await fetch(`${BASE_URL}${url}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })
  return handleApiResponse(res)
}

// ---------------- SYSTEM ----------------
export const login = (data) => api('/system/auth/login', 'POST', data)
export const logout = () => api('/system/auth/logout', 'POST')
export const getMe = () => api('/system/auth/me')
export const pingAPI = () => api('/system/ping')

// ---------------- DASHBOARD ----------------
export const getDashboardStats = ({ period, start_date, end_date } = {}) => {
  const q = withClientId()
  if (period && period !== 'all') q.set('period', period)
  if (start_date) q.set('start_date', start_date)
  if (end_date) q.set('end_date', end_date)
  return api(`/system/dashboard/stats?${q.toString()}`)
}

export const getDashboardRatings = () => {
  const q = withClientId()
  return api(`/system/dashboard/ratings?${q.toString()}`)
}

export const getUserGrowth = (period = 'month') => {
  const q = withClientId()
  q.set('period', period)
  return api(`/system/dashboard/users/growth?${q.toString()}`)
}

export const getStoreVisitGrowth = (period = 'month') => {
  const q = withClientId()
  q.set('period', period)
  return api(`/system/dashboard/store-visits/growth?${q.toString()}`)
}

export const getCallbackGrowth = (period = 'month') => {
  const q = withClientId()
  q.set('period', period)
  return api(`/system/dashboard/callbacks/growth?${q.toString()}`)
}

// ---------------- USERS ----------------
export const listUsers = (page = 1, limit = 20, agentRequested = false) => {
  const q = withClientId()
  q.set('page', String(page))
  q.set('limit', String(limit))
  if (agentRequested) q.set('agent_requested', 'true')
  return api(`/system/user?${q.toString()}`).then(res => ({
    users: res?.results ?? res?.users ?? [],
    total: res?.total ?? 0,
    page: res?.page,
    limit: res?.limit,
  }))
}

export const searchUsers = (query, limit = 20) => {
  const q = withClientId()
  q.set('q', query)
  q.set('limit', String(limit))
  return api(`/system/user/search?${q.toString()}`)
}

export const getUserByPhone = (phone) => {
  const q = withClientId()
  return api(`/system/user/${phone}?${q.toString()}`)
}

export const getChatHistory = (phone, { before, beforeId, limit = 50 } = {}) => {
  const q = withClientId()
  q.set('limit', String(limit))
  if (before != null) q.set('before', String(before))
  if (beforeId) q.set('before_id', beforeId)
  return api(`/system/chat-history/${phone}?${q.toString()}`)
}

export const getMessageTrace = (requestId) => {
  const q = withClientId()
  return api(`/system/message-trace/${requestId}?${q.toString()}`)
}

// ---------------- CONVERSATIONS ----------------
export const takeoverConversation = (phone, takenBy) =>
  api(`/system/conversation/${phone}/takeover`, 'POST', { taken_by: takenBy })

export const sendAgentMessage = (phone, message) =>
  api(`/system/conversation/${phone}/send`, 'POST', { message })

export const sendAgentMedia = (phone, file, caption) => {
  const q = withClientId()
  const form = new FormData()
  form.append('file', file)
  if (caption) form.append('caption', caption)
  return apiUpload(`/system/conversation/${phone}/send-media?${q.toString()}`, form)
}

export const releaseConversation = (phone) =>
  api(`/system/conversation/${phone}/release`, 'POST')

export const resolveAgentRequest = (phone) =>
  api(`/system/conversation/${phone}/resolve-agent`, 'POST')

// ---------------- DAMAGE / COMPLAINTS ----------------
export const listComplaints = (page = 1, limit = 20) => {
  const q = withClientId()
  q.set('page', String(page))
  q.set('limit', String(limit))
  return api(`/system/damage?${q.toString()}`)
}

export const getComplaintsByPhone = (phone) => {
  const q = withClientId()
  return api(`/system/damage/${phone}?${q.toString()}`)
}

// ---------------- CALLBACKS ----------------
export const listCallbacks = (page = 1, limit = 20, filters = {}) => {
  const q = withClientId()
  q.set('page', String(page))
  q.set('limit', String(limit))
  if (filters.status) q.set('status', filters.status)
  if (filters.request_type) q.set('request_type', filters.request_type)
  return api(`/system/callbacks?${q.toString()}`)
}

export const updateCallbackStatus = (requestId, status) => {
  const q = withClientId()
  return api(`/system/callbacks/${requestId}?${q.toString()}`, 'PATCH', { status })
}
