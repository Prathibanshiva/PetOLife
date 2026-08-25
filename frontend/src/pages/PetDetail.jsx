import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'

import { getPet } from '../api/client.js'
import { getRecords, createRecord, deleteRecord, updateRecord } from '../api/client.js'

import RecordForm from '../components/RecordForm.jsx'
import RecordTypePicker from '../components/RecordTypePicker.jsx'
import Timeline from '../components/Timeline.jsx'
import HealthSignals from '../components/HealthSignals.jsx'
import PetSummaryCard from '../components/PetSummaryCard.jsx'
import { useAuth } from '../context/AuthContext.jsx'

function calcAge(dob) {
  if (!dob) return null
  const d = new Date(`${dob}T00:00:00`)
  const now = new Date()
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
  if (months < 0) return null
  if (months < 24) return `${months} months`
  return `${Math.floor(months / 12)} years`
}

function Avatar({ pet }) {
  return pet.photo_url ? (
    <img className="detail-avatar" src={pet.photo_url} alt={pet.name} />
  ) : (
    <div className="detail-avatar detail-avatar-fallback">
      {pet.name.slice(0, 1).toUpperCase()}
    </div>
  )
}

export default function PetDetail() {
  const { petId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const role = user?.role || 'owner'

  const [pet, setPet] = useState(null)
  const [records, setRecords] = useState([])
  const [status, setStatus] = useState('loading')
  const [mode, setMode] = useState('detail')
  const [type, setType] = useState(null)
  const [editingRecord, setEditingRecord] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [highlightedIds, setHighlightedIds] = useState([])

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
      setStatus(loadError.message === 'Pet not found.' ? 'notfound' : 'error')
      setError(loadError.message)
    }
  }, [petId])

  useEffect(() => { load() }, [load])

  async function saveRecord(payload) {
    setError('')
    setMessage('')
    if (editingRecord) {
      await updateRecord(petId, editingRecord.id, payload)
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

  async function handleDelete(record) {
    setMessage('')
    setError('')
    try {
      await deleteRecord(petId, record.id)
      setRecords(curr => curr.filter(r => r.id !== record.id))
      setMessage('Health record deleted.')
    } catch (err) {
      setError(err.message || 'Could not delete this health record.')
    }
  }

  // Back link target based on role
  function getBackLink() {
    if (role === 'receptionist') return '/front-desk'
    if (role === 'doctor') return '/doctor'
    return '/pets'
  }

  if (status === 'loading') {
    return (
      <main className="page-shell">
        <section className="status-card">
          <span className="loading-dot" />
          <p>Loading pet profile…</p>
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
          <Link className="button button-primary" to={getBackLink()}>Go back</Link>
        </section>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main className="page-shell">
        <section className="status-card status-error" role="alert">
          <h1>Could not load this pet</h1>
          <p>{error || 'Please try again.'}</p>
          <Link className="button button-secondary" to={getBackLink()}>Go back</Link>
        </section>
      </main>
    )
  }

  if (mode === 'picker') {
    return (
      <main className="page-shell">
        <RecordTypePicker
          onCancel={() => { setEditingRecord(null); setType(null); setMode('detail') }}
          onChoose={(nextType) => { setType(nextType); setMode('form') }}
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
          onCancel={() => { setEditingRecord(null); setType(null); setMode('picker') }}
          onSave={saveRecord}
        />
      </main>
    )
  }

  // Owner is read-only; doctor/receptionist can write
  const canWrite = role === 'doctor' || role === 'receptionist'
  const lastRecord = records.find(r => r.record_date)
  const age = calcAge(pet.date_of_birth)

  return (
    <main className="page-shell">
      <header className="page-header">
        <Link className="back-link" to={getBackLink()}>
          <span aria-hidden="true">←</span>
          <span>Back</span>
        </Link>
        <div className="brand-lockup">
          <span className="brand-mark">P</span>
          <span>PawTrail</span>
        </div>
      </header>

      {/* Pet profile hero */}
      <section className="profile-hero">
        <Avatar pet={pet} />
        <div>
          <h1>{pet.name}</h1>
          <p>{[pet.species, pet.breed].filter(Boolean).join(' · ')}</p>
          {age && <p className="dob">{age} old</p>}
          {pet.date_of_birth && <p className="dob">Born {pet.date_of_birth}</p>}
        </div>
      </section>

      {/* Write controls — only for doctor/receptionist */}
      {canWrite && (
        <button
          className="button button-primary record-action"
          type="button"
          onClick={() => {
            setMessage('')
            setError('')
            setEditingRecord(null)
            setType(null)
            setMode('picker')
          }}
        >
          + Add Record
        </button>
      )}

      {message && <p className="success-message" role="status">{message}</p>}
      {error && <p className="api-error" role="alert">{error}</p>}

      {/* AI Health Signals — shown to all roles */}
      <HealthSignals
        petId={petId}
        onHighlightRecords={setHighlightedIds}
      />

      {/* Shared Timeline */}
      <Timeline
        records={records}
        highlightedIds={highlightedIds}
        onEdit={canWrite ? (record) => {
          setMessage('')
          setError('')
          setEditingRecord(record)
          setType(record.record_type)
          setMode('form')
        } : null}
        onDelete={canWrite ? handleDelete : null}
      />
    </main>
  )
}