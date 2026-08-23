import { Link, useParams } from 'react-router-dom'

export default function PetDetailPlaceholder() {
  const { petId } = useParams()

  return (
    <main className="page-shell placeholder-page">
      <header className="page-header">
        <Link className="back-link" to="/pets">Back to pets</Link>
        <div className="brand-lockup" aria-label="PawTrail">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span>PawTrail</span>
        </div>
      </header>
      <section className="placeholder-card">
        <p className="eyebrow">PET PROFILE</p>
        <h1>Health story coming next</h1>
        <p>Pet detail for profile #{petId} will be ready in Task 5.</p>
        <Link className="button button-primary" to="/pets">Return to My Pets</Link>
      </section>
    </main>
  )
}
