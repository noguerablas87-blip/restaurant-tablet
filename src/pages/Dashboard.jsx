import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'https://restaurant-backend-production-1271.up.railway.app'

const METODO_LABEL = {
  efectivo:  { icon: '💵', label: 'Efectivo' },
  billetera: { icon: '📱', label: 'Tigo Money' },
  tarjeta:   { icon: '💳', label: 'Tarjeta' },
}


// ── Sonidos Web Audio API ─────────────────────────────────────────────────────
let audioCtx = null

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

function sonarPedidoNuevo() {
  try {
    const ctx = getAudioCtx()
    [[0, 880], [0.15, 1100], [0.3, 1320]].forEach(([t, freq]) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.4, ctx.currentTime + t)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.6)
      osc.start(ctx.currentTime + t)
      osc.stop(ctx.currentTime + t + 0.6)
    })
  } catch (e) { console.log('Audio error:', e) }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [pedidos, setPedidos] = useState([])
  const [abierto, setAbierto] = useState(false)
  const [stats, setStats] = useState(null)
  const [localInfo, setLocalInfo] = useState(null)
  const [audioActivado, setAudioActivado] = useState(false)
  const nombre = localStorage.getItem('nombre') || 'Mi local'
  const token = localStorage.getItem('token')
  const local_id = localStorage.getItem('local_id')
  const slug = localStorage.getItem('slug')
  const wsRef = useRef(null)
  const headers = { Authorization: `Bearer ${token}` }

  const activarAudio = () => {
    try {
      const ctx = getAudioCtx()
      ctx.resume().then(() => {
        // Sonar un beep corto de confirmación
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.3)
      })
    } catch(e) {}
    setAudioActivado(true)
  }

  const cargarLocal = async () => {
    try {
      const res = await axios.get(`${API}/locales/mi-local/info`, { headers })
      setAbierto(res.data.abierto)
      setLocalInfo(res.data)
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

  // Cargar info del local (banner, color) desde el menú público
  const [localPublico, setLocalPublico] = useState(null)
  useEffect(() => {
    if (slug) {
      axios.get(`${API}/locales/${slug}`).then(r => setLocalPublico(r.data)).catch(() => {})
    }
  }, [slug])

  useEffect(() => {
    cargarLocal()
    cargarPedidos()
    cargarStats()

    const ws = new WebSocket(`wss://restaurant-backend-production-1271.up.railway.app/pedidos/ws/${local_id}`)
    wsRef.current = ws
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.tipo === 'nuevo_pedido') {
        sonarPedidoNuevo()
        cargarPedidos()
        cargarStats()
      }
    }
    const interval = setInterval(() => {
      cargarPedidos()
      cargarStats()
    }, 15000)

    return () => { ws.close(); clearInterval(interval) }
  }, [])

  const pendientes = pedidos.filter(p => p.estado === 'pendiente')
  const enPreparacion = pedidos.filter(p => p.estado === 'aceptado')
  const color = localPublico?.color_primario || '#b91c1c'
  const banner = localPublico?.banner_url

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── MODAL ACTIVAR SONIDO ── */}
      {!audioActivado && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}>
          <div style={{
            background: 'white', borderRadius: 24, padding: 40,
            textAlign: 'center', maxWidth: 340, width: '100%'
          }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🔔</div>
            <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 800, color: '#1a1a2e' }}>
              Activar notificaciones
            </h2>
            <p style={{ margin: '0 0 28px', fontSize: 15, color: '#666', lineHeight: 1.6 }}>
              Tocá el botón para activar el sonido de alerta cuando llegue un pedido nuevo.
            </p>
            <button
              onClick={activarAudio}
              style={{
                width: '100%', background: '#b91c1c', color: 'white',
                border: 'none', borderRadius: 14, padding: '16px',
                fontSize: 16, fontWeight: 700, cursor: 'pointer'
              }}
            >
              🔔 Activar sonido
            </button>
          </div>
        </div>
      )}

      {/* ── HEADER con banner ── */}
      <div style={{ position: 'relative', overflow: 'hidden', height: 180 }}>
        {banner
          ? <img src={banner} alt="banner" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
          : <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${color} 0%, ${color}99 100%)` }} />
        }
        {/* Gradiente sutil solo abajo */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.65) 100%)' }} />
        
        {/* Barra de navegación arriba */}
        <div style={{ position: 'relative', zIndex: 1, padding: '14px 20px 0', display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={toggleAbierto} style={{
            background: abierto ? '#22c55e' : '#ef4444',
            color: 'white', border: 'none', borderRadius: 20,
            padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}>
            {abierto ? '🟢 Abierto' : '🔴 Cerrado'}
          </button>
          {[
            { label: 'Menú', path: '/menu' },
            { label: 'Mesas', path: '/mesas' },
            { label: 'Estadísticas', path: '/stats' },
          ].map(b => (
            <button key={b.path} onClick={() => navigate(b.path)} style={{
              background: 'rgba(255,255,255,0.2)', color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 20, padding: '7px 14px', fontSize: 12,
              cursor: 'pointer', fontWeight: 600,
              backdropFilter: 'blur(4px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}>{b.label}</button>
          ))}
        </div>

        {/* Nombre del local abajo */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1, padding: '0 20px 16px' }}>
          {localPublico?.logo_url && (
            <img src={localPublico.logo_url} alt="logo" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid white', marginBottom: 6, display: 'block' }} />
          )}
          <h1 style={{ color: 'white', margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.4, textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>{nombre}</h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', margin: '2px 0 0', fontSize: 12 }}>Panel de pedidos</p>
        </div>
      </div>

      {/* ── STATS ── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '14px 16px 0' }}>
          {[
            { label: 'Pedidos hoy', value: stats.pedidos_hoy, emoji: '📋', accent: '#2196F3' },
            { label: 'En preparación', value: stats.en_preparacion, emoji: '👨‍🍳', accent: '#FF9800' },
            { label: 'Total hoy', value: `Gs. ${stats.total_hoy?.toLocaleString()}`, emoji: '💰', accent: '#22c55e' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'white', borderRadius: 14, padding: '14px 12px',
              textAlign: 'center', borderTop: `3px solid ${s.accent}`
            }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{s.emoji}</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#111' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── COLUMNAS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: '14px 16px' }}>

        {/* Pendientes */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#e67e22' }}>⏳ Nuevos</span>
            {pendientes.length > 0 && (
              <span style={{ background: '#e67e22', color: 'white', borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '2px 8px' }}>{pendientes.length}</span>
            )}
          </div>

          {pendientes.length === 0 && (
            <div style={{ background: 'white', borderRadius: 14, padding: '20px', textAlign: 'center', color: '#ccc', fontSize: 13 }}>
              Sin pedidos nuevos
            </div>
          )}

          {pendientes.map(p => (
            <TarjetaPedido key={p.id} p={p} color={color} tipo="pendiente" onAccion={accionPedido} />
          ))}
        </div>

        {/* En preparación */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#2196F3' }}>👨‍🍳 Preparando</span>
            {enPreparacion.length > 0 && (
              <span style={{ background: '#2196F3', color: 'white', borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '2px 8px' }}>{enPreparacion.length}</span>
            )}
          </div>

          {enPreparacion.length === 0 && (
            <div style={{ background: 'white', borderRadius: 14, padding: '20px', textAlign: 'center', color: '#ccc', fontSize: 13 }}>
              Sin pedidos en preparación
            </div>
          )}

          {enPreparacion.map(p => (
            <TarjetaPedido key={p.id} p={p} color={color} tipo="preparando" onAccion={accionPedido} />
          ))}
        </div>
      </div>
    </div>
  )
}

function TarjetaPedido({ p, color, tipo, onAccion }) {
  const borderColor = tipo === 'pendiente' ? '#e67e22' : '#2196F3'
  const metodo = METODO_LABEL[p.metodo_pago] || METODO_LABEL.efectivo

  return (
    <div style={{
      background: 'white', borderRadius: 14, padding: 14,
      marginBottom: 10, borderLeft: `4px solid ${borderColor}`,
      border: `1px solid #efefef`, borderLeftWidth: 4, borderLeftColor: borderColor,
    }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <span style={{ fontWeight: 800, fontSize: 16, color: '#111' }}>
            {p.mesa ? `Mesa ${p.mesa}` : '—'}
          </span>
          {p.nombre_cliente && (
            <span style={{ fontSize: 12, color: '#999', marginLeft: 6 }}>· {p.nombre_cliente}</span>
          )}
        </div>
        <span style={{ fontWeight: 700, color: '#22c55e', fontSize: 15 }}>
          Gs. {parseInt(p.total).toLocaleString()}
        </span>
      </div>

      {/* Items */}
      <div style={{ marginBottom: 8 }}>
        {p.items.map((item, i) => (
          <div key={i} style={{ fontSize: 13, color: '#444', marginBottom: 2, display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontWeight: 600 }}>{item.cantidad}×</span>
            <span>{item.nombre}</span>
            {item.tiempo_prep > 0 && (
              <span style={{ fontSize: 10, color: '#aaa', marginLeft: 2 }}>({item.tiempo_prep} min)</span>
            )}
            {item.nota && <span style={{ color: '#aaa', fontSize: 12 }}>— {item.nota}</span>}
          </div>
        ))}
      </div>

      {/* Nota general */}
      {p.nota_general && (
        <div style={{ fontSize: 12, color: '#888', fontStyle: 'italic', marginBottom: 8, background: '#fafafa', borderRadius: 8, padding: '6px 8px' }}>
          📝 {p.nota_general}
        </div>
      )}

      {/* Método de pago + tiempo */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 8px',
          borderRadius: 20, background: '#f5f5f5', color: '#555'
        }}>
          {metodo.icon} {metodo.label}
        </span>
        {tipo === 'pendiente' && p.tiempo_estimado && (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 8px',
            borderRadius: 20, background: '#fff8e1', color: '#e67e22'
          }}>
            ⏱ ~{p.tiempo_estimado} min estimado
          </span>
        )}
        {tipo === 'preparando' && p.tiempo_restante !== null && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 8px',
            borderRadius: 20,
            background: p.tiempo_restante <= 5 ? '#ffebee' : '#e8f5e9',
            color: p.tiempo_restante <= 5 ? '#e53e3e' : '#22c55e'
          }}>
            ⏱ {p.tiempo_restante} min restantes
          </span>
        )}
      </div>

      {/* Botones */}
      <div style={{ display: 'flex', gap: 8 }}>
        {tipo === 'pendiente' && (
          <>
            <button onClick={() => onAccion(p.id, 'aceptar')} style={{
              flex: 1, background: '#22c55e', color: 'white', border: 'none',
              borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer'
            }}>✓ Aceptar</button>
            <button onClick={() => onAccion(p.id, 'cancelar')} style={{
              flex: 1, background: '#ef4444', color: 'white', border: 'none',
              borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer'
            }}>✗ Rechazar</button>
          </>
        )}
        {tipo === 'preparando' && (
          <>
            <button onClick={() => onAccion(p.id, 'listo')} style={{
              flex: 1, background: '#22c55e', color: 'white', border: 'none',
              borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer'
            }}>🍽 Listo</button>
            <button onClick={() => onAccion(p.id, 'entregar')} style={{
              flex: 1, background: '#8b5cf6', color: 'white', border: 'none',
              borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer'
            }}>✓ Entregar</button>
          </>
        )}
      </div>
    </div>
  )
}
