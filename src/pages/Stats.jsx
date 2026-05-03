import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'https://restaurant-backend-production-1271.up.railway.app'

export default function Stats() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }
  const [stats, setStats] = useState(null)

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await axios.get(`${API}/locales/mi-local/stats/hoy`, { headers })
        setStats(res.data)
      } catch (e) { }
    }
    cargar()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#1a1a2e', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: '#333', color: 'white', border: 'none', borderRadius: 20, padding: '8px 16px', cursor: 'pointer' }}>← Volver</button>
        <h1 style={{ color: 'white', margin: 0, fontSize: 18 }}>Estadísticas de hoy</h1>
      </div>

      <div style={{ padding: 20 }}>
        {!stats ? (
          <p style={{ textAlign: 'center', color: '#888' }}>Cargando...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { label: 'Pedidos hoy', value: stats.pedidos_hoy, emoji: '📋', color: '#2196F3' },
              { label: 'En preparación', value: stats.en_preparacion, emoji: '👨‍🍳', color: '#FF9800' },
              { label: 'Entregados', value: stats.entregados, emoji: '✅', color: '#4CAF50' },
              { label: 'Total del día', value: `Gs. ${stats.total_hoy?.toLocaleString()}`, emoji: '💰', color: '#1D9E75' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'white', borderRadius: 20, padding: 24,
                textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                borderTop: `4px solid ${s.color}`
              }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>{s.emoji}</div>
                <div style={{ fontWeight: 800, fontSize: 28, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}