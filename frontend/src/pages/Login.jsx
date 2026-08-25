import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { requestOtp, verifyOtp } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'

const DEMO_ACCOUNTS = [
  { label: 'Receptionist — Ananya Sharma', phone: '+919000010001' },
  { label: 'Doctor — Dr. Arjun Mehta', phone: '+919000010002' },
]

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [step, setStep] = useState('phone') // 'phone' | 'otp'
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [demoOtp, setDemoOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRequestOtp(e) {
    e.preventDefault()
    if (!phone.trim()) return
    setError('')
    setLoading(true)
    try {
      const res = await requestOtp(phone.trim())
      setDemoOtp(res.demo_otp)
      setStep('otp')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault()
    if (!otp.trim()) return
    setError('')
    setLoading(true)
    try {
      const res = await verifyOtp(phone.trim(), otp.trim())
      login(res.token, { user_id: res.user_id, role: res.role, name: res.name })

      if (res.role === 'receptionist') navigate('/front-desk')
      else if (res.role === 'doctor') navigate('/doctor')
      else navigate('/pets')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-shell login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span className="login-brand-name">PawTrail</span>
        </div>

        <p className="login-tagline">
          Your pet's health story, intelligently understood.
        </p>

        {step === 'phone' ? (
          <form className="login-form" onSubmit={handleRequestOtp} noValidate>
            <div className="field-group">
              <label htmlFor="phone-input">Phone number</label>
              <input
                id="phone-input"
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setError('') }}
                placeholder="+91 90000 XXXXX"
                autoComplete="tel"
                autoFocus
              />
            </div>

            {error && <p className="api-error" role="alert">{error}</p>}

            <button
              className="button button-primary submit-button"
              type="submit"
              disabled={loading || !phone.trim()}
            >
              {loading ? 'Sending OTP…' : 'Send OTP'}
            </button>

            <div className="demo-accounts">
              <p className="demo-label">Demo accounts</p>
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.phone}
                  type="button"
                  className="demo-account-btn"
                  onClick={() => setPhone(acc.phone)}
                >
                  {acc.label}
                  <span className="demo-phone">{acc.phone}</span>
                </button>
              ))}
              <p className="demo-hint">
                Enter your owner phone number to log in as a pet parent.
              </p>
            </div>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleVerifyOtp} noValidate>
            <p className="otp-sent-note">
              OTP sent to <strong>{phone}</strong>
            </p>

            {demoOtp && (
              <div className="demo-otp-box">
                <span className="demo-otp-label">Demo OTP</span>
                <span className="demo-otp-value">{demoOtp}</span>
                <button
                  type="button"
                  className="demo-otp-fill"
                  onClick={() => setOtp(demoOtp)}
                >
                  Use this OTP
                </button>
              </div>
            )}

            <div className="field-group">
              <label htmlFor="otp-input">Enter OTP</label>
              <input
                id="otp-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => { setOtp(e.target.value); setError('') }}
                placeholder="6-digit code"
                autoFocus
              />
            </div>

            {error && <p className="api-error" role="alert">{error}</p>}

            <button
              className="button button-primary submit-button"
              type="submit"
              disabled={loading || !otp.trim()}
            >
              {loading ? 'Verifying…' : 'Verify OTP'}
            </button>

            <button
              type="button"
              className="button button-secondary submit-button"
              style={{ marginTop: 8 }}
              onClick={() => { setStep('phone'); setOtp(''); setError('') }}
            >
              ← Back
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
