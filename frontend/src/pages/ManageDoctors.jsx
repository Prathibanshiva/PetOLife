import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDoctors, createDoctor, deleteDoctor } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function ManageDoctors() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [doctors, setDoctors] = useState([])
  const [status, setStatus] = useState('loading')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    setStatus('loading')
    try {
      const data = await getDoctors()
      setDoctors(data)
      setStatus('ready')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  useEffect(() => { load() }, [])

  const change = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) return
    setError('')
    setSaving(true)
    try {
      await createDoctor({ name: form.name.trim(), phone: form.phone.trim() })
      setForm({ name: '', phone: '' })
      setShowForm(false)
      setMessage('Doctor added successfully.')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(doctor) {
    const confirmed = window.confirm(
      `Remove Dr. ${doctor.name} from the clinic? This cannot be undone.`
    )
    if (!confirmed) return
    setError('')
    setMessage('')
    try {
      await deleteDoctor(doctor.id)
      setMessage(`${doctor.name} removed.`)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <button
          className="back-link"
          type="button"
          onClick={() => navigate('/front-desk')}
          style={{ border: 0, padding: 0, background: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, color: '#0B3D2E', fontWeight: 700 }}
        >
          ← Front Desk
        </button>
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span>PawTrail</span>
        </div>
      </header>

      <section className="intro">
        <p className="eyebrow">CLINIC MANAGEMENT</p>
        <h1>Manage Doctors</h1>
        <p>Add or remove clinic doctors who can receive visit assignments.</p>
      </section>

      {message && <p className="success-message" role="status">{message}</p>}
      {error && <p className="api-error" role="alert">{error}</p>}

      <button
        className="button button-primary"
        type="button"
        onClick={() => { setShowForm(s => !s); setError('') }}
        style={{ marginBottom: 20, width: '100%' }}
      >
        {showForm ? 'Cancel' : '+ Add Doctor'}
      </button>

      {showForm && (
        <form className="pet-form fd-inline-form" onSubmit={handleAdd} noValidate>
          <div className="field-group">
            <label htmlFor="doc-name">Doctor name</label>
            <input id="doc-name" name="name" type="text" value={form.name} onChange={change} placeholder="Dr. Full Name" required />
          </div>
          <div className="field-group">
            <label htmlFor="doc-phone">Phone number</label>
            <input id="doc-phone" name="phone" type="tel" value={form.phone} onChange={change} placeholder="+91 90000 XXXXX" required />
          </div>
          <button className="button button-primary submit-button" type="submit" disabled={saving}>
            {saving ? 'Adding…' : 'Add Doctor'}
          </button>
        </form>
      )}

      {status === 'loading' && (
        <section className="status-card" aria-live="polite">
          <span className="loading-dot" aria-hidden="true" />
          <p>Loading doctors…</p>
        </section>
      )}

      {status === 'ready' && doctors.length === 0 && (
        <section className="empty-state">
          <h2>No doctors yet</h2>
          <p>Add your first clinic doctor above to enable visit assignment.</p>
        </section>
      )}

      {status === 'ready' && doctors.length > 0 && (
        <div className="doctors-list">
          {doctors.map(doctor => (
            <div key={doctor.id} className="doctor-card">
              <div className="doctor-avatar">{doctor.name.slice(0, 2).toUpperCase()}</div>
              <div className="doctor-info">
                <strong>{doctor.name}</strong>
                <span>{doctor.phone}</span>
              </div>
              <button
                className="doctor-remove-btn"
                type="button"
                onClick={() => handleDelete(doctor)}
                aria-label={`Remove ${doctor.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
