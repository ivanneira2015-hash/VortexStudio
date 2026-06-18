import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { loginUser } from '../api/client'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token, user } = await loginUser(email, password)
      login(token, user)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="bg-background"
      style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div style={{ width: '100%', maxWidth: '24rem' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-on-primary" style={{ fontSize: 18 }}>auto_awesome</span>
            </div>
            <span className="text-on-surface" style={{ fontSize: '1.25rem', fontWeight: 700 }}>Vortex Studio</span>
          </div>
          <p className="text-on-surface" style={{ fontSize: '0.875rem', opacity: 0.6 }}>Generá apps con IA</p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-surface border border-outline-variant"
          style={{ borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <h2 className="text-on-surface" style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            Iniciar sesión
          </h2>

          {error && (
            <div style={{ background: 'rgba(186,26,26,0.12)', border: '1px solid rgba(186,26,26,0.3)', borderRadius: '0.5rem', padding: '0.625rem 0.75rem' }}>
              <p style={{ color: '#ff5449', fontSize: '0.875rem', margin: 0 }}>{error}</p>
            </div>
          )}

          <div>
            <label className="text-on-surface" style={{ display: 'block', fontSize: '0.8125rem', opacity: 0.7, marginBottom: '0.375rem' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="tu@email.com"
              className="bg-surface-container text-on-surface border border-outline-variant"
              style={{ display: 'block', width: '100%', boxSizing: 'border-box', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem', outline: 'none' }}
            />
          </div>

          <div>
            <label className="text-on-surface" style={{ display: 'block', fontSize: '0.8125rem', opacity: 0.7, marginBottom: '0.375rem' }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="bg-surface-container text-on-surface border border-outline-variant"
              style={{ display: 'block', width: '100%', boxSizing: 'border-box', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem', outline: 'none' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-on-primary"
            style={{ display: 'block', width: '100%', boxSizing: 'border-box', borderRadius: '0.5rem', padding: '0.625rem', fontSize: '0.875rem', fontWeight: 500, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s' }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>

          <p className="text-on-surface" style={{ textAlign: 'center', fontSize: '0.8125rem', opacity: 0.6, margin: 0 }}>
            ¿No tenés cuenta?{' '}
            <Link to="/register" className="text-primary" style={{ fontWeight: 500, textDecoration: 'none' }}>
              Registrate
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
