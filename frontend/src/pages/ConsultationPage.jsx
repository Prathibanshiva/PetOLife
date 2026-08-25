import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getVisit,
  getRecords,
  getHealthSummary,
  createRecord,
  completeVisit,
} from '../api/client.js'
import PetSummaryCard from '../components/PetSummaryCard.jsx'

const today = () => new Date().toISOString().slice(0, 10)

function ConsultForm({ pet, visitId, onSaved }) {
  const [form, setForm] = useState({
    record_date: today(),
    weight_kg: '',
    temperature_c: '',
    diagnosis: '',
    treatment: '',
    medicines: '',
    next_visit_required: false,
    next_visit_date: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const change = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        record_type: 'consultation',
        record_date: form.record_date,
        visit_id: visitId,
        title: `Consultation — ${pet.name}`,
        notes: form.notes || undefined,
        next_visit_required: form.next_visit_required,
        next_visit_date: form.next_visit_required && form.next_visit_date ? form.next_visit_date : undefined,
      }
      if (form.weight_kg) payload.weight_kg = parseFloat(form.weight_kg)
      if (form.temperature_c) payload.temperature_c = parseFloat(form.temperature_c)
      if (form.diagnosis.trim()) payload.diagnosis = form.diagnosis.trim()
      if (form.treatment.trim()) payload.treatment = form.treatment.trim()
      if (form.medicines.trim()) payload.medicines = form.medicines.trim()

      await createRecord(pet.id, payload)
      await completeVisit(visitId)
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="pet-form consult-form" onSubmit={handleSubmit} noValidate>
      <p className="eyebrow">CONSULTATION</p>
      <h2 className="consult-title">Clinical Record — {pet.name}</h2>

      <div className="consult-grid">
        <div className="field-group">
          <label htmlFor="c-date">Date</label>
          <input id="c-date" name="record_date" type="date" value={form.record_date} onChange={change} required />
        </div>
        <div className="field-group">
          <label htmlFor="c-weight">Weight (kg) <span className="optional">optional</span></label>
          <input id="c-weight" name="weight_kg" type="number" step="0.01" min="0" max="1000" value={form.weight_kg} onChange={change} placeholder="e.g. 12.5" />
        </div>
        <div className="field-group">
          <label htmlFor="c-temp">Temperature (°C) <span className="optional">optional</span></label>
          <input id="c-temp" name="temperature_c" type="number" step="0.1" min="30" max="45" value={form.temperature_c} onChange={change} placeholder="e.g. 38.5" />
        </div>
      </div>

      <div className="field-group">
        <label htmlFor="c-diagnosis">Diagnosis</label>
        <textarea id="c-diagnosis" name="diagnosis" value={form.diagnosis} onChange={change} rows={2} placeholder="Clinical findings and diagnosis…" />
      </div>

      <div className="field-group">
        <label htmlFor="c-treatment">Treatment</label>
        <textarea id="c-treatment" name="treatment" value={form.treatment} onChange={change} rows={2} placeholder="Treatment administered…" />
      </div>

      <div className="field-group">
        <label htmlFor="c-medicines">Medicines prescribed</label>
        <textarea id="c-medicines" name="medicines" value={form.medicines} onChange={change} rows={2} placeholder="Medicine names and dosages…" />
      </div>

      <div className="field-group">
        <label htmlFor="c-notes">Additional notes</label>
        <textarea id="c-notes" name="notes" value={form.notes} onChange={change} rows={2} placeholder="Any other observations…" />
      </div>

      <label className="consult-checkbox-row">
        <input
          type="checkbox"
          name="next_visit_required"
          checked={form.next_visit_required}
          onChange={change}
        />
        <span>Follow-up visit required</span>
      </label>

      {form.next_visit_required && (
        <div className="field-group">
          <label htmlFor="c-nextdate">Follow-up date</label>
          <input id="c-nextdate" name="next_visit_date" type="date" value={form.next_visit_date} onChange={change} />
        </div>
      )}

      {error && <p className="api-error" role="alert">{error}</p>}

      <button className="button button-primary submit-button" type="submit" disabled={saving}>
        {saving ? 'Saving consultation…' : 'Save Consultation & Complete Visit'}
      </button>
    </form>
  )
}

export default function ConsultationPage() {
  const { visitId } = useParams()
  const navigate = useNavigate()
  const [visit, setVisit] = useState(null)
  const [healthSummary, setHealthSummary] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [records, setRecords] = useState({}) // petId → records[]
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [activePetId, setActivePetId] = useState(null)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    try {
      const v = await getVisit(parseInt(visitId))
      setVisit(v)
      if (v.pets.length > 0) setActivePetId(v.pets[0].id)

      // Load records for each pet
      const recs = {}
      await Promise.all(v.pets.map(async pet => {
        const petRecords = await getRecords(pet.id).catch(() => [])
        recs[pet.id] = petRecords
      }))
      setRecords(recs)
      setStatus('ready')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }, [visitId])

  useEffect(() => { load() }, [load])
    useEffect(() => {
    if (!activePetId || status !== 'ready') return

    let cancelled = false

    const loadHealthSummary = async () => {
      setSummaryLoading(true)

      try {
        const result = await getHealthSummary(activePetId)

        if (!cancelled) {
          setHealthSummary(result.summary || '')
        }
      } catch {
        if (!cancelled) {
          setHealthSummary('')
        }
      } finally {
        if (!cancelled) {
          setSummaryLoading(false)
        }
      }
    }

    loadHealthSummary()

    return () => {
      cancelled = true
    }
  }, [activePetId, status])

  if (status === 'loading') {
    return (
      <main className="page-shell">
        <section className="status-card" aria-live="polite">
          <span className="loading-dot" />
          <p>Loading visit…</p>
        </section>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main className="page-shell">
        <section className="status-card status-error" role="alert">
          <h2>Could not load visit</h2>
          <p>{error}</p>
          <button className="button button-secondary" onClick={() => navigate('/doctor')}>Back</button>
        </section>
      </main>
    )
  }

  if (saved) {
    return (
      <main className="page-shell">
        <section className="fd-success-card" style={{ marginTop: 60 }}>
          <div className="fd-success-icon" aria-hidden="true">✓</div>
          <h3>Consultation Saved</h3>
          <p>The health record has been created and the visit is marked complete. AI Health Signals have been updated.</p>
          <button className="button button-primary" onClick={() => navigate('/doctor')}>
            Back to Dashboard
          </button>
        </section>
      </main>
    )
  }

