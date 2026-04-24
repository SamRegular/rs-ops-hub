import { useState } from 'react'
import { storage } from '../storage/index.js'

export function Login({ onLogin }) {
  const [mode, setMode] = useState('login') // 'login' or 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmMsg, setConfirmMsg] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setConfirmMsg('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        await storage.signUp(email, password)
        setConfirmMsg('Check your email to confirm your account')
        setEmail('')
        setPassword('')
      } else {
        await storage.signIn(email, password)
        onLogin()
      }
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#F5F4F0',
    }}>
      <div style={{
        width: 320,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32,
      }}>
        <img src="/logo.svg" alt="Regular Studio" style={{ height: 36, opacity: 0.9 }} />

        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #14140F' }}>
            <button
              onClick={() => { setMode('login'); setError(''); setConfirmMsg('') }}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '0.85rem',
                fontWeight: mode === 'login' ? 600 : 400,
                border: 'none',
                background: mode === 'login' ? '#14140F' : 'transparent',
                color: mode === 'login' ? '#F5F4F0' : '#14140F',
                cursor: 'pointer',
                borderRadius: 0,
              }}
            >
              Log In
            </button>
            <button
              onClick={() => { setMode('signup'); setError(''); setConfirmMsg('') }}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '0.85rem',
                fontWeight: mode === 'signup' ? 600 : 400,
                border: 'none',
                background: mode === 'signup' ? '#14140F' : 'transparent',
                color: mode === 'signup' ? '#F5F4F0' : '#14140F',
                cursor: 'pointer',
                borderRadius: 0,
              }}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              className="form-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              autoFocus
              required
            />
            <input
              className="form-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              required
            />

            {error && (
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#f87171', textAlign: 'center' }}>
                {error}
              </p>
            )}

            {confirmMsg && (
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#4ade80', textAlign: 'center' }}>
                {confirmMsg}
              </p>
            )}

            <button
              className="btn btn-primary"
              type="submit"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={loading}
            >
              {loading ? 'Loading…' : mode === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          </form>
        </div>

        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--ink-muted)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
          RS OPS HUB · SHARED TEAM DATABASE
        </p>
      </div>
    </div>
  )
}
