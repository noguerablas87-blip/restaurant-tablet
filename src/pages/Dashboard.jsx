import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'https://restaurant-backend-production-1271.up.railway.app'

const METODO_LABEL = {
  efectivo:      { icon: '💵', label: 'Efectivo' },
  tarjeta:       { icon: '💳', label: 'Tarjeta' },
  transferencia: { icon: '🏦', label: 'Transferencia' },
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
  const [entregados, setEntregados] = useState([])
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
      if (e.response?.status === 401 || e.response?.status === 403) { localStorage.clear(); navigate('/login') }
    }
  }

  const cargarStats = async () => {
    try {
      const res = await axios.get(`${API}/locales/mi-local/stats/hoy`, { headers })
      setStats(res.data)
    } catch (e) {}
  }

  const cargarEntregados = async () => {
    try {
      const hoy = new Date().toISOString().split('T')[0]
      const res = await axios.get(`${API}/locales/mi-local/reporte?desde=${hoy}&hasta=${hoy}`, { headers })
      setEntregados(res.data.pedidos || [])
    } catch (e) {}
  }

  const cargarLocal = async () => {
    try {
      const res = await axios.get(`${API}/locales/mi-local/info`, { headers })
      setAbierto(res.data.abierto == true)
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
    cargarLocal(); cargarPedidos(); cargarStats(); cargarEntregados()
    const ws = new WebSocket(`wss://restaurant-backend-production-1271.up.railway.app/pedidos/ws/${local_id}`)
    wsRef.current = ws
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.tipo === 'nuevo_pedido') { sonarPedidoNuevo(); cargarPedidos(); cargarStats() }
    }
    const interval = setInterval(() => { cargarPedidos(); cargarStats(); cargarEntregados() }, 5000)
    return () => { ws.close(); clearInterval(interval) }
  }, [])

  const pendientes = pedidos.filter(p => p.estado === 'pendiente')
  const enPreparacion = pedidos.filter(p => p.estado === 'aceptado')
  const color = localPublico?.color_primario || '#b91c1c'
  const banner = localPublico?.banner_url

  const NAV_ITEMS = [
    { label: 'Menú', path: '/menu', icon: '🍽' },
    { label: 'Mesas', path: '/mesas', icon: '🪑' },
    { label: 'Estadísticas', path: '/stats', icon: '📊' },
    { label: 'Delivery', path: '/configuracion', icon: '🛵' },
    { label: 'Mi Local', path: '/mi-local', icon: '🏪' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Segoe UI', system-ui, sans-serif", color: 'white' }}>

      {/* MODAL ACTIVAR SONIDO */}
      {!audioActivado && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', borderRadius: 28, padding: 48, textAlign: 'center', maxWidth: 360, width: '100%', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: `${color}22`, border: `2px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 24px' }}>🔔</div>
            <h2 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 700, color: 'white', letterSpacing: -0.5 }}>Activar notificaciones</h2>
            <p style={{ margin: '0 0 32px', fontSize: 15, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
              Tocá para recibir sonido cuando llegue un pedido nuevo.
            </p>
            <button onClick={activarAudio} style={{ width: '100%', background: color, color: 'white', border: 'none', borderRadius: 16, padding: '16px', fontSize: 16, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.3 }}>
              Activar sonido
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ position: 'relative', overflow: 'hidden', height: 200 }}>
        {banner
          ? <img src={banner} alt="banner" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
          : <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${color}33 0%, #0a0a0f 100%)` }} />
        }
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(10,10,15,0.97) 100%)' }} />

        {/* NAV TOP */}
        <div style={{ position: 'relative', zIndex: 1, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Logo + nombre */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {localPublico?.logo_url && (
              <img src={localPublico.logo_url} alt="logo" style={{ width: 42, height: 42, borderRadius: 12, objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.15)' }} />
            )}
            <div>
              <h1 style={{ color: 'white', margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>{nombre}</h1>
              <p style={{ color: 'rgba(255,255,255,0.35)', margin: 0, fontSize: 11, letterSpacing: 0.5 }}>VALMAI · PANEL</p>
            </div>
          </div>

          {/* Toggle abierto */}
          <button onClick={toggleAbierto} style={{
            background: abierto ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            color: abierto ? '#22c55e' : '#ef4444',
            border: `1px solid ${abierto ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: 20, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: abierto ? '#22c55e' : '#ef4444', display: 'inline-block', marginRight: 6, verticalAlign: 'middle' }} />
            {abierto ? 'Abierto' : 'Cerrado'}
          </button>
        </div>

        {/* NAV ITEMS */}
        <div style={{ position: 'relative', zIndex: 1, padding: '8px 20px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {NAV_ITEMS.map(b => (
            <button key={b.path} onClick={() => navigate(b.path)} style={{
              background: 'rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '7px 14px',
              fontSize: 12, cursor: 'pointer', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 5,
              backdropFilter: 'blur(10px)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'white' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
            >
              <span>{b.icon}</span> {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* STATS */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '12px 16px 0' }}>
          {[
            { label: 'Pedidos hoy', value: stats.pedidos_hoy, color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.15)', path: null },
            { label: 'Preparando', value: stats.en_preparacion, color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.15)', path: null },
            { label: 'Total hoy', value: `${stats.total_hoy?.toLocaleString()} Gs`, color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.15)', path: '/stats' },
          ].map((s) => (
            <div key={s.label} onClick={() => s.path && navigate(s.path)} style={{
              background: s.bg, borderRadius: 14, padding: '14px 12px',
              textAlign: 'center', border: `1px solid ${s.border}`,
              cursor: s.path ? 'pointer' : 'default',
            }}>
              <div style={{ fontWeight: 800, fontSize: 20, color: s.color, letterSpacing: -0.5 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3, letterSpacing: 0.3 }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>
      )}

      {/* COLUMNAS PEDIDOS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '10px 16px 16px' }}>

        {/* NUEVOS */}
        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 8px #fbbf24' }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#fbbf24', letterSpacing: 1.5 }}>NUEVOS</span>
            {pendientes.length > 0 && (
              <span style={{ background: '#fbbf24', color: '#000', borderRadius: 20, fontSize: 10, fontWeight: 800, padding: '2px 8px', marginLeft: 'auto' }}>{pendientes.length}</span>
            )}
          </div>
          <div style={{ padding: '10px 10px' }}>
            {pendientes.length === 0 && (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: 13 }}>Sin pedidos nuevos</div>
            )}
            {pendientes.map(p => <TarjetaPedido key={p.id} p={p} color={color} tipo="pendiente" onAccion={accionPedido} />)}
          </div>
        </div>

        {/* PREPARANDO */}
        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#60a5fa', boxShadow: '0 0 8px #60a5fa' }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#60a5fa', letterSpacing: 1.5 }}>PREPARANDO</span>
            {enPreparacion.length > 0 && (
              <span style={{ background: '#60a5fa', color: '#000', borderRadius: 20, fontSize: 10, fontWeight: 800, padding: '2px 8px', marginLeft: 'auto' }}>{enPreparacion.length}</span>
            )}
          </div>
          <div style={{ padding: '10px 10px' }}>
            {enPreparacion.length === 0 && (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: 13 }}>Sin pedidos en preparación</div>
            )}
            {enPreparacion.map(p => <TarjetaPedido key={p.id} p={p} color={color} tipo="preparando" onAccion={accionPedido} />)}
          </div>
        </div>
      </div>

      {/* ENTREGADOS HOY */}
      {entregados.length > 0 && (
        <div style={{ padding: '0 16px 24px' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: '#34d399', letterSpacing: 1.5 }}>ENTREGADOS HOY</span>
              <span style={{ background: '#34d399', color: '#000', borderRadius: 20, fontSize: 10, fontWeight: 800, padding: '2px 8px', marginLeft: 'auto' }}>{entregados.length}</span>
            </div>
            <div style={{ padding: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
              {entregados.map(p => (
                <div key={p.pedido_id} style={{ background: 'rgba(52,211,153,0.04)', borderRadius: 12, padding: '12px', border: '1px solid rgba(52,211,153,0.1)', borderLeft: '3px solid #34d399' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'white' }}>
                        {p.mesa ? `Mesa ${p.mesa}` : p.tipo === 'delivery' ? '🛵 Delivery' : p.tipo === 'retiro' ? '🏪 Retiro' : '—'}
                      </span>
                      {p.numero_diario && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginLeft: 6 }}>#{p.numero_diario}</span>}
                    </div>
                    <span style={{ fontWeight: 700, color: '#34d399', fontSize: 13 }}>Gs. {p.total?.toLocaleString()}</span>
                  </div>
                  {p.nombre_cliente && <p style={{ margin: '0 0 4px', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>👤 {p.nombre_cliente}</p>}
                  {p.tipo === 'delivery' && p.direccion_entrega && <p style={{ margin: '0 0 4px', fontSize: 11, color: '#fbbf24' }}>📍 {p.direccion_entrega}</p>}
                  {p.telefono_cliente && <p style={{ margin: '0 0 6px', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>📞 {p.telefono_cliente}</p>}
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '6px 8px', marginBottom: 6 }}>
                    {p.items?.map((item, i) => (
                      <p key={i} style={{ margin: '2px 0', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{item.cantidad}× {item.nombre}</p>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                      {p.metodo_pago === 'efectivo' ? '💵' : p.metodo_pago === 'tarjeta' ? '💳' : '🏦'} {p.metodo_pago}
                    </span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>🕐 {p.creado_en}</span>
                  </div>
                  {p.necesita_factura && (
                    <div style={{ marginTop: 6, padding: '4px 8px', background: 'rgba(52,211,153,0.06)', borderRadius: 6, border: '1px solid rgba(52,211,153,0.15)' }}>
                      <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: '#34d399' }}>🧾 Factura solicitada</p>
                      {p.factura_ruc && <p style={{ margin: '1px 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>RUC: {p.factura_ruc}</p>}
                      {p.factura_razon_social && <p style={{ margin: '1px 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{p.factura_razon_social}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TarjetaPedido({ p, color, tipo, onAccion }) {
  const metodo = METODO_LABEL[p.metodo_pago] || METODO_LABEL.efectivo
  const esPendiente = tipo === 'pendiente'
  const accentColor = esPendiente ? '#fbbf24' : '#60a5fa'

  return (
    <div style={{
      borderRadius: 14, padding: 14, marginBottom: 8,
      background: esPendiente ? 'rgba(251,191,36,0.04)' : 'rgba(96,165,250,0.04)',
      border: `1px solid ${esPendiente ? 'rgba(251,191,36,0.12)' : 'rgba(96,165,250,0.12)'}`,
      borderLeft: `3px solid ${accentColor}`,
    }}>

      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'white' }}>
            {p.tipo === 'delivery' ? '🛵 Delivery' : p.tipo === 'retiro' ? '🏪 Retiro' : p.mesa ? `Mesa ${p.mesa}` : '—'}
          </span>
          {p.numero_diario && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginLeft: 6 }}>#{p.numero_diario}</span>}
          {p.nombre_cliente && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 6 }}>· {p.nombre_cliente}</span>}
        </div>
        <span style={{ fontWeight: 800, color: '#34d399', fontSize: 14 }}>
          Gs. {parseInt(p.total).toLocaleString()}
        </span>
      </div>

      {/* Badge delivery/retiro */}
      {p.tipo === 'delivery' && p.direccion_entrega && (
        <div style={{ background: 'rgba(251,191,36,0.08)', borderRadius: 8, padding: '6px 10px', marginBottom: 8, fontSize: 11, color: '#fbbf24', border: '1px solid rgba(251,191,36,0.15)' }}>
          📍 {p.direccion_entrega}{p.telefono_cliente ? ` · 📞 ${p.telefono_cliente}` : ''}
        </div>
      )}
      {p.tipo === 'retiro' && (
        <div style={{ background: 'rgba(52,211,153,0.06)', borderRadius: 8, padding: '6px 10px', marginBottom: 8, fontSize: 11, color: '#34d399', border: '1px solid rgba(52,211,153,0.15)' }}>
          🏪 Para retirar{p.telefono_cliente ? ` · 📞 ${p.telefono_cliente}` : ''}
        </div>
      )}

      {/* Items */}
      <div style={{ marginBottom: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.05)' }}>
        {p.items.map((item, i) => (
          <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: i < p.items.length - 1 ? 5 : 0, display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontWeight: 700, color: 'white', fontSize: 13, minWidth: 20 }}>{item.cantidad}×</span>
            <span>{item.nombre}</span>
            {item.tiempo_prep > 0 && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>({item.tiempo_prep}min)</span>}
            {item.nota && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontStyle: 'italic' }}>· {item.nota}</span>}
          </div>
        ))}
      </div>

      {/* Nota general */}
      {p.nota_general && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', marginBottom: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '6px 10px' }}>
          📝 {p.nota_general}
        </div>
      )}

      {/* Factura */}
      {p.necesita_factura && (
        <div style={{ fontSize: 11, marginBottom: 8, background: 'rgba(52,211,153,0.05)', borderRadius: 8, padding: '8px 10px', border: '1px solid rgba(52,211,153,0.12)' }}>
          <p style={{ margin: '0 0 3px', fontWeight: 700, color: '#34d399', fontSize: 11 }}>🧾 Solicita factura</p>
          {p.factura_ruc && <p style={{ margin: '2px 0', color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>RUC/CI: {p.factura_ruc}</p>}
          {p.factura_razon_social && <p style={{ margin: '2px 0', color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{p.factura_razon_social}</p>}
        </div>
      )}

      {/* Tags */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {metodo.icon} {metodo.label}
        </span>
        {esPendiente && p.tiempo_estimado && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.15)' }}>
            ⏱ ~{p.tiempo_estimado} min
          </span>
        )}
        {!esPendiente && p.tiempo_restante !== null && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
            background: p.tiempo_restante <= 5 ? 'rgba(239,68,68,0.08)' : 'rgba(52,211,153,0.08)',
            color: p.tiempo_restante <= 5 ? '#ef4444' : '#34d399',
            border: `1px solid ${p.tiempo_restante <= 5 ? 'rgba(239,68,68,0.2)' : 'rgba(52,211,153,0.15)'}`,
          }}>
            ⏱ {p.tiempo_restante} min
          </span>
        )}
      </div>

      {/* Botones */}
      <div style={{ display: 'flex', gap: 6 }}>
        {esPendiente && (
          <>
            <button onClick={() => onAccion(p.id, 'aceptar')} style={{ flex: 1, background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, padding: '10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✓ Aceptar</button>
            <button onClick={() => onAccion(p.id, 'cancelar')} style={{ flex: 1, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✗ Rechazar</button>
          </>
        )}
        {!esPendiente && (
          <>
            <button onClick={() => onAccion(p.id, 'listo')} style={{ flex: 1, background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, padding: '10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🍽 Listo</button>
            <button onClick={() => onAccion(p.id, 'entregar')} style={{ flex: 1, background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 10, padding: '10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✓ Entregar</button>
          </>
        )}
      </div>
    </div>
  )
}
