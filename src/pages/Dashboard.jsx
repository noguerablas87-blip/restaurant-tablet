import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'https://restaurant-backend-production-1271.up.railway.app'

const METODO_LABEL = {
  efectivo:  { icon: '💵', label: 'Efectivo' },
  billetera: { icon: '📱', label: 'Tigo Money' },
  tarjeta:   { icon: '💳', label: 'Tarjeta' },
}

let audioCtx = null
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

function sonarPedidoNuevo() {
  try {
    const ctx = getAudioCtx()
    const notas = [[0, 880], [0.18, 1100], [0.36, 1320]]
    notas.forEach(function(nota) {
      const t = nota[0], freq = nota[1]
      const osc = ctx.createOscillator(), gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'; osc.frequency.value = freq
      gain.gain.setValueAtTime(0.5, ctx.currentTime + t)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.7)
      osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + 0.7)
    })
  } catch (e) {}
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [pedidos, setPedidos] = useState([])
  const [abierto, setAbierto] = useState(false)
  const [stats, setStats] = useState(null)
  const [localPublico, setLocalPublico] = useState(null)
  const [audioActivado, setAudioActivado] = useState(() => sessionStorage.getItem('audioActivado') === 'true')
  const nombre = localStorage.getItem('nombre') || 'Mi local'
  const token = localStorage.getItem('token')
  const local_id = localStorage.getItem('local_id')
  const slug = localStorage.getItem('slug')
  const wsRef = useRef(null)
  const headers = { Authorization: `Bearer ${token}` }

  const activarAudio = () => {
    try {
      getAudioCtx().resume().then(() => {
        const ctx = getAudioCtx()
        const osc = ctx.createOscillator(), gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'sine'; osc.frequency.value = 880
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3)
      })
    } catch(e) {}
    sessionStorage.setItem('audioActivado', 'true')
    setAudioActivado(true)
  }

  const cargarPedidos = async () => {
    try {
      const res = await axios.get(`${API}/pedidos/mi-local/activos`, { headers })
      setPedidos(res.data)
    } catch (e) {
      if (e.response?.status === 401) { localStorage.clear(); navigate('/login') }
    }
  }

  const cargarStats = async () => {
    try {
      const res = await axios.get(`${API}/locales/mi-local/stats/hoy`, { headers })
      setStats(res.data)
    } catch (e) {}
  }

  const cargarLocal = async () => {
    try {
      const res = await axios.get(`${API}/locales/mi-local/info`, { headers })
      setAbierto(res.data.abierto)
    } catch (e) {}
  }

  const toggleAbierto = async () => {
    try {
      await axios.patch(`${API}/locales/mi-local`, { abierto: !abierto }, { headers })
      setAbierto(!abierto)
    } catch (e) {}
  }

  const accionPedido = async (id, accion) => {
    try {
      await axios.patch(`${API}/pedidos/${id}/${accion}`, {}, { headers })
      cargarPedidos(); cargarStats()
    } catch (e) {
      if (e.response?.status === 400) {
        alert('⚠️ Este pedido fue cancelado por el cliente.')
        cargarPedidos(); cargarStats()
      }
    }
  }

  useEffect(() => {
    if (slug) axios.get(`${API}/locales/${slug}`).then(r => setLocalPublico(r.data)).catch(() => {})
  }, [slug])

  useEffect(() => {
    cargarLocal(); cargarPedidos(); cargarStats()
    const ws = new WebSocket(`wss://restaurant-backend-production-1271.up.railway.app/pedidos/ws/${local_id}`)
    wsRef.current = ws
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.tipo === 'nuevo_pedido') { sonarPedidoNuevo(); cargarPedidos(); cargarStats() }
    }
    const interval = setInterval(() => { cargarPedidos(); cargarStats() }, 5000)
    return () => { ws.close(); clearInterval(interval) }
  }, [])

  const pendientes = pedidos.filter(p => p.estado === 'pendiente')
  const enPreparacion = pedidos.filter(p => p.estado === 'aceptado')
  const color = localPublico?.color_primario || '#b91c1c'
  const banner = localPublico?.banner_url

  return (
    <div style={{ minHeight: '100vh', background: '#111', fontFamily: "'Segoe UI', system-ui, sans-serif", color: 'white' }}>

      {/* ── MODAL ACTIVAR SONIDO ── */}
      {!audioActivado && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#1e1e1e', borderRadius: 24, padding: 40, textAlign: 'center', maxWidth: 340, width: '100%', border: '1px solid #2a2a2a' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🔔</div>
            <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 800, color: 'white' }}>Activar notificaciones</h2>
            <p style={{ margin: '0 0 28px', fontSize: 15, color: '#888', lineHeight: 1.6 }}>
              Tocá para activar el sonido cuando llegue un pedido nuevo.
            </p>
            <button onClick={activarAudio} style={{ width: '100%', background: color, color: 'white', border: 'none', borderRadius: 14, padding: '16px', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
              🔔 Activar sonido
            </button>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{ position: 'relative', overflow: 'hidden', height: 220, borderRadius: '0 0 28px 28px' }}>
        {banner
          ? <img src={banner} alt="banner" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
          : <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${color}88 0%, #111 100%)` }} />
        }
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.85) 100%)' }} />

        {/* Nav */}
        <div style={{ position: 'relative', zIndex: 1, padding: '16px 20px 0', display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={toggleAbierto} style={{
            background: abierto ? '#22c55e' : '#ef4444',
            color: 'white', border: 'none', borderRadius: 20,
            padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}>
            {abierto ? '🟢 Abierto' : '🔴 Cerrado'}
          </button>
          {[{ label: 'Menú', path: '/menu' }, { label: 'Mesas', path: '/mesas' }, { label: 'Estadísticas', path: '/stats' }].map(b => (
            <button key={b.path} onClick={() => navigate(b.path)} style={{
              background: 'rgba(255,255,255,0.2)', color: 'white',
              border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20,
              padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600,
              backdropFilter: 'blur(4px)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}>{b.label}</button>
          ))}
        </div>
                {/* Nombre */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1, padding: '0 24px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
          {localPublico?.logo_url && (
            <img src={localPublico.logo_url} alt="logo" style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.25)', flexShrink: 0 }} />
          )}
          <div>
            <h1 style={{ color: 'white', margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: -0.5, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>{nombre}</h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', margin: '2px 0 0', fontSize: 13 }}>Panel de pedidos · Valmai</p>
          </div>
        </div>
      </div>

      {/* ── STATS ── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '16px 16px 0' }}>
          {[
            { label: 'Pedidos hoy', value: stats.pedidos_hoy, icon: '📋', color: '#3b82f6', path: null },
            { label: 'En preparación', value: stats.en_preparacion, icon: '👨‍🍳', color: '#f59e0b', path: null },
            { label: 'Total hoy', value: `Gs. ${stats.total_hoy?.toLocaleString()}`, icon: '💰', color: '#22c55e', path: '/stats' },
          ].map((s, i) => (
            <div key={s.label} onClick={() => s.path && navigate(s.path)} style={{ background: '#1a1a1a', borderRadius: 18, padding: '16px 12px', textAlign: 'center', border: '1px solid #2a2a2a', cursor: s.path ? 'pointer' : 'default' }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 22, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── COLUMNAS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '12px 16px 24px', minHeight: 'calc(100vh - 320px)' }}>

        {/* Pendientes */}
        <div style={{ background: '#1a1a1a', padding: 16, borderRadius: 20, border: '1px solid #2a2a2a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', letterSpacing: 0.5 }}>NUEVOS</span>
            {pendientes.length > 0 && (
              <span style={{ background: '#f59e0b', color: '#000', borderRadius: 20, fontSize: 11, fontWeight: 800, padding: '2px 8px', marginLeft: 2 }}>{pendientes.length}</span>
            )}
          </div>
          {pendientes.length === 0 && (
            <div style={{ background: '#1a1a1a', borderRadius: 14, padding: '24px', textAlign: 'center', color: '#333', fontSize: 13, border: '1px solid #222' }}>
              Sin pedidos nuevos
            </div>
          )}
          {pendientes.map(p => <TarjetaPedido key={p.id} p={p} color={color} tipo="pendiente" onAccion={accionPedido} />)}
        </div>

        {/* Preparando */}
        <div style={{ background: '#1a1a1a', padding: 16, borderRadius: 20, border: '1px solid #2a2a2a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6', letterSpacing: 0.5 }}>PREPARANDO</span>
            {enPreparacion.length > 0 && (
              <span style={{ background: '#3b82f6', color: 'white', borderRadius: 20, fontSize: 11, fontWeight: 800, padding: '2px 8px', marginLeft: 2 }}>{enPreparacion.length}</span>
            )}
          </div>
          {enPreparacion.length === 0 && (
            <div style={{ background: '#1a1a1a', borderRadius: 14, padding: '24px', textAlign: 'center', color: '#333', fontSize: 13, border: '1px solid #222' }}>
              Sin pedidos en preparación
            </div>
          )}
          {enPreparacion.map(p => <TarjetaPedido key={p.id} p={p} color={color} tipo="preparando" onAccion={accionPedido} />)}
        </div>
      </div>
    </div>
  )
}

function TarjetaPedido({ p, color, tipo, onAccion }) {
  const metodo = METODO_LABEL[p.metodo_pago] || METODO_LABEL.efectivo
  const accentColor = tipo === 'pendiente' ? '#f59e0b' : '#3b82f6'

  return (
    <div style={{
      background: '#1a1a1a', borderRadius: 16, padding: 16,
      marginBottom: 10, border: `1px solid #2a2a2a`,
      borderLeft: `3px solid ${accentColor}`,
    }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <span style={{ fontWeight: 800, fontSize: 18, color: 'white' }}>
            {p.mesa ? `Mesa ${p.mesa}` : '—'}
          </span>
          {p.numero_diario && (
            <span style={{ fontSize: 11, color: '#444', marginLeft: 8 }}>#${p.numero_diario} del día</span>
          )}
          {p.nombre_cliente && (
            <span style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>· {p.nombre_cliente}</span>
          )}
        </div>
        <span style={{ fontWeight: 800, color: '#22c55e', fontSize: 16 }}>
          Gs. {parseInt(p.total).toLocaleString()}
        </span>
      </div>

      {/* Items */}
      <div style={{ marginBottom: 10, background: '#111', borderRadius: 10, padding: '10px 12px' }}>
        {p.items.map((item, i) => (
          <div key={i} style={{ fontSize: 13, color: '#ccc', marginBottom: i < p.items.length - 1 ? 6 : 0, display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>{item.cantidad}×</span>
            <span>{item.nombre}</span>
            {item.tiempo_prep > 0 && <span style={{ fontSize: 10, color: '#444' }}>({item.tiempo_prep}min)</span>}
            {item.nota && <span style={{ color: '#555', fontSize: 12, fontStyle: 'italic' }}>· {item.nota}</span>}
          </div>
        ))}
      </div>

      {/* Nota general */}
      {p.nota_general && (
        <div style={{ fontSize: 12, color: '#888', fontStyle: 'italic', marginBottom: 10, background: '#111', borderRadius: 8, padding: '6px 10px', border: '1px solid #2a2a2a' }}>
          📝 {p.nota_general}
        </div>
      )}

      {/* Tags */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#222', color: '#aaa', border: '1px solid #333' }}>
          {metodo.icon} {metodo.label}
        </span>
        {tipo === 'pendiente' && p.tiempo_estimado && (
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#1a1000', color: '#f59e0b', border: '1px solid #332200' }}>
            ⏱ ~{p.tiempo_estimado} min
          </span>
        )}
        {tipo === 'preparando' && p.tiempo_restante !== null && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
            background: p.tiempo_restante <= 5 ? '#1a0000' : '#001a0a',
            color: p.tiempo_restante <= 5 ? '#ef4444' : '#22c55e',
            border: `1px solid ${p.tiempo_restante <= 5 ? '#330000' : '#003314'}`,
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
              flex: 1, background: '#15803d', color: 'white', border: 'none',
              borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer'
            }}>✓ Aceptar</button>
            <button onClick={() => onAccion(p.id, 'cancelar')} style={{
              flex: 1, background: '#7f1d1d', color: 'white', border: 'none',
              borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer'
            }}>✗ Rechazar</button>
          </>
        )}
        {tipo === 'preparando' && (
          <>
            <button onClick={() => onAccion(p.id, 'listo')} style={{
              flex: 1, background: '#15803d', color: 'white', border: 'none',
              borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer'
            }}>🍽 Listo</button>
            <button onClick={() => onAccion(p.id, 'entregar')} style={{
              flex: 1, background: '#1e3a5f', color: 'white', border: 'none',
              borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer'
            }}>✓ Entregar</button>
          </>
        )}
      </div>
    </div>
  )
}
