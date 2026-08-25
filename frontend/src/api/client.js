/**
 * Centralized API client with JWT auth header injection.
 * All API calls go through here.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

export function getToken() {
  return localStorage.getItem('pawtrail_token')
}

export function getUser() {
  const raw = localStorage.getItem('pawtrail_user')
  try {
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setAuth(token, user) {
  localStorage.setItem('pawtrail_token', token)
  localStorage.setItem('pawtrail_user', JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem('pawtrail_token')
  localStorage.removeItem('pawtrail_user')
}

export async function request(path, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const err = new Error(body?.detail || 'Something went wrong. Please try again.')
    err.status = response.status
    throw err
  }

  return response.json()
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const requestOtp = (phone) =>
  request('/auth/request-otp', { method: 'POST', body: JSON.stringify({ phone }) })

export const verifyOtp = (phone, code) =>
  request('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, code }) })

// ── Pets ──────────────────────────────────────────────────────────────────────

export const getPets = () => request('/pets')
export const getPet = (petId) => request(`/pets/${petId}`)
export const createPet = (pet) => request('/pets', { method: 'POST', body: JSON.stringify(pet) })
export const deletePet = (petId) => request(`/pets/${petId}`, { method: 'DELETE' })

// ── Records ───────────────────────────────────────────────────────────────────

export const getRecords = (petId, type) =>
  request(`/pets/${petId}/records${type ? `?type=${type}` : ''}`)

export const createRecord = (petId, record) =>
  request(`/pets/${petId}/records`, { method: 'POST', body: JSON.stringify(record) })

export const updateRecord = (petId, recordId, record) =>
  request(`/pets/${petId}/records/${recordId}`, { method: 'PUT', body: JSON.stringify(record) })

export const deleteRecord = (petId, recordId) =>
  request(`/pets/${petId}/records/${recordId}`, { method: 'DELETE' })

// ── Signals ───────────────────────────────────────────────────────────────────

export const getSignals = (petId) => request(`/pets/${petId}/signals`)
export const refreshSignals = (petId) =>
  request(`/pets/${petId}/signals/refresh`, { method: 'POST' })

// ── Owners ────────────────────────────────────────────────────────────────────

export const searchOwner = (phone) =>
  request(`/owners/search?phone=${encodeURIComponent(phone)}`)

export const createOwner = (owner) =>
  request('/owners', { method: 'POST', body: JSON.stringify(owner) })

export const addPetToOwner = (ownerId, pet) =>
  request(`/owners/${ownerId}/pets`, { method: 'POST', body: JSON.stringify(pet) })

// ── Doctors ───────────────────────────────────────────────────────────────────

export const getDoctors = () => request('/doctors')
export const createDoctor = (doctor) =>
  request('/doctors', { method: 'POST', body: JSON.stringify(doctor) })
export const deleteDoctor = (doctorId) =>
  request(`/doctors/${doctorId}`, { method: 'DELETE' })

// ── Visits ────────────────────────────────────────────────────────────────────

export const createVisit = (visit) =>
  request('/visits', { method: 'POST', body: JSON.stringify(visit) })

export const getVisits = () => request('/visits')

export const getVisit = (visitId) => request(`/visits/${visitId}`)

export const completeVisit = (visitId) =>
  request(`/visits/${visitId}/complete`, { method: 'PATCH' })
