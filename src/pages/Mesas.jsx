import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'https://restaurant-backend-production-1271.up.railway.app'
const BASE_URL = 'https://illustrious-macaron-a47aaf.netlify.app'

export default function Mesas() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const slug = localStorage.getItem('slug')
  const headers = { Authorization: `Bearer ${token}` }
  const [mesas, setMesas] = useState([])
  const [cantidad, setCantidad] = useState(1)
  const [cargando, setCargando] = useState(false)
  const [qrSeleccionado, setQrSeleccionado] = useState(null)
  const qrRef = useRef(null)

  const cargar = async () => {
    try {
      const res = await axios.get(`${API}/locales/mi-local/mesas`, { headers })
      setMesas(res.data)
    } catch (e) { }
  }

  useEffect(() => { cargar() }, [])

  const agregarMesas = async () => {
    setCargando(true)
    try {
      await axios.post(`${API}/locales/mi-local/mesas`, { cantidad: parseInt(cantidad) }, { headers })
      setCantidad(1)
      cargar()
    } catch (e) { }
    finally { setCargando(false) }
  }

  const eliminarMesa = async (id) => {
    if (!confirm('¿Eliminar esta mesa?')) return
    try {
      await axios.delete(`${API}/locales/mi-local/mesas/${id}`, { headers })
      cargar()
      setQrSeleccionado(null)
    } catch (e) { }
  }

  const verQR = async (numero) => {
    try {
      const res = await axios.get(`${API}/locales/mi-local/qr/${numero}`, { headers })
      setQrSeleccionado({ numero, qr: res.data.qr_base64, url: `${BASE_URL}/${slug}?mesa=${numero}` })
    } catch (e) { }
  }

  const exportarQR = () => {
    if (!qrSeleccionado) return
    const link = document.createElement('a')
    link.href = `data:image/png;base64,${qrSeleccionado.qr}`
    link.download = `mesa-${qrSeleccionado.numero}-${slug}.png`
    link.click()
  }

  const imprimirQR = () => {
    if (!qrSeleccionado) return
    const ventana = window.open('', '_blank')
    ventana.document.write(`
      <html><body style="text-align:center; font-family:sans-serif; padding:40px;">
        <h2>Mesa ${qrSeleccionado.numero}</h2>
        <p style="font-size:14px; color:#666;">${localStorage.getItem('nombre')}</p>
        <img src="data:image/png;base64,${qrSeleccionado.qr}" style="width:250px;height:250px;" />
        <p style="font-size:12px; color:#888; margin-top:16px;">Escaneá para ver el menú y pedir</p>
      </body></html>
    `)
    ventana.document.close()
    ventana.print()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#1a1a2e', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: '#333', color: 'white', border: 'none', borderRadius: 20, padding: '8px 16px', cursor: 'pointer' }}>← Volver</button>
        <h1 style={{ color: 'white', margin: 0, fontSize: 18 }}>Gestión de mesas</h1>
        <span style={{ color: '#888', fontSize: 13, marginLeft: 8 }}>{mesas.length} mesas configuradas</span>
      </div>

      <div style={{ padding: 20 }}>

        {/* Agregar mesas */}
        <div style={{ background: 'white', borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Agregar mesas</h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 6 }}>¿Cuántas mesas querés agregar?</label>
              <input
                type="number" min="1" max="50"
                value={cantidad}
                onChange={e => setCantidad(e.target.value)}
                style={{ width: '100%', border: '2px solid #e0e0e0', borderRadius: 10, padding: '12px', fontSize: 16, boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
            <button onClick={agregarMesas} disabled={cargando} style={{
              background: '#1D9E75', color: 'white', border: 'none',
              borderRadius: 12, padding: '12px 24px', fontSize: 15,
              fontWeight: 700, cursor: 'pointer', marginTop: 22
            }}>
              {cargando ? 'Agregando...' : '+ Agregar'}
            </button>
          </div>
        </div>

        {/* Lista de mesas */}
        <div style={{ background: 'white', borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Tus mesas</h3>
          {mesas.length === 0 && <p style={{ color: '#aaa', textAlign: 'center' }}>No tenés mesas todavía. Agregá algunas arriba.</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 12 }}>
            {mesas.map(m => (
              <div key={m.id} style={{ position: 'relative' }}>
                <button onClick={() => verQR(m.numero)} style={{
                  width: '100%',
                  background: qrSeleccionado?.numero === m.numero ? '#1D9E75' : '#f0f0f0',
                  color: qrSeleccionado?.numero === m.numero ? 'white' : '#333',
                  border: 'none', borderRadius: 12, padding: '20px 10px',
                  fontSize: 16, fontWeight: 700, cursor: 'pointer',
                  textAlign: 'center'
                }}>
                  🪑<br />Mesa {m.numero}
                </button>
                <button onClick={() => eliminarMesa(m.id)} style={{
                  position: 'absolute', top: -6, right: -6,
                  background: '#F44336', color: 'white', border: 'none',
                  borderRadius: '50%', width: 22, height: 22,
                  fontSize: 12, cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center'
                }}>✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* QR del local seleccionado */}
        {qrSeleccionado && (
          <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>QR — Mesa {qrSeleccionado.numero}</h3>
            <img
              ref={qrRef}
              src={`data:image/png;base64,${qrSeleccionado.qr}`}
              alt={`QR Mesa ${qrSeleccionado.numero}`}
              style={{ width: 200, height: 200, margin: '0 auto 16px', display: 'block' }}
            />
            <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>{qrSeleccionado.url}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={exportarQR} style={{
                background: '#2196F3', color: 'white', border: 'none',
                borderRadius: 12, padding: '12px 24px', fontSize: 15,
                fontWeight: 700, cursor: 'pointer'
              }}>⬇ Descargar QR</button>
              <button onClick={imprimirQR} style={{
                background: '#1D9E75', color: 'white', border: 'none',
                borderRadius: 12, padding: '12px 24px', fontSize: 15,
                fontWeight: 700, cursor: 'pointer'
              }}>🖨 Imprimir QR</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}