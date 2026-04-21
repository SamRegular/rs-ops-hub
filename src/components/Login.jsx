import { useState } from 'react'

const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD || 'regularstudio'

export function Login({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (password === APP_PASSWORD) {
      localStorage.setItem('rs_auth', '1')
      onLogin()
    } else {
      setError(true)
      setPassword('')
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg)',
    }}>
      <div style={{
        width: 320,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32,
      }}>
        <img src="/logo.svg" alt="Regular Studio" style={{ height: 36, opacity: 0.9 }} />

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            className="form-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(false) }}
            autoFocus
            style={{ textAlign: 'center', letterSpacing: '0.1em' }}
          />
          {error && (
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--error, #f87171)', textAlign: 'center' }}>
              Incorrect password
            </p>
          )}
          <button className="btn btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center' }}>
            Enter
          </button>
        </form>

        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--ink-muted)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
          RS OPS HUB · INTERNAL USE ONLY
        </p>
      </div>
    </div>
  )
}
