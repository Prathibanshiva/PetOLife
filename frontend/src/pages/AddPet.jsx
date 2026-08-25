import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { createPet } from '../api/client.js'

const initialForm = {
  name: '',
  species: '',
  breed: '',
  date_of_birth: '',
  photo_url: '',
}

function validate(form) {
  const errors = {}

  if (!form.name.trim()) {
    errors.name = 'Please enter your pet\'s name.'
  } else if (form.name.trim().length > 100) {
    errors.name = 'Name must be 100 characters or fewer.'
  }

  if (!['dog', 'cat', 'other'].includes(form.species)) {
    errors.species = 'Choose Dog, Cat, or Other.'
  }

  if (form.breed.length > 100) {
    errors.breed = 'Breed must be 100 characters or fewer.'
  }

  if (form.photo_url) {
    try {
      new URL(form.photo_url)
    } catch {
      errors.photo_url = 'Enter a valid URL, including https://.'
    }
  }

  return errors
}

export default function AddPet() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validate(form)
    setErrors(nextErrors)
    setApiError('')

    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      await createPet({
        name: form.name.trim(),
        species: form.species,
        breed: form.breed.trim() || null,
        date_of_birth: form.date_of_birth || null,
        photo_url: form.photo_url.trim() || null,
      })
      setForm(initialForm)
      navigate('/pets')
    } catch (submitError) {
      setApiError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="page-shell form-page">
      <header className="page-header">
        <Link className="back-link" to="/pets">
  <span className="back-arrow" aria-hidden="true">←</span>
  <span>Back to pets</span>
</Link>
        <div className="brand-lockup" aria-label="PawTrail">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span>PawTrail</span>
        </div>
      </header>

      <section className="form-intro">
        <p className="eyebrow">NEW COMPANION</p>
        <h1>Add a pet</h1>
        <p>A few details now make their health story easier to follow.</p>
      </section>

      <form className="pet-form" onSubmit={handleSubmit} noValidate>
        <div className="field-group">
          <label htmlFor="name">Name <span aria-hidden="true">*</span></label>
          <input id="name" name="name" type="text" value={form.name} onChange={updateField} maxLength="100" autoComplete="off" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : undefined} />
          {errors.name && <p className="field-error" id="name-error">{errors.name}</p>}
        </div>

        <div className="field-group">
          <label htmlFor="species">Species <span aria-hidden="true">*</span></label>
          <select id="species" name="species" value={form.species} onChange={updateField} aria-invalid={Boolean(errors.species)} aria-describedby={errors.species ? 'species-error' : undefined}>
            <option value="">Choose a species</option>
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
            <option value="other">Other</option>
          </select>
          {errors.species && <p className="field-error" id="species-error">{errors.species}</p>}
        </div>

        <div className="field-group">
          <label htmlFor="breed">Breed <span className="optional">Optional</span></label>
          <input id="breed" name="breed" type="text" value={form.breed} onChange={updateField} maxLength="100" autoComplete="off" aria-invalid={Boolean(errors.breed)} aria-describedby={errors.breed ? 'breed-error' : undefined} />
          {errors.breed && <p className="field-error" id="breed-error">{errors.breed}</p>}
        </div>

        <div className="field-group">
          <label htmlFor="date_of_birth">Date of birth <span className="optional">Optional</span></label>
          <input id="date_of_birth" name="date_of_birth" type="date" value={form.date_of_birth} onChange={updateField} />
        </div>

        <div className="field-group">
          <label htmlFor="photo_url">Photo URL <span className="optional">Optional</span></label>
          <input id="photo_url" name="photo_url" type="url" inputMode="url" placeholder="https://example.com/pet-photo.jpg" value={form.photo_url} onChange={updateField} aria-invalid={Boolean(errors.photo_url)} aria-describedby={errors.photo_url ? 'photo-url-error' : undefined} />
          {errors.photo_url && <p className="field-error" id="photo-url-error">{errors.photo_url}</p>}
        </div>

        {apiError && <p className="api-error" role="alert">{apiError}</p>}

        <button className="button button-primary submit-button" type="submit" disabled={submitting}>
          {submitting ? 'Adding pet...' : 'Add Pet'}
        </button>
      </form>
    </main>
  )
}
