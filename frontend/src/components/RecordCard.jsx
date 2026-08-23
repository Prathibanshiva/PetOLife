const labels = {
  vet_visit: 'Vet Visit',
  vaccination: 'Vaccination',
  weight: 'Weight',
  medication: 'Medication',
  symptom: 'Symptom / Note',
}

const formatDate = (value) =>
  new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))

function canDeleteRecord(record) {
  if (!record.created_at) {
    return false
  }

  const createdAt = new Date(record.created_at)
  const now = new Date()

  const ageInMilliseconds = now.getTime() - createdAt.getTime()
  const twentyFourHours = 24 * 60 * 60 * 1000

  return ageInMilliseconds >= 0 && ageInMilliseconds <= twentyFourHours
}

export default function RecordCard({ record, onEdit, onDelete }) {
  const detail =
    record.record_type === 'weight'
      ? `${record.weight_kg} kg`
      : record.record_type === 'vaccination'
        ? record.vaccine_name
        : record.record_type === 'medication'
          ? [record.medication_name, record.dosage]
              .filter(Boolean)
              .join(' · ')
          : ''

  const showDelete = canDeleteRecord(record)

  function handleDelete() {
    const confirmed = window.confirm(
      'Delete this health record? This action cannot be undone.'
    )

    if (!confirmed) {
      return
    }

    onDelete(record)
  }

  return (
    <article className="record-card">
      <div>
        <p className="record-label">{labels[record.record_type]}</p>
        <p className="record-date">{formatDate(record.record_date)}</p>
      </div>

      <div className="record-card-body">
        {detail && <h3>{detail}</h3>}

        {record.title && (
          <p className="record-title">{record.title}</p>
        )}

        {record.record_type === 'vaccination' && record.next_due_date && (
          <p className="record-extra">
            Next due: {formatDate(record.next_due_date)}
          </p>
        )}

        {record.notes && (
          <p className="record-notes">{record.notes}</p>
        )}

        <div className="record-actions">
          <button
            className="record-action-button"
            type="button"
            onClick={() => onEdit(record)}
          >
            Edit
          </button>

          {showDelete && (
            <button
              className="record-action-button record-delete-action"
              type="button"
              onClick={handleDelete}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </article>
  )
}