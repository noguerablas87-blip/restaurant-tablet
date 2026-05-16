import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'https://restaurant-backend-production-1271.up.railway.app'

export default function Stats() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const nombre = localStorage.getItem('nombre') || 'Mi local'
  const headers = { Authorization: `Bearer ${token}` }

  const hoy = new Date().toISOString().split('T')[0]
  const [desde, setDesde] = useState(hoy)
  const [hasta, setHasta] = useState(hoy)
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [metricasHora, setMetricasHora] = useState([])

  const cargar = async () => {
    setCargando(true)
    try {
      const [reporte, metricas] = await Promise.all([
        axios.get(`${API}/locales/mi-local/reporte?desde=${desde}&hasta=${hasta}`, { headers }),
        axios.get(`${API}/locales/mi-local/metricas-hora?desde=${desde}&hasta=${hasta}`, { headers }),
      ])
      setDatos(reporte.data)
      setMetricasHora(metricas.data)
    } catch (e) { } finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  const generarPDF = async () => {
    if (!datos) return
    setGenerando(true)
    try {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
      document.head.appendChild(script)
      await new Promise(resolve => { script.onload = resolve })

      const { jsPDF } = window.jspdf
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const color = [180, 0, 0]
      const gris = [100, 100, 100]
      const negro = [30, 30, 30]
      let y = 20

      doc.setFillColor(...color)
      doc.rect(0, 0, 210, 35, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text(nombre, 15, 16)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('Reporte de ventas', 15, 24)
      doc.text(`Período: ${desde} al ${hasta}`, 15, 31)

      y = 45

      doc.setTextColor(...negro)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text('Resumen general', 15, y)
      y += 8

      const resumen = datos.resumen
      const cols = [
        { label: 'Total pedidos', value: resumen.total_pedidos.toString() },
        { label: 'Total vendido', value: `Gs. ${resumen.total_general.toLocaleString()}` },
        { label: 'Promedio por pedido', value: resumen.total_pedidos > 0 ? `Gs. ${Math.round(resumen.total_general / resumen.total_pedidos).toLocaleString()}` : 'Gs. 0' },
      ]
      cols.forEach((c, i) => {
        const x = 15 + i * 62
        doc.setFillColor(245, 245, 245)
        doc.roundedRect(x, y, 58, 22, 3, 3, 'F')
        doc.setTextColor(...gris)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(c.label, x + 4, y + 8)
        doc.setTextColor(...color)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(c.value, x + 4, y + 17)
      })
      y += 32

      doc.setTextColor(...negro)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text('Productos más vendidos', 15, y)
      y += 6

      doc.setFillColor(...color)
      doc.rect(15, y, 180, 8, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('Producto', 18, y + 5.5)
      doc.text('Cant.', 120, y + 5.5)
      doc.text('Total vendido', 145, y + 5.5)
      doc.text('% del total', 175, y + 5.5)
      y += 8

      resumen.productos.slice(0, 15).forEach((p, i) => {
        if (i % 2 === 0) {
          doc.setFillColor(250, 250, 250)
          doc.rect(15, y, 180, 7, 'F')
        }
        doc.setTextColor(...negro)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text(p.nombre.slice(0, 35), 18, y + 5)
        doc.text(p.cantidad.toString(), 122, y + 5)
        doc.text(`Gs. ${p.total.toLocaleString()}`, 145, y + 5)
        const pct = resumen.total_general > 0 ? ((p.total / resumen.total_general) * 100).toFixed(1) : '0'
        doc.text(`${pct}%`, 177, y + 5)
        y += 7
        if (y > 260) { doc.addPage(); y = 20 }
      })

      y += 8

      doc.setTextColor(...negro)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text('Detalle de pedidos', 15, y)
      y += 6

      doc.setFillColor(...color)
      doc.rect(15, y, 180, 8, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('#', 18, y + 5.5)
      doc.text('Fecha y hora', 28, y + 5.5)
      doc.text('Mesa', 80, y + 5.5)
      doc.text('Productos', 100, y + 5.5)
      doc.text('Total', 170, y + 5.5)
      y += 8

      datos.pedidos.forEach((p, i) => {
        if (y > 265) { doc.addPage(); y = 20 }
        if (i % 2 === 0) {
          doc.setFillColor(250, 250, 250)
          const h = Math.max(7, p.items.length * 5 + 4)
          doc.rect(15, y, 180, h, 'F')
        }
        doc.setTextColor(...negro)
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'normal')
        doc.text(`#${p.numero_diario || p.pedido_id}`, 18, y + 5)
        doc.text(p.creado_en || '', 28, y + 5)
        doc.text(p.mesa ? `Mesa ${p.mesa}` : '—', 80, y + 5)
        p.items.forEach((item, j) => {
          doc.text(`${item.cantidad}x ${item.nombre.slice(0, 22)}`, 100, y + 5 + j * 5)
        })
        doc.setFont('helvetica', 'bold')
        doc.text(`Gs. ${p.total.toLocaleString()}`, 168, y + 5, { align: 'right' })
        y += Math.max(7, p.items.length * 5 + 4)
      })

      const totalPags = doc.internal.getNumberOfPages()
      for (let i = 1; i <= totalPags; i++) {
        doc.setPage(i)
        doc.setTextColor(...gris)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(`Página ${i} de ${totalPags}`, 105, 290, { align: 'center' })
        doc.text('Generado por Sistema QR Restaurantes', 105, 295, { align: 'center' })
      }

      doc.save(`reporte-${nombre.toLowerCase().replace(/\s/g, '-')}-${desde}-${hasta}.pdf`)
    } catch (e) {
      console.error(e)
      alert('Error al generar el PDF')
    } finally {
      setGenerando(false)
    }
  }

  const inputStyle = {
    border: '1.5px solid #e0e0e0', borderRadius: 10,
    padding: '8px 12px', fontSize: 14, outline: 'none',
    fontFamily: 'inherit', background: '#fafafa',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      <div style={{ background: '#1a1a2e', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: 20, padding: '7px 14px', cursor: 'pointer', fontSize: 13 }}>← Volver</button>
        <h1 style={{ color: 'white', margin: 0, fontSize: 17, fontWeight: 700 }}>Estadísticas y reportes</h1>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        <div style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #efefef' }}>
          <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 11, color: '#aaa', letterSpacing: 1, textTransform: 'uppercase' }}>Período</p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Desde</label>
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Hasta</label>
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={inputStyle} />
            </div>
            <button onClick={cargar} disabled={cargando} style={{ marginTop: 18, background: '#1a1a2e', color: 'white', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              {cargando ? 'Cargando...' : 'Consultar'}
            </button>
          </div>
        </div>

        {datos && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: 'Total pedidos', value: datos.resumen.total_pedidos, emoji: '📋', color: '#2196F3' },
                { label: 'Total vendido', value: `Gs. ${datos.resumen.total_general.toLocaleString()}`, emoji: '💰', color: '#22c55e' },
                { label: 'Promedio', value: datos.resumen.total_pedidos > 0 ? `Gs. ${Math.round(datos.resumen.total_general / datos.resumen.total_pedidos).toLocaleString()}` : 'Gs. 0', emoji: '📊', color: '#e67e22' },
              ].map(s => (
                <div key={s.label} style={{ background: 'white', borderRadius: 14, padding: '14px 12px', textAlign: 'center', borderTop: `3px solid ${s.color}` }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{s.emoji}</div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: '#111' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #efefef' }}>
              <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 13, color: '#111' }}>🏆 Productos más vendidos</p>
              {datos.resumen.productos.length === 0 && <p style={{ color: '#aaa', fontSize: 13 }}>Sin datos</p>}
              {datos.resumen.productos.map((p, i) => {
                const pct = datos.resumen.total_general > 0 ? (p.total / datos.resumen.total_general * 100).toFixed(1) : 0
                return (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{i + 1}. {p.nombre}</span>
                      <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 700 }}>Gs. {p.total.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, background: '#f0f0f0', borderRadius: 4, height: 6 }}>
                        <div style={{ background: '#b91c1c', borderRadius: 4, height: 6, width: `${pct}%` }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#aaa', minWidth: 60 }}>{p.cantidad} uds · {pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #efefef' }}>
              <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 13, color: '#111' }}>📋 Detalle de pedidos ({datos.pedidos.length})</p>
              {datos.pedidos.length === 0 && <p style={{ color: '#aaa', fontSize: 13 }}>Sin pedidos en este período</p>}
              {datos.pedidos.map(p => (
                <div key={p.pedido_id} style={{ padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>#{p.numero_diario || p.pedido_id}</span>
                      {p.mesa && <span style={{ fontSize: 12, color: '#888', marginLeft: 6 }}>Mesa {p.mesa}</span>}
                      {p.nombre_cliente && <span style={{ fontSize: 12, color: '#888', marginLeft: 6 }}>· {p.nombre_cliente}</span>}
                    </div>
                    <span style={{ fontWeight: 700, color: '#22c55e', fontSize: 13 }}>Gs. {p.total.toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#aaa', marginBottom: 2 }}>🕐 {p.creado_en}</div>
                  <div style={{ fontSize: 12, color: '#555' }}>
                    {p.items.map((item, i) => (
                      <span key={i}>{item.cantidad}× {item.nombre}{i < p.items.length - 1 ? ', ' : ''}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Métricas por hora */}
            {metricasHora.length > 0 && (() => {
              const maxPedidos = Math.max(...metricasHora.map(h => h.pedidos), 1)
              const horasPico = [...metricasHora].sort((a, b) => b.pedidos - a.pedidos).slice(0, 3).filter(h => h.pedidos > 0)
              return (
                <div style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #efefef' }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 13, color: '#111' }}>⏰ Ventas por hora</p>
                  <p style={{ margin: '0 0 14px', fontSize: 12, color: '#aaa' }}>
                    {horasPico.length > 0 ? `Horas pico: ${horasPico.map(h => `${h.hora}:00`).join(', ')}` : 'Sin datos suficientes'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80, paddingBottom: 4 }}>
                    {metricasHora.map(h => {
                      const altura = h.pedidos > 0 ? Math.max(8, (h.pedidos / maxPedidos) * 72) : 3
                      const esPico = horasPico.some(hp => hp.hora === h.hora)
                      return (
                        <div key={h.hora} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                          <div style={{ width: '100%', background: esPico ? '#b91c1c' : '#e0e0e0', borderRadius: '3px 3px 0 0', height: altura }} />
                          <span style={{ fontSize: 9, color: '#aaa', marginTop: 3 }}>{h.hora}</span>
                        </div>
                      )
                    })}
                  </div>
                  {horasPico.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      {horasPico.map(h => (
                        <div key={h.hora} style={{ background: '#fff5f5', borderRadius: 10, padding: '6px 12px', border: '1px solid #fecaca' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c' }}>{h.hora}:00</span>
                          <span style={{ fontSize: 11, color: '#888', marginLeft: 6 }}>{h.pedidos} pedidos · Gs. {h.total.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}

            <button onClick={generarPDF} disabled={generando} style={{
              width: '100%', background: generando ? '#ccc' : '#b91c1c',
              color: 'white', border: 'none', borderRadius: 14,
              padding: '16px', fontSize: 15, fontWeight: 700,
              cursor: generando ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}>
              {generando ? '⏳ Generando PDF...' : '⬇ Descargar reporte PDF'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
