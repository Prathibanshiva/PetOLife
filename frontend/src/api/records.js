import { request } from './pets'

export const getRecords = (petId) =>
  request(`/pets/${petId}/records`)

export const createRecord = (petId, record) =>
  request(`/pets/${petId}/records`, {
    method: 'POST',
    body: JSON.stringify(record),
  })

export const updateRecord = (petId, recordId, record) =>
  request(`/pets/${petId}/records/${recordId}`, {
    method: 'PUT',
    body: JSON.stringify(record),
  })

export const deleteRecord = (petId, recordId) =>
  request(`/pets/${petId}/records/${recordId}`, {
    method: 'DELETE',
  })