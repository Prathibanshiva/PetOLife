import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { getPet } from '../api/pets'
import {
  createRecord,
  deleteRecord,
  getRecords,
  updateRecord,
} from '../api/records'

import RecordCard from '../components/RecordCard'
import RecordForm from '../components/RecordForm'
import RecordTypePicker from '../components/RecordTypePicker'

function Avatar({ pet }) {
  return pet.photo_url ? (
    <img
      className="detail-avatar"
      src={pet.photo_url}
      alt={pet.name}
    />
  ) : (
    <div className="detail-avatar detail-avatar-fallback">
      {pet.name.slice(0, 1).toUpperCase()}
    </div>
  )
}

export default function PetDetail() {
  const { petId } = useParams()

  const [pet, setPet] = useState(null)
  const [records, setRecords] = useState([])
  const [status, setStatus] = useState('loading')

  const [mode, setMode] = useState('detail')
  const [type, setType] = useState(null)
  const [editingRecord, setEditingRecord] = useState(null)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setStatus('loading')
    setError('')

    try {
      const [nextPet, nextRecords] = await Promise.all([
        getPet(petId),
        getRecords(petId),
      ])

      setPet(nextPet)
      setRecords(nextRecords)
      setStatus('ready')
    } catch (loadError) {
      setStatus(
        loadError.message === 'Pet not found.'
          ? 'notfound'
          : 'error'
      )
      setError(loadError.message)
    }
  }, [petId])

  useEffect(() => {
    load()
  }, [load])

  async function saveRecord(payload) {
    setError('')
    setMessage('')

    if (editingRecord) {
      await updateRecord(
        petId,
        editingRecord.id,
        payload
      )

      setMessage('Health record updated.')
    } else {
      await createRecord(petId, payload)

      setMessage('Health record added.')
    }

    setEditingRecord(null)
    setType(null)
    setMode('detail')

    await load()
  }

  function handleEdit(record) {
    setMessage('')
    setError('')
    setEditingRecord(record)
    setType(record.record_type)
    setMode('form')
  }

  async function handleDelete(record) {
    setMessage('')
    setError('')

    try {
      await deleteRecord(petId, record.id)

      setRecords((currentRecords) =>
        currentRecords.filter(
          (currentRecord) =>
            currentRecord.id !== record.id
        )
      )

      setMessage('Health record deleted.')
    } catch (deleteError) {
      setError(
        deleteError.message ||
          'Could not delete this health record.'
      )
    }
  }

  function openAddRecord() {
    setMessage('')
    setError('')
    setEditingRecord(null)
    setType(null)
    setMode('picker')
  }

  function cancelRecordForm() {
    setEditingRecord(null)
    setType(null)
    setMode('picker')
  }

  function cancelPicker() {
    setEditingRecord(null)
    setType(null)
    setMode('detail')
  }

  if (status === 'loading') {
    return (
      <main className="page-shell">
        <section className="status-card">
          <span className="loading-dot" />
          <p>Loading pet profile...</p>
        </section>
      </main>
    )
  }

  if (status === 'notfound') {
    return (
      <main className="page-shell">
        <section className="empty-state">
          <h1>Pet not found</h1>
          <p>This pet may no longer be available.</p>

          <Link
            className="button button-primary"
            to="/pets"
          >
            Back to My Pets
          </Link>
        </section>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main className="page-shell">
        <section
          className="status-card status-error"
          role="alert"
        >
          <h1>We could not load this pet</h1>
          <p>
            {error ||
              'Please try again from My Pets.'}
          </p>

          <Link
            className="button button-secondary"
            to="/pets"
          >
            Back to My Pets
          </Link>
        </section>
      </main>
    )
  }

  if (mode === 'picker') {
    return (
      <main className="page-shell">
        <RecordTypePicker
          onCancel={cancelPicker}
          onChoose={(nextType) => {
            setType(nextType)
            setMode('form')
          }}
        />
      </main>
    )
  }

  if (mode === 'form') {
    return (
      <main className="page-shell">
        <RecordForm
          type={type}
          record={editingRecord}
          onCancel={cancelRecordForm}
          onSave={saveRecord}
        />
      </main>
    )
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <Link
          className="back-link"
          to="/pets"
        >
          <span aria-hidden="true">←</span>
          <span>Back to pets</span>
        </Link>

        <div className="brand-lockup">
          <span className="brand-mark">P</span>
          <span>PawTrail</span>
        </div>
      </header>

      <section className="profile-hero">
        <Avatar pet={pet} />

        <div>
          <h1>{pet.name}</h1>

          <p>
            {[pet.species, pet.breed]
              .filter(Boolean)
              .join(' · ')}
          </p>

          {pet.date_of_birth && (
            <p className="dob">
              Born {pet.date_of_birth}
            </p>
          )}
        </div>
      </section>

      <button
        className="button button-primary record-action"
        type="button"
        onClick={openAddRecord}
      >
        + Add Record
      </button>

      {message && (
        <p
          className="success-message"
          role="status"
        >
          {message}
        </p>
      )}

      {error && (
        <p
          className="api-error"
          role="alert"
        >
          {error}
        </p>
      )}

      <section className="records-heading">
        <div>
          <p className="eyebrow">HEALTH STORY</p>
          <h2>Health Records</h2>
        </div>
      </section>

      {records.length ? (
        <div className="record-list">
          {records.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <section className="empty-state records-empty">
          <h2>No health records yet</h2>

          <p>
            Add a vet visit, vaccination, weight,
            medication, or note to start their
            health story.
          </p>

          <button
            className="button button-primary"
            type="button"
            onClick={openAddRecord}
          >
            + Add Record
          </button>
        </section>
      )}
    </main>
  )
}