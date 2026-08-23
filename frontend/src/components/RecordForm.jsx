import { useEffect, useState } from 'react'

const labels = {
  vet_visit: 'Vet Visit',
  vaccination: 'Vaccination',
  weight: 'Weight',
  medication: 'Medication',
  symptom: 'Symptom / Note',
}

const today = new Date().toISOString().slice(0, 10)

function getInitialForm(record) {
  return {
    record_date: record?.record_date || today,
    title: record?.title || '',
    notes: record?.notes || '',
    vaccine_name: record?.vaccine_name || '',
    next_due_date: record?.next_due_date || '',
    weight_kg: record?.weight_kg ?? '',
    medication_name: record?.medication_name || '',
    dosage: record?.dosage || '',
  }
}

export default function RecordForm({
  type,
  record = null,
  onSave,
  onCancel,
}) {
  const isEditing = Boolean(record)

  const [form, setForm] = useState(getInitialForm(record))
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    setForm(getInitialForm(record))
    setErrors({})
    setApiError('')
  }, [record, type])

  const change = (event) => {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))

    setErrors((current) => ({
      ...current,
      [name]: undefined,
    }))
  }

  const validate = () => {
    const next = {}

    if (!form.record_date) {
      next.record_date = 'Please choose a date.'
    }

    if (
      type === 'vaccination' &&
      !form.vaccine_name.trim()
    ) {
      next.vaccine_name = 'Vaccine name is required.'
    }

    if (
      type === 'weight' &&
      (
        !form.weight_kg ||
        Number(form.weight_kg) <= 0 ||
        Number(form.weight_kg) > 1000
      )
    ) {
      next.weight_kg = 'Enter a weight between 0 and 1000 kg.'
    }

    if (
      type === 'medication' &&
      !form.medication_name.trim()
    ) {
      next.medication_name = 'Medication name is required.'
    }

    if (
      type === 'symptom' &&
      !form.notes.trim()
    ) {
      next.notes = 'Please add a note for this symptom.'
    }

    return next
  }

  const submit = async (event) => {
    event.preventDefault()

    const next = validate()

    setErrors(next)
    setApiError('')

    if (Object.keys(next).length) {
      return
    }

    const payload = {
      record_type: type,
      record_date: form.record_date,
    }

    ;['title', 'notes'].forEach((key) => {
      if (form[key].trim()) {
        payload[key] = form[key].trim()
      }
    })

    if (type === 'vaccination') {
      payload.vaccine_name = form.vaccine_name.trim()

      if (form.next_due_date) {
        payload.next_due_date = form.next_due_date
      }
    }

    if (type === 'weight') {
      payload.weight_kg = Number(form.weight_kg)
    }

    if (type === 'medication') {
      payload.medication_name = form.medication_name.trim()

      if (form.dosage.trim()) {
        payload.dosage = form.dosage.trim()
      }
    }

    setSubmitting(true)

    try {
      await onSave(payload)
    } catch (error) {
      setApiError(error.message)
      setSubmitting(false)
    }
  }

  const field = (name, label, props = {}) => (
    <div className="field-group">
      <label htmlFor={name}>
        {label}
        {props.required && (
          <span aria-hidden="true"> *</span>
        )}
      </label>

      <input
        id={name}
        name={name}
        value={form[name]}
        onChange={change}
        aria-invalid={Boolean(errors[name])}
        {...props}
      />

      {errors[name] && (
        <p className="field-error">{errors[name]}</p>
      )}
    </div>
  )

  return (
    <section className="record-flow">
      <button
        className="back-link"
        type="button"
        onClick={onCancel}
      >
        ← Back to types
      </button>

      <p className="eyebrow">
        {isEditing ? 'EDIT RECORD' : 'NEW RECORD'}
      </p>

      <h1>
        {isEditing ? 'Edit' : 'Add'} {labels[type]}
      </h1>

      <form
        className="pet-form"
        onSubmit={submit}
        noValidate
      >
        {field('record_date', 'Date', {
          type: 'date',
          required: true,
        })}

        {type === 'vaccination' &&
          field('vaccine_name', 'Vaccine name', {
            type: 'text',
            maxLength: 100,
            required: true,
          })}

        {type === 'vaccination' &&
          field('next_due_date', 'Next due date', {
            type: 'date',
          })}

        {type === 'weight' &&
          field('weight_kg', 'Weight (kg)', {
            type: 'number',
            step: '0.01',
            min: '0.01',
            max: '1000',
            required: true,
          })}

        {type === 'medication' &&
          field('medication_name', 'Medication name', {
            type: 'text',
            maxLength: 100,
            required: true,
          })}

        {type === 'medication' &&
          field('dosage', 'Dosage', {
            type: 'text',
            maxLength: 100,
          })}

        {field('title', 'Title', {
          type: 'text',
          maxLength: 200,
        })}

        <div className="field-group">
          <label htmlFor="notes">
            Notes
            {type === 'symptom' && (
              <span aria-hidden="true"> *</span>
            )}
          </label>

          <textarea
            id="notes"
            name="notes"
            value={form.notes}
            onChange={change}
            rows="4"
            aria-invalid={Boolean(errors.notes)}
          />

          {errors.notes && (
            <p className="field-error">{errors.notes}</p>
          )}
        </div>

        {apiError && (
          <p className="api-error" role="alert">
            {apiError}
          </p>
        )}

        <button
          className="button button-primary submit-button"
          disabled={submitting}
        >
          {submitting
            ? isEditing
              ? 'Updating record...'
              : 'Saving record...'
            : isEditing
              ? 'Update Record'
              : 'Save Record'}
        </button>
      </form>
    </section>
  )
}