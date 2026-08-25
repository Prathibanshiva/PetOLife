import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  searchOwner, createOwner, addPetToOwner,
  getDoctors, createVisit,
} from '../api/client.js'

const SPECIES_OPTIONS = ['Dog', 'Cat', 'Rabbit', 'Bird', 'Fish', 'Hamster', 'Guinea Pig', 'Other']

function PhoneSearch({ onFound, onNotFound }) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSearch(e) {
    e.preventDefault()
    if (!phone.trim()) return
    setError('')
    setLoading(true)
    try {
      const result = await searchOwner(phone.trim())
      onFound(result)
    } catch (err) {
      if (err.status === 404) {
        onNotFound(phone.trim())
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="fd-search-section">
      <p className="eyebrow">OWNER LOOKUP</p>
      <h2 className="fd-section-title">Find Owner by Phone</h2>
      <form onSubmit={handleSearch} className="fd-search-form" noValidate>
        <input
          type="tel"
          value={phone}
          onChange={(e) => { setPhone(e.target.value); setError('') }}
          placeholder="+91 98765 43210"
          className="fd-phone-input"
          autoComplete="tel"
        />
        <button
          className="button button-primary"
          type="submit"
          disabled={loading || !phone.trim()}
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>
      {error && <p className="api-error" role="alert">{error}</p>}
    </section>
  )
}

function RegisterOwnerForm({ prefillPhone, onOwnerCreated }) {
  const [form, setForm] = useState({
    phone: prefillPhone || '',
    name: '',
    petName: '',
    petSpecies: 'Dog',
    petBreed: '',
    petDob: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const change = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim() || !form.petName.trim()) return
    setError('')
    setLoading(true)
    try {
      const owner = await createOwner({ phone: form.phone.trim(), name: form.name.trim() })
      await addPetToOwner(owner.id, {
        name: form.petName.trim(),
        species: form.petSpecies,
        breed: form.petBreed.trim() || undefined,
        date_of_birth: form.petDob || undefined,
      })
      // Re-search to get full owner with pets
      const result = await searchOwner(form.phone.trim())
      onOwnerCreated(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="fd-register-section">
      <p className="eyebrow">NEW REGISTRATION</p>
      <h2 className="fd-section-title">Register Owner + First Pet</h2>
      <form className="pet-form" onSubmit={handleSubmit} noValidate>
        <fieldset className="fd-fieldset">
          <legend>Owner Details</legend>
          <div className="field-group">
            <label htmlFor="reg-phone">Phone number</label>
            <input id="reg-phone" name="phone" type="tel" value={form.phone} onChange={change} required />
          </div>
          <div className="field-group">
            <label htmlFor="reg-name">Full name</label>
            <input id="reg-name" name="name" type="text" value={form.name} onChange={change} required placeholder="Owner's full name" />
          </div>
        </fieldset>

        <fieldset className="fd-fieldset">
          <legend>First Pet</legend>
          <div className="field-group">
            <label htmlFor="reg-pet-name">Pet name</label>
            <input id="reg-pet-name" name="petName" type="text" value={form.petName} onChange={change} required placeholder="Pet's name" />
          </div>
          <div className="field-group">
            <label htmlFor="reg-pet-species">Species</label>
            <select id="reg-pet-species" name="petSpecies" value={form.petSpecies} onChange={change}>
              {SPECIES_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="reg-pet-breed">Breed <span className="optional">(optional)</span></label>
            <input id="reg-pet-breed" name="petBreed" type="text" value={form.petBreed} onChange={change} />
          </div>
          <div className="field-group">
            <label htmlFor="reg-pet-dob">Date of birth <span className="optional">(optional)</span></label>
            <input id="reg-pet-dob" name="petDob" type="date" value={form.petDob} onChange={change} />
          </div>
        </fieldset>

        {error && <p className="api-error" role="alert">{error}</p>}

        <button className="button button-primary submit-button" type="submit" disabled={loading}>
          {loading ? 'Registering…' : 'Register & Continue'}
        </button>
      </form>
    </section>
  )
}

function AddPetForm({ ownerId, onPetAdded, onCancel }) {
  const [form, setForm] = useState({ name: '', species: 'Dog', breed: '', dob: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const change = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setError('')
    setLoading(true)
    try {
      await addPetToOwner(ownerId, {
        name: form.name.trim(),
        species: form.species,
        breed: form.breed.trim() || undefined,
        date_of_birth: form.dob || undefined,
      })
      onPetAdded()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="pet-form fd-inline-form" onSubmit={handleSubmit} noValidate>
      <div className="field-group">
        <label htmlFor="add-pet-name">Pet name</label>
        <input id="add-pet-name" name="name" type="text" value={form.name} onChange={change} required />
      </div>
      <div className="field-group">
        <label htmlFor="add-pet-species">Species</label>
        <select id="add-pet-species" name="species" value={form.species} onChange={change}>
          {SPECIES_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="field-group">
        <label htmlFor="add-pet-breed">Breed <span className="optional">(optional)</span></label>
        <input id="add-pet-breed" name="breed" type="text" value={form.breed} onChange={change} />
      </div>
      {error && <p className="api-error" role="alert">{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="button button-primary" type="submit" disabled={loading}>
          {loading ? 'Adding…' : 'Add Pet'}
        </button>
        <button className="button button-secondary" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function OwnerCard({ ownerData, onStartVisit }) {
  const { owner, pets } = ownerData
  const [selectedPetIds, setSelectedPetIds] = useState([])
  const [showAddPet, setShowAddPet] = useState(false)
  const [localOwnerData, setLocalOwnerData] = useState(ownerData)
  const [doctors, setDoctors] = useState([])
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [step, setStep] = useState('select') // 'select' | 'assign'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const localPets = localOwnerData.pets

  useEffect(() => {
    getDoctors().then(setDoctors).catch(() => {})
  }, [])

  function togglePet(id) {
    setSelectedPetIds(ids =>
      ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]
    )
  }

  function handlePetAdded() {
    searchOwner(owner.phone).then(setLocalOwnerData).catch(() => {})
    setShowAddPet(false)
  }

  async function handleStartVisit() {
    if (!selectedDoctor) { setError('Please select a doctor.'); return }
    setError('')
    setLoading(true)
    try {
      const visit = await createVisit({
        pet_ids: selectedPetIds,
        doctor_id: parseInt(selectedDoctor),
      })
      onStartVisit(visit)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="fd-owner-card">
      <div className="fd-owner-header">
        <div>
          <p className="eyebrow">OWNER FOUND</p>
          <h3 className="fd-owner-name">{localOwnerData.owner.name}</h3>
          <p className="fd-owner-phone">{localOwnerData.owner.phone}</p>
        </div>
        <span className="fd-owner-badge">Registered</span>
      </div>

      <div className="fd-pets-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p className="fd-pets-label">Select pets for this visit:</p>
          <button
            className="button button-secondary fd-add-pet-btn"
            type="button"
            onClick={() => setShowAddPet(s => !s)}
          >
            {showAddPet ? 'Cancel' : '+ Add Pet'}
          </button>
        </div>

        {showAddPet && (
          <AddPetForm
            ownerId={localOwnerData.owner.id}
            onPetAdded={handlePetAdded}
            onCancel={() => setShowAddPet(false)}
          />
        )}

        {localPets.length === 0 ? (
          <p style={{ color: '#5C6B63', fontSize: 14 }}>No pets registered yet. Add one above.</p>
        ) : (
          <div className="fd-pet-checklist">
            {localPets.map(pet => (
              <label key={pet.id} className={`fd-pet-check ${selectedPetIds.includes(pet.id) ? 'fd-pet-check-selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={selectedPetIds.includes(pet.id)}
                  onChange={() => togglePet(pet.id)}
                />
                <span className="fd-pet-check-info">
                  <strong>{pet.name}</strong>
                  <span>{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {selectedPetIds.length > 0 && (
        <div className="fd-visit-section">
          <div className="field-group">
            <label htmlFor="doctor-select">Assign doctor</label>
            <select
              id="doctor-select"
              value={selectedDoctor}
              onChange={e => { setSelectedDoctor(e.target.value); setError('') }}
            >
              <option value="">— Select doctor —</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {error && <p className="api-error" role="alert">{error}</p>}

          <button
            className="button button-primary submit-button"
            type="button"
            onClick={handleStartVisit}
            disabled={loading || !selectedDoctor}
          >
            {loading ? 'Starting visit…' : `Start Visit (${selectedPetIds.length} pet${selectedPetIds.length > 1 ? 's' : ''})`}
          </button>
        </div>
      )}
    </section>
  )
}

export default function FrontDesk() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [view, setView] = useState('search') // 'search' | 'found' | 'register' | 'success'
  const [ownerData, setOwnerData] = useState(null)
  const [notFoundPhone, setNotFoundPhone] = useState('')
  const [successVisit, setSuccessVisit] = useState(null)

  function handleOwnerFound(data) {
    setOwnerData(data)
    setView('found')
  }

  function handleNotFound(phone) {
    setNotFoundPhone(phone)
    setView('register')
  }

  function handleOwnerRegistered(data) {
    setOwnerData(data)
    setView('found')
  }

  function handleVisitStarted(visit) {
    setSuccessVisit(visit)
    setView('success')
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span>PawTrail</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            className="button button-secondary header-action"
            type="button"
            onClick={() => navigate('/doctors')}
          >
            Manage Doctors
          </button>
          <button
            className="button button-secondary header-action"
            type="button"
            onClick={logout}
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="intro">
        <p className="eyebrow">FRONT DESK</p>
        <h1>Welcome,<br />{user?.name || 'Receptionist'}</h1>
        <p>Register owners, manage pets, and start clinic visits.</p>
      </section>

      {view === 'success' && successVisit && (
        <section className="fd-success-card">
          <div className="fd-success-icon" aria-hidden="true">✓</div>
          <h3>Visit Started</h3>
          <p>
            Visit #{successVisit.id} assigned to <strong>{successVisit.doctor_name}</strong>.
            The doctor will see this in their queue.
          </p>
          <button
            className="button button-primary"
            type="button"
            onClick={() => { setView('search'); setOwnerData(null); setSuccessVisit(null) }}
          >
            Start Another Visit
          </button>
        </section>
      )}

      {view === 'search' && (
        <PhoneSearch onFound={handleOwnerFound} onNotFound={handleNotFound} />
      )}

      {view === 'register' && (
        <>
          <div className="fd-not-found-banner">
            <p>No owner found for <strong>{notFoundPhone}</strong>. Register a new owner below.</p>
          </div>
          <RegisterOwnerForm
            prefillPhone={notFoundPhone}
            onOwnerCreated={handleOwnerRegistered}
          />
        </>
      )}

      {view === 'found' && ownerData && (
        <>
          <button
            className="back-link"
            type="button"
            onClick={() => { setView('search'); setOwnerData(null) }}
            style={{ border: 0, padding: 0, background: 'none', cursor: 'pointer', marginBottom: 20, display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            ← Search again
          </button>
          <OwnerCard ownerData={ownerData} onStartVisit={handleVisitStarted} />
        </>
      )}
    </main>
  )
}
