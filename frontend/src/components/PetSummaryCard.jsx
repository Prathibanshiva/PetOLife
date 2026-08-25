/**
 * PetSummaryCard — reusable card showing key pet info.
 * Used by doctor consultation view and owner pet detail header.
 */

function calcAge(dateOfBirth) {
  if (!dateOfBirth) return null
  const dob = new Date(`${dateOfBirth}T00:00:00`)
  const now = new Date()
  const months =
    (now.getFullYear() - dob.getFullYear()) * 12 +
    (now.getMonth() - dob.getMonth())
  if (months < 0) return null
  if (months < 24) return `${months}mo`
  return `${Math.floor(months / 12)}y ${months % 12}mo`
}

export default function PetSummaryCard({ pet, lastVisitDate, ownerName }) {
  const age = calcAge(pet.date_of_birth)

  return (
    <div className="pet-summary-card">
      <div className="pet-summary-avatar">
        {pet.photo_url
          ? <img src={pet.photo_url} alt={pet.name} />
          : <span>{pet.name.slice(0, 1).toUpperCase()}</span>
        }
      </div>
      <div className="pet-summary-info">
        <h2 className="pet-summary-name">{pet.name}</h2>
        <p className="pet-summary-meta">
          {[pet.species, pet.breed].filter(Boolean).join(' · ')}
          {age && <> · {age}</>}
        </p>
        {ownerName && (
          <p className="pet-summary-owner">Owner: {ownerName}</p>
        )}
        {lastVisitDate && (
          <p className="pet-summary-lastvisit">
            Last visit: {new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${lastVisitDate}T00:00:00`))}
          </p>
        )}
      </div>
    </div>
  )
}
