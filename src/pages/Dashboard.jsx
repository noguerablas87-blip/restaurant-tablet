import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'https://restaurant-backend-production-1271.up.railway.app'

export default function Dashboard() {
  const navigate = useNavigate()
  const [pedidos, setPedidos] = useState([])
  const [abierto, setAbierto] = useState(false)
  const [stats, setStats] = useState(null)
  const [nombre] = useState(localStorage.getItem('nombre') || 'Mi local')
  const token = localStorage.getItem('token')
  const local_id = localStorage.getItem('local_id')
  const wsRef = useRef(null)

  const headers = { Authorization: `Bearer ${token}` }

  const cargarLocal = async () => {
    try {
      const res = await axios.get(`${API}/locales/mi-local/info`, { headers })
      setAbierto(res.data.abierto)
    } catch (e) { }
  }

  const cargarPedidos = async () => {
    try {
      const res = await axios.get(`${API}/pedidos/mi-local/activos`, { headers })
      setPedidos(res.data)
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.clear()
        navigate('/login')
      }
    }
  }

  const cargarStats = async () => {
    try {
      const res = await axios.get(`${API}/locales/mi-local/stats/hoy`, { headers })
      setStats(res.data)
    } catch (e) { }
  }

  const toggleAbierto = async () => {
    try {
      await axios.patch(`${API}/locales/mi-local`, { abierto: !abierto }, { headers })
      setAbierto(!abierto)
    } catch (e) { }
  }

  const accionPedido = async (id, accion) => {
    try {
      await axios.patch(`${API}/pedidos/${id}/${accion}`, {}, { headers })
      cargarPedidos()
      cargarStats()
    } catch (e) { }
  }

  useEffect(() => {
    cargarLocal()
    cargarPedidos()
    cargarStats()

    const ws = new WebSocket(`wss://restaurant-backend-production-1271.up.railway.app/pedidos/ws/${local_id}`)
    wsRef.current = ws
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.tipo === 'nuevo_pedido') {
        try { new Audio('https://www.soundjay.com/buttons/beep-01a.mp3').play() } catch (e) { }
        cargarPedidos()
        cargarStats()
      }
    }

    const interval = setInterval(() => {
      cargarPedidos()
      cargarStats()
    }, 15000)

    return () => {
      ws.close()
      clearInterval(interval)
    }
  }, [])

  const pendientes = pedidos.filter(p => p.estado === 'pendiente')
  const enPreparacion = pedidos.filter(p => p.estado === 'aceptado')

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#1a1a2e', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ color: 'white', margin: 0, fontSize: 18, fontWeight: 700 }}>{nombre}</h1>
          <p style={{ color: '#888', margin: 0, fontSize: 12 }}>Panel de pedidos</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={toggleAbierto} style={{
            background: abierto ? '#4CAF50' : '#F44336',
            color: 'white', border: 'none', borderRadius: 20,
            padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer'
          }}>
            {abierto ? '🟢 Abierto' : '🔴 Cerrado'}
          </button>
          <button onClick={() => navigate('/menu')} style={{ background: '#333', color: 'white', border: 'none', borderRadius: 20, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>Menú</button>
          <button onClick={() => navigate('/mesas')} style={{ background: '#333', color: 'white', border: 'none', borderRadius: 20, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>Mesas</button>
          <button onClick={() => navigate('/stats')} style={{ background: '#333', color: 'white', border: 'none', borderRadius: 20, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>Stats</button>
        </div>
      </div>

      {/* Stats rápidas */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: '16px 20px 0' }}>
          {[
            { label: 'Pedidos hoy', value: stats.pedidos_hoy, emoji: '📋' },
            { label: 'En preparación', value: stats.en_preparacion, emoji: '👨‍🍳' },
            { label: 'Total hoy', value: `Gs. ${stats.total_hoy?.toLocaleString()}`, emoji: '💰' },
          ].map(s => (
            <div key={s.label} style={{ background: 'white', borderRadius: 16, padding: '16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 24 }}>{s.emoji}</div>
              <div style={{ fontWeight: 800, fontSize: 20, color: '#1a1a1a' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 20 }}>

        {/* Pedidos pendientes */}
        <div>
          <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#FF9800' }}>
            ⏳ Nuevos ({pendientes.length})
          </h2>
          {pendientes.length === 0 && (
            <div style={{ background: 'white', borderRadius: 16, padding: 20, textAlign: 'center', color: '#aaa' }}>
              Sin pedidos nuevos
            </div>
          )}
          {pendientes.map(p => (
            <div key={p.id} style={{
              background: 'white', borderRadius: 16, padding: 16,
              marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              borderLeft: '4px solid #FF9800'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>Mesa {p.mesa || '—'}</span>
                <span style={{ fontWeight: 700, color: '#1D9E75' }}>Gs. {parseInt(p.total).toLocaleString()}</span>
              </div>
              {p.items.map((item, i) => (
                <div key={i} style={{ fontSize: 13, color: '#555', marginBottom: 2 }}>
                  {item.cantidad}x {item.nombre} {item.nota && <span style={{ color: '#888' }}>({item.nota})</span>}
                </div>
              ))}
              {p.nota_general && <div style={{ fontSize: 12, color: '#888', marginTop: 4, fontStyle: 'italic' }}>📝 {p.nota_general}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => accionPedido(p.id, 'aceptar')} style={{
                  flex: 1, background: '#4CAF50', color: 'white', border: 'none',
                  borderRadius: 10, padding: '10px', fontSize: 14, fontWeight: 700, cursor: 'pointer'
                }}>✓ Aceptar</button>
                <button onClick={() => accionPedido(p.id, 'cancelar')} style={{
                  flex: 1, background: '#F44336', color: 'white', border: 'none',
                  borderRadius: 10, padding: '10px', fontSize: 14, fontWeight: 700, cursor: 'pointer'
                }}>✗ Rechazar</button>
              </div>
            </div>
          ))}
        </div>

        {/* En preparación */}
        <div>
          <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#2196F3' }}>
            👨‍🍳 Preparando ({enPreparacion.length})
          </h2>
          {enPreparacion.length === 0 && (
            <div style={{ background: 'white', borderRadius: 16, padding: 20, textAlign: 'center', color: '#aaa' }}>
              Sin pedidos en preparación
            </div>
          )}
          {enPreparacion.map(p => (
            <div key={p.id} style={{
              background: 'white', borderRadius: 16, padding: 16,
              marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              borderLeft: '4px solid #2196F3'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>Mesa {p.mesa || '—'}</span>
                <span style={{ fontWeight: 700, color: '#1D9E75' }}>Gs. {parseInt(p.total).toLocaleString()}</span>
              </div>
              {p.items.map((item, i) => (
                <div key={i} style={{ fontSize: 13, color: '#555', marginBottom: 2 }}>
                  {item.cantidad}x {item.nombre} {item.nota && <span style={{ color: '#888' }}>({item.nota})</span>}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => accionPedido(p.id, 'listo')} style={{
                  flex: 1, background: '#4CAF50', color: 'white', border: 'none',
                  borderRadius: 10, padding: '10px', fontSize: 14, fontWeight: 700, cursor: 'pointer'
                }}>🍽 Listo</button>
                <button onClick={() => accionPedido(p.id, 'entregar')} style={{
                  flex: 1, background: '#9C27B0', color: 'white', border: 'none',
                  borderRadius: 10, padding: '10px', fontSize: 14, fontWeight: 700, cursor: 'pointer'
                }}>✓ Entregar</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}