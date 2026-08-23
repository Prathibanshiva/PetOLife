const options = [
  ['vet_visit', 'Vet Visit', 'Check-ups, appointments, and care notes'],
  ['vaccination', 'Vaccination', 'Vaccines and next due dates'],
  ['weight', 'Weight', 'Track weigh-ins over time'],
  ['medication', 'Medication', 'Medicines and dosage details'],
  ['symptom', 'Symptom / Note', 'Observations worth remembering'],
]

export default function RecordTypePicker({ onChoose, onCancel }) {
  return <section className="record-flow">
    <button className="back-link" type="button" onClick={onCancel}>Back to profile</button>
    <p className="eyebrow">HEALTH RECORD</p>
    <h1>What would you like to add?</h1>
    <div className="record-type-list">
      {options.map(([value, title, text], index) => <button className="record-type-card" type="button" key={value} onClick={() => onChoose(value)}>
        <span className="record-type-icon">{index + 1}</span><span><strong>{title}</strong><small>{text}</small></span><span className="chevron-text">&gt;</span>
      </button>)}
    </div>
  </section>
}
