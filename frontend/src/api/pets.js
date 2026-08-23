const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

export async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail || 'Something went wrong. Please try again.')
  }
  return response.json()
}
export const getPets = () => request('/pets')
export const getPet = (petId) => request(`/pets/${petId}`)
export const createPet = (pet) => request('/pets', { method: 'POST', body: JSON.stringify(pet) })

export async function deletePet(petId) {
  const response = await fetch(`${API_BASE_URL}/pets/${petId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete pet');
  }

  return response.json();
}