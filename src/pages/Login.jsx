import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'https://restaurant-backend-production-1271.up.railway.app'

export default function Login() {
  const [slug, setSlug] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const navigate = useNavigate()

  const login = async () => {
    if (!slug || !password) return
    setCargando(true)
    setError('')
    try {
      const res = await axios.post(`${API}/locales/login`, { slug, password })
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('local_id', res.data.local_id)
      localStorage.setItem('nombre', res.data.nombre)
     localStorage.setItem('slug', slug)
     window.location.href = window.location.origin + '/dashboard'
    } catch (e) {
      setError('Usuario o contraseña incorrectos')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#1a1a2e', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        background: 'white', borderRadius: 24, padding: 40,
        width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🍽</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1a1a1a' }}>Panel del local</h1>
          <p style={{ margin: '8px 0 0', color: '#888', fontSize: 14 }}>Ingresá con tus datos</p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>
            Nombre del local (slug)
          </label>
          <input
            value={slug}
            onChange={e => setSlug(e.target.value)}
            placeholder="ej: don-carlos"
            style={{
              width: '100%', border: '2px solid #e0e0e0', borderRadius: 12,
              padding: '12px 14px', fontSize: 15, boxSizing: 'border-box', outline: 'none'
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Tu contraseña"
            onKeyDown={e => e.key === 'Enter' && login()}
            style={{
              width: '100%', border: '2px solid #e0e0e0', borderRadius: 12,
              padding: '12px 14px', fontSize: 15, boxSizing: 'border-box', outline: 'none'
            }}
          />
        </div>

        {error && (
          <div style={{ background: '#fff0f0', color: '#d32f2f', padding: '10px 14px', borderRadius: 10, fontSize: 14, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <button onClick={login} disabled={cargando} style={{
          width: '100%', background: '#1D9E75', color: 'white', border: 'none',
          borderRadius: 12, padding: '14px', fontSize: 16, fontWeight: 700,
          cursor: cargando ? 'not-allowed' : 'pointer', opacity: cargando ? 0.7 : 1
        }}>
          {cargando ? 'Ingresando...' : 'Ingresar'}
        </button>
      </div>
    </div>
  )
}