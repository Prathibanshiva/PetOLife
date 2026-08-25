import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getVisits } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'

const statusLabel = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
}

const statusClass = {
  scheduled: 'visit-status-scheduled',
  in_progress: 'visit-status-inprogress',
  completed: 'visit-status-completed',
}

function calcAge(dob) {
  if (!dob) return null
  const d = new Date(`${dob}T00:00:00`)
  const now = new Date()
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
  if (months < 0) return null
  if (months < 24) return `${months}mo`
  return `${Math.floor(months / 12)}y`
}

export default function DoctorHome() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [visits, setVisits] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const data = await getVisits()
        if (active) { setVisits(data); setStatus('ready') }
      } catch (err) {
        if (active) { setError(err.message); setStatus('error') }
      }
    }
    load()
    return () => { active = false }
  }, [])

  const today = new Intl.DateTimeFormat('en', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

  return (
    <main className="page-shell">
      <header className="page-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span>PawTrail</span>
        </div>
        <button className="button button-secondary header-action" type="button" onClick={logout}>
          Sign out
        </button>
      </header>

      <section className="intro">
        <p className="eyebrow">DOCTOR DASHBOARD</p>
        <h1>Good day,<br />{user?.name || 'Doctor'}</h1>
        <p>{today} · Today&apos;s patient queue</p>
      </section>

      {status === 'loading' && (
        <section className="status-card" aria-live="polite">
          <span className="loading-dot" aria-hidden="true" />
          <p>Loading today&apos;s visits…</p>
        </section>
      )}

      {status === 'error' && (
        <section className="status-card status-error" role="alert">
          <h2>Could not load visits</h2>
          <p>{error}</p>
        </section>
      )}

      {status === 'ready' && visits.length === 0 && (
        <section className="empty-state">
          <h2>No visits today</h2>
          <p>Your patient queue is empty. Visits assigned by the receptionist will appear here.</p>
        </section>
      )}

      {status === 'ready' && visits.length > 0 && (
        <div className="visits-list">
          {visits.map(visit => (
            <div key={visit.id} className="visit-card">
              <div className="visit-card-header">
                <span className={`visit-status-badge ${statusClass[visit.status] || ''}`}>
                  {statusLabel[visit.status] || visit.status}
                </span>
                <span className="visit-id">Visit #{visit.id}</span>
              </div>

              <div className="visit-pets">
                {visit.pets.map(pet => (
                  <div key={pet.id} className="visit-pet-row">
                    <div className="visit-pet-avatar">{pet.name.slice(0, 1).toUpperCase()}</div>
                    <div>
                      <strong className="visit-pet-name">{pet.name}</strong>
                      <p className="visit-pet-meta">
                        {[pet.species, pet.breed].filter(Boolean).join(' · ')}
                        {pet.date_of_birth && <> · {calcAge(pet.date_of_birth)}</>}
                      </p>
                      <p className="visit-pet-owner">Owner: {pet.owner_name}</p>
                    </div>
                  </div>
                ))}
              </div>

              {visit.status !== 'completed' && (
                <button
                  className="button button-primary"
                  style={{ width: '100%' }}
                  type="button"
                  onClick={() => navigate(`/doctor/visit/${visit.id}`)}
                >
                  Start Consultation
                </button>
              )}

              {visit.status === 'completed' && (
                <button
                  className="button button-secondary"
                  style={{ width: '100%' }}
                  type="button"
                  onClick={() => navigate(`/doctor/visit/${visit.id}`)}
                >
                  View Consultation
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
