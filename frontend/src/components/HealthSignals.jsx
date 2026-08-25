/**
 * HealthSignals — AI-generated health signals for a pet.
 * Shows above the timeline. Cached — does not regenerate on every load.
 * Supports source record traceability by highlighting timeline records.
 */
import { useState, useEffect } from 'react'
import { getSignals, refreshSignals } from '../api/client.js'

const SIGNAL_CONFIG = {
  event: {
    label: 'Event',
    className: 'signal-event',
    icon: '📌',
    description: 'Notable occurrence in the health history',
  },
  change: {
    label: 'Change',
    className: 'signal-change',
    icon: '📈',
    description: 'Something that changed over time',
  },
  pattern: {
    label: 'Pattern',
    className: 'signal-pattern',
    icon: '🔁',
    description: 'Recurring observation across multiple records',
  },
  attention: {
    label: 'Attention',
    className: 'signal-attention',
    icon: '⚠️',
    description: 'An observation worth discussing with your vet',
  },
}

function SignalCard({ signal, onHighlight, isActive }) {
  const config = SIGNAL_CONFIG[signal.signal_type] || SIGNAL_CONFIG.event
  const hasSource = signal.source_record_ids && signal.source_record_ids.length > 0

  function handleClick() {
    if (!hasSource) return
    onHighlight(isActive ? [] : signal.source_record_ids)

    if (!isActive && signal.source_record_ids.length > 0) {
      // Scroll to the first source record
      const el = document.getElementById(`record-${signal.source_record_ids[0]}`)
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
      }
    }
  }

  return (
    <div
      className={`signal-card ${config.className} ${isActive ? 'signal-card-active' : ''}`}
      role={hasSource ? 'button' : 'article'}
      tabIndex={hasSource ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={hasSource ? (e) => e.key === 'Enter' && handleClick() : undefined}
      aria-pressed={isActive}
    >
      <div className="signal-card-header">
        <span className="signal-icon" aria-hidden="true">{config.icon}</span>
        <span className="signal-label">{config.label}</span>
        {hasSource && (
          <span className="signal-source-hint">
            {isActive ? 'Click to deselect' : `${signal.source_record_ids.length} source record${signal.source_record_ids.length > 1 ? 's' : ''} ↓`}
          </span>
        )}
      </div>
      <p className="signal-text">{signal.text}</p>
    </div>
  )
}

export default function HealthSignals({ petId, onHighlightRecords }) {
  const [status, setStatus] = useState('loading')
  const [signals, setSignals] = useState([])
  const [message, setMessage] = useState('')
  const [activeSignalId, setActiveSignalId] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [generatedAt, setGeneratedAt] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const res = await getSignals(petId)
        if (!active) return
        if (res.signals && res.signals.length > 0) {
          setSignals(res.signals)
          setGeneratedAt(res.signals[0]?.generated_at)
          setStatus('ready')
        } else {
          setMessage(res.message || 'No signals available yet.')
          setStatus('empty')
        }
      } catch {
        if (active) setStatus('unavailable')
      }
    }
    load()
    return () => { active = false }
  }, [petId])

  async function handleRefresh() {
    setRefreshing(true)
    setActiveSignalId(null)
    onHighlightRecords([])
    try {
      const res = await refreshSignals(petId)
      if (res.signals && res.signals.length > 0) {
        setSignals(res.signals)
        setGeneratedAt(res.signals[0]?.generated_at)
        setStatus('ready')
        setMessage('')
      } else {
        setMessage(res.message || 'No signals available.')
        setStatus('empty')
      }
    } catch {
      setStatus('unavailable')
    } finally {
      setRefreshing(false)
    }
  }

  function handleHighlight(signalId, recordIds) {
    if (activeSignalId === signalId) {
      setActiveSignalId(null)
      onHighlightRecords([])
    } else {
      setActiveSignalId(signalId)
      onHighlightRecords(recordIds)
    }
  }

  // Group signals by type for display
  const grouped = {}
  signals.forEach(sig => {
    if (!grouped[sig.signal_type]) grouped[sig.signal_type] = []
    grouped[sig.signal_type].push(sig)
  })

  return (
    <section className="signals-section">
      <div className="signals-header">
        <div>
          <p className="eyebrow">AI HEALTH SIGNALS</p>
          <h2 className="signals-title">Health Insights</h2>
          <p className="signals-subtitle">Based on your pet&apos;s complete health history</p>
        </div>
        <button
          className="button button-secondary signals-refresh-btn"
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh AI health signals"
        >
          {refreshing ? '…' : '↻ Refresh'}
        </button>
      </div>

      {generatedAt && (
        <p className="signals-generated-at">
          Generated {new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(generatedAt))}
        </p>
      )}

      {status === 'loading' && (
        <div className="signals-loading">
          <span className="loading-dot" aria-hidden="true" />
          <p>Analyzing health history…</p>
        </div>
      )}

      {status === 'unavailable' && (
        <div className="signals-unavailable">
          <p>Health insights are temporarily unavailable. Your health records are still safe and available.</p>
        </div>
      )}

      {status === 'empty' && (
        <div className="signals-empty">
          <p>{message}</p>
        </div>
      )}

      {status === 'ready' && (
        <>
          {activeSignalId && (
            <div className="signals-trace-banner">
              Source records highlighted in the timeline below. Click signal again to deselect.
            </div>
          )}
          <div className="signals-grid">
            {signals.map((sig) => (
              <SignalCard
                key={sig.id}
                signal={sig}
                isActive={activeSignalId === sig.id}
                onHighlight={(ids) => handleHighlight(sig.id, ids)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
