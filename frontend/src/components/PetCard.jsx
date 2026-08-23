import { Link } from 'react-router-dom'
import { useState } from 'react'

function PetAvatar({ pet }) {
  const [imageFailed, setImageFailed] = useState(false)
  const speciesLetter = (pet.species || 'P').slice(0, 1).toUpperCase()

  if (pet.photo_url && !imageFailed) {
    return (
      <img
        className="pet-avatar pet-avatar-image"
        src={pet.photo_url}
        alt={pet.name}
        onError={() => setImageFailed(true)}
      />
    )
  }

  return (
    <div className="pet-avatar pet-avatar-placeholder" aria-hidden="true">
      <svg viewBox="0 0 48 48" className="paw-mark">
        <circle cx="13" cy="17" r="5" />
        <circle cx="24" cy="11" r="5" />
        <circle cx="35" cy="17" r="5" />
        <path d="M12 35c0-7 5-12 12-12s12 5 12 12c0 4-3 6-6 4l-6-3-6 3c-3 2-6 0-6-4Z" />
      </svg>
      <span>{speciesLetter}</span>
    </div>
  )
}

export default function PetCard({ pet, onDelete }) {
  const details = [pet.breed, pet.species].filter(Boolean).join(' · ')

  function handleDelete(event) {
    event.preventDefault()
    event.stopPropagation()

    onDelete(pet)
  }

  return (
    <div className="pet-card">
      <Link
        className="pet-card-main"
        to={`/pets/${pet.id}`}
        aria-label={`Open ${pet.name}'s profile`}
      >
        <PetAvatar pet={pet} />

        <div className="pet-card-copy">
          <h2>{pet.name}</h2>
          <p>{details}</p>
        </div>

        <svg className="chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </Link>

      <button
        className="pet-delete-button"
        type="button"
        onClick={handleDelete}
        aria-label={`Delete ${pet.name}`}
        title={`Delete ${pet.name}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 4h6" />
          <path d="M5 7h14" />
          <path d="M8 7l1 13h6l1-13" />
          <path d="M10 11v5" />
          <path d="M14 11v5" />
        </svg>
      </button>
    </div>
  )
}