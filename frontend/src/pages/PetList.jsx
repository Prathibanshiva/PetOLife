import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { getPets, deletePet } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import PetCard from '../components/PetCard.jsx'

export default function PetList() {
  const { user, logout } = useAuth()
  const role = user?.role || 'owner'
  const canWrite = role === 'owner' || role === 'receptionist'

  const [pets, setPets] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const petList = await getPets()
        if (active) { setPets(petList); setStatus('ready') }
      } catch (loadError) {
        if (active) { setError(loadError.message); setStatus('error') }
      }
    }
    load()
    return () => { active = false }
  }, [])

  async function handleDeletePet(pet) {
    const confirmed = window.confirm(
      `Delete ${pet.name}? This will also remove all of ${pet.name}'s health records.`
    )
    if (!confirmed) return
    try {
      setError('')
      await deletePet(pet.id)
      setPets(curr => curr.filter(p => p.id !== pet.id))
    } catch (deleteError) {
      setError(deleteError.message || `Could not delete ${pet.name}.`)
    }
  }

  function getBackLink() {
    if (role === 'receptionist') return { to: '/front-desk', label: 'Front Desk' }
    if (role === 'doctor') return { to: '/doctor', label: 'Dashboard' }
    return null
  }

  const backLink = getBackLink()

  return (
    <main className="page-shell">
      <header className="page-header">
        <div className="brand-lockup" aria-label="PawTrail">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span>PawTrail</span>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {canWrite && (
            <Link className="button button-primary header-action" to="/pets/new">
              <span aria-hidden="true">+</span> Add Pet
            </Link>
          )}
          <button className="button button-secondary header-action" type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      {backLink && (
        <div style={{ marginTop: 12 }}>
          <Link className="back-link" to={backLink.to}>
            ← {backLink.label}
          </Link>
        </div>
      )}

      <section className="intro">
        <p className="eyebrow">
          {role === 'receptionist' ? 'RECEPTIONIST VIEW' :
           role === 'doctor' ? 'DOCTOR VIEW' : 'YOUR PETS'}
        </p>
        <h1>{role === 'owner' ? 'My Pets' : 'All Pets'}</h1>
        <p>
          {role === 'owner'
            ? "Keep their health story in one place."
            : "View pet health records and timelines."}
        </p>
      </section>

      {status === 'loading' && (
        <section className="status-card" aria-live="polite">
          <span className="loading-dot" aria-hidden="true" />
          <p>Loading pets…</p>
        </section>
      )}

      {status === 'error' && (
        <section className="status-card status-error" role="alert">
          <h2>Could not load pets</h2>
          <p>{error}</p>
          <button className="button button-secondary" type="button" onClick={() => window.location.reload()}>
            Try again
          </button>
        </section>
      )}

      {status === 'ready' && error && (
        <section className="status-card status-error" role="alert">
          <p>{error}</p>
        </section>
      )}

      {status === 'ready' && pets.length === 0 && (
        <section className="empty-state">
          <div className="empty-illustration" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <circle cx="18" cy="22" r="7" />
              <circle cx="32" cy="14" r="7" />
              <circle cx="46" cy="22" r="7" />
              <path d="M15 46c0-10 7-17 17-17s17 7 17 17c0 5-4 8-8 5l-9-5-9 5c-4 3-8 0-8-5Z" />
            </svg>
          </div>
          <h2>No pets yet</h2>
          <p>
            {canWrite
              ? "Add your first pet to start building their health story."
              : "No pets are registered in the system yet."}
          </p>
          {canWrite && (
            <Link className="button button-primary empty-cta" to="/pets/new">
              <span aria-hidden="true">+</span> Add Pet
            </Link>
          )}
        </section>
      )}

      {status === 'ready' && pets.length > 0 && (
        <section className="pet-list" aria-label="Pets">
          {pets.map((pet) => (
            <PetCard
              key={pet.id}
              pet={pet}
              onDelete={canWrite ? handleDeletePet : null}
            />
          ))}

          {canWrite && (
            <Link className="add-pet-card" to="/pets/new">
              <span className="add-icon" aria-hidden="true">+</span>
              <span>Add another pet</span>
            </Link>
          )}
        </section>
      )}
    </main>
  )
}