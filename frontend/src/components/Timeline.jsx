/**
 * Shared Timeline component — used by Owner, Doctor, and Receptionist.
 * Groups records by month, shows filter chips.
 */
import { useState } from 'react'

const RECORD_LABELS = {
  vet_visit: 'Vet Visit',
  vaccination: 'Vaccination',
  weight: 'Weight',
  medication: 'Medication',
  symptom: 'Symptom / Note',
  consultation: 'Consultation',
}

const RECORD_ICONS = {
  vet_visit: '🏥',
  vaccination: '💉',
  weight: '⚖️',
  medication: '💊',
  symptom: '📋',
  consultation: '🩺',
}

const FILTER_CHIPS = [
  { label: 'All', value: null },
  { label: 'Vet Visit', value: 'vet_visit' },
  { label: 'Vaccination', value: 'vaccination' },
  { label: 'Weight', value: 'weight' },
  { label: 'Medication', value: 'medication' },
  { label: 'Symptom', value: 'symptom' },
  { label: 'Consultation', value: 'consultation' },
]

function formatDate(value) {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function groupByMonth(records) {
  const groups = {}
  records.forEach(record => {
    const d = new Date(`${record.record_date}T00:00:00`)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(d)
    if (!groups[key]) groups[key] = { key, label, records: [] }
    groups[key].records.push(record)
  })
  return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key))
}

function VaccinationBadge({ record }) {
  if (record.record_type !== 'vaccination' || !record.next_due_date) return null
  const dueDate = new Date(`${record.next_due_date}T00:00:00`)
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((dueDate - todayDate) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return <span className="vax-badge vax-overdue">Overdue</span>
  }
  if (diffDays <= 30) {
    return <span className="vax-badge vax-due-soon">Due soon</span>
  }
  return <span className="vax-badge vax-ok">Up to date</span>
}

function TimelineRecord({ record, isHighlighted }) {
  const detail =
    record.record_type === 'weight' && record.weight_kg
      ? `${record.weight_kg} kg`
      : record.record_type === 'vaccination' && record.vaccine_name
        ? record.vaccine_name
        : record.record_type === 'medication' && record.medication_name
          ? [record.medication_name, record.dosage].filter(Boolean).join(' · ')
          : ''

  return (
    <article
      id={`record-${record.id}`}
      className={`timeline-record ${isHighlighted ? 'timeline-record-highlighted' : ''}`}
    >
      <div className="timeline-record-left">
        <span className="timeline-record-icon" aria-hidden="true">
          {RECORD_ICONS[record.record_type] || '📄'}
        </span>
        <div className="timeline-record-meta">
          <p className="timeline-record-type">{RECORD_LABELS[record.record_type]}</p>
          <p className="timeline-record-date">{formatDate(record.record_date)}</p>
          {record.author_role && (
            <p className="timeline-record-author">by {record.author_role}</p>
          )}
        </div>
      </div>

      <div className="timeline-record-body">
        {detail && <p className="timeline-record-detail">{detail}</p>}
        {record.title && <p className="timeline-record-title">{record.title}</p>}

        {record.temperature_c && (
          <p className="timeline-record-extra">Temp: {record.temperature_c}°C</p>
        )}
        {record.diagnosis && (
          <p className="timeline-record-extra">Diagnosis: {record.diagnosis}</p>
        )}
        {record.treatment && (
          <p className="timeline-record-extra">Treatment: {record.treatment}</p>
        )}
        {record.medicines && (
          <p className="timeline-record-extra">Medicines: {record.medicines}</p>
        )}
        {record.next_visit_required && (
          <p className="timeline-record-extra timeline-follow-up">
            Follow-up required{record.next_visit_date ? `: ${formatDate(record.next_visit_date)}` : ''}
          </p>
        )}

        {record.record_type === 'vaccination' && record.next_due_date && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <p className="timeline-record-extra" style={{ margin: 0 }}>
              Next due: {formatDate(record.next_due_date)}
            </p>
            <VaccinationBadge record={record} />
          </div>
        )}

        {record.notes && <p className="timeline-record-notes">{record.notes}</p>}
      </div>
    </article>
  )
}

export default function Timeline({ records, highlightedIds = [] }) {
  const [filter, setFilter] = useState(null)

  const filtered = filter
    ? records.filter(r => r.record_type === filter)
    : records

  const groups = groupByMonth(filtered)

  return (
    <section className="timeline-section">
      <div className="timeline-header">
        <div>
          <p className="eyebrow">HEALTH STORY</p>
          <h2 className="timeline-title">Health Records</h2>
        </div>
        <p className="timeline-count">{records.length} record{records.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="timeline-filters" role="group" aria-label="Filter records by type">
        {FILTER_CHIPS.map(chip => (
          <button
            key={chip.label}
            className={`timeline-chip ${filter === chip.value ? 'timeline-chip-active' : ''}`}
            type="button"
            onClick={() => setFilter(chip.value)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <section className="empty-state records-empty">
          <h2>No {filter ? RECORD_LABELS[filter] : ''} records</h2>
          <p>
            {filter
              ? `No ${RECORD_LABELS[filter]?.toLowerCase()} records found.`
              : 'Health records will appear here once added.'}
          </p>
        </section>
      ) : (
        groups.map(group => (
          <div key={group.key} className="timeline-month-group">
            <h3 className="timeline-month-label">{group.label}</h3>
            <div className="timeline-records">
              {group.records.map(record => (
                <TimelineRecord
                  key={record.id}
                  record={record}
                  isHighlighted={highlightedIds.includes(record.id)}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  )
}