const activePet = visit.pets.find(p => p.id === activePetId)
const petRecords = records[activePetId] || []

const currentVisitId = parseInt(visitId)

const currentConsultation = petRecords.find(
  (record) =>
    record.record_type === 'consultation' &&
    Number(record.visit_id) === currentVisitId
)

const previousConsultation = petRecords
  .filter(
    (record) =>
      record.record_type === 'consultation' &&
      Number(record.visit_id) !== currentVisitId
  )
  .sort(
    (a, b) =>
      new Date(b.record_date || 0) - new Date(a.record_date || 0)
  )[0]

const lastRecord = petRecords.find(r => r.record_date)
  return (
    <main className="page-shell">
      <header className="page-header">
        <button
          className="back-link"
          type="button"
          onClick={() => navigate('/doctor')}
          style={{ border: 0, padding: 0, background: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, color: '#0B3D2E', fontWeight: 700 }}
        >
          ← Dashboard
        </button>
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span>PawTrail</span>
        </div>
      </header>

      {visit.pets.length > 1 && (
        <div className="consult-pet-tabs">
          {visit.pets.map(pet => (
            <button
              key={pet.id}
              className={`consult-pet-tab ${activePetId === pet.id ? 'active' : ''}`}
              onClick={() => setActivePetId(pet.id)}
              type="button"
            >
              {pet.name}
            </button>
          ))}
        </div>
      )}

      {activePet && (
        <PetSummaryCard
          pet={activePet}
          ownerName={activePet.owner_name}
          lastVisitDate={lastRecord?.record_date}
        />
      )}

      {visit.status === 'completed' ? (
  <section className="status-card" style={{ marginTop: 20 }}>
    <p className="eyebrow">CONSULTATION COMPLETED</p>

    <h3>
      Consultation — {currentConsultation?.record_date || visit.created_at?.slice(0, 10)}
    </h3>

    {currentConsultation ? (
      <>
        {currentConsultation.diagnosis && (
          <p>
            <strong>Diagnosis:</strong>{' '}
            {currentConsultation.diagnosis}
          </p>
        )}

        {currentConsultation.treatment && (
          <p>
            <strong>Treatment:</strong>{' '}
            {currentConsultation.treatment}
          </p>
        )}

        {currentConsultation.medicines && (
          <p>
            <strong>Medicines:</strong>{' '}
            {currentConsultation.medicines}
          </p>
        )}

        {currentConsultation.notes && (
          <p>
            <strong>Notes:</strong>{' '}
            {currentConsultation.notes}
          </p>
        )}

        {currentConsultation.weight_kg && (
          <p>
            <strong>Weight:</strong>{' '}
            {currentConsultation.weight_kg} kg
          </p>
        )}

        {currentConsultation.temperature_c && (
          <p>
            <strong>Temperature:</strong>{' '}
            {currentConsultation.temperature_c} °C
          </p>
        )}

        {currentConsultation.next_visit_required && (
          <p>
            <strong>Follow-up:</strong>{' '}
            {currentConsultation.next_visit_date
              ? `Required by ${currentConsultation.next_visit_date}`
              : 'Required'}
          </p>
        )}
      </>
    ) : (
      <p>
        This visit has been completed. The consultation record could not be
        found in the pet&apos;s health history.
      </p>
    )}

    <button
      className="button button-secondary"
      style={{ marginTop: 12 }}
      onClick={() => navigate('/doctor')}
    >
      Back to Dashboard
    </button>
  </section>
) : (
                activePet && (
          <>
            {previousConsultation && (
  <section className="status-card" style={{ marginTop: 20 }}>
    <p className="eyebrow">AI HEALTH SUMMARY</p>

    <h3>
      Pet health overview
    </h3>

    {summaryLoading ? (
      <p>Generating AI health summary...</p>
    ) : healthSummary ? (
      <p style={{ lineHeight: 1.7 }}>
        {healthSummary}
      </p>
    ) : (
      <p>
        There is not enough documented health information yet to generate a
        detailed summary.
      </p>
    )}

    {previousConsultation.diagnosis && (
      <p>
        <strong>Previous diagnosis:</strong>{' '}
        {previousConsultation.diagnosis}
      </p>
    )}
  </section>
)}

            <ConsultForm
              pet={activePet}
              visitId={parseInt(visitId)}
              onSaved={() => setSaved(true)}
            />
          </>
        )
      )}
    </main>
  )
}
