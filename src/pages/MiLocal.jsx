import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'https://restaurant-backend-production-1271.up.railway.app'
const CLOUDINARY_CLOUD = 'dmunelwl2'
const CLOUDINARY_PRESET = 'restaurante_menu'

export default function MiLocal() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }

  const [local, setLocal] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState({ logo: false, banner: false })
  const [guardado, setGuardado] = useState(false)
  const [horarioApertura, setHorarioApertura] = useState('')
  const [horarioCierre, setHorarioCierre] = useState('')
  const [diasActivos, setDiasActivos] = useState([1,2,3,4,5,6,7])
  const [horarioAutomatico, setHorarioAutomatico] = useState(false)

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await axios.get(`${API}/locales/mi-local/info`, { headers })
        setLocal(res.data)
        if (res.data.horario_apertura) setHorarioApertura(res.data.horario_apertura)
        if (res.data.horario_cierre) setHorarioCierre(res.data.horario_cierre)
        if (res.data.dias_activos) setDiasActivos(res.data.dias_activos.split(',').map(Number))
        if (res.data.horario_automatico !== undefined) setHorarioAutomatico(res.data.horario_automatico)
      } catch (e) {
        if (e.response?.status === 401) { localStorage.clear(); navigate('/login') }
      }
    }
    cargar()
  }, [])

  const subirImagen = async (archivo, tipo) => {
    setSubiendo(prev => ({ ...prev, [tipo]: true }))
    try {
      const formData = new FormData()
      formData.append('file', archivo)
      formData.append('upload_preset', CLOUDINARY_PRESET)
      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
        formData
      )
      setLocal(prev => ({ ...prev, [`${tipo}_url`]: res.data.secure_url }))
    } catch (e) {
      alert('Error al subir imagen')
    } finally {
      setSubiendo(prev => ({ ...prev, [tipo]: false }))
    }
  }

  const guardar = async () => {
    setGuardando(true)
    try {
      await axios.patch(`${API}/locales/mi-local`, {
        nombre: local.nombre,
        descripcion: local.descripcion,
        color_primario: local.color_primario,
        tiempo_prep_min: local.tiempo_prep_min,
        logo_url: local.logo_url,
        banner_url: local.banner_url,
        horario_apertura: horarioApertura || null,
        horario_cierre: horarioCierre || null,
        dias_activos: diasActivos.join(','),
        horario_automatico: horarioAutomatico,
      }, { headers })
      setGuardado(true)
      setTimeout(() => setGuardado(false), 3000)
    } catch (e) {
      alert('Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const quitarImagen = (tipo) => {
    setLocal(prev => ({ ...prev, [`${tipo}_url`]: null }))
  }

  if (!local) return (
    <div style={{ minHeight: '100vh', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#555' }}>Cargando...</p>
    </div>
  )

  const color = local.color_primario || '#1D9E75'

  return (
    <div style={{ minHeight: '100vh', background: '#111', fontFamily: "'Segoe UI', system-ui, sans-serif", color: 'white' }}>

      {/* Header */}
      <div style={{ background: '#1a1a2e', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: 20, padding: '7px 14px', cursor: 'pointer', fontSize: 13 }}>← Volver</button>
        <h1 style={{ color: 'white', margin: 0, fontSize: 17, fontWeight: 700 }}>🏪 Mi Local</h1>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 600, margin: '0 auto' }}>

        {/* Preview */}
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #2a2a2a' }}>
          <div style={{
            height: 120,
            background: local.banner_url ? `url(${local.banner_url}) center/cover` : `linear-gradient(135deg, ${color}88, #111)`,
            position: 'relative',
            display: 'flex', alignItems: 'flex-end', padding: 16
          }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.7))' }} />
            {local.logo_url && (
              <img src={local.logo_url} style={{ width: 52, height: 52, borderRadius: 12, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)', position: 'relative', zIndex: 1 }} />
            )}
            <div style={{ position: 'relative', zIndex: 1, marginLeft: local.logo_url ? 12 : 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: 'white' }}>{local.nombre}</p>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{local.descripcion}</p>
            </div>
          </div>
        </div>

        {/* Información básica */}
        <div style={{ background: '#1e1e1e', borderRadius: 14, padding: 16, border: '1px solid #2a2a2a' }}>
          <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: 13, color: color }}>📝 Información básica</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Nombre del local</label>
              <input
                value={local.nombre || ''}
                onChange={e => setLocal({ ...local, nombre: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', background: '#111', border: '1.5px solid #333', borderRadius: 10, padding: '10px 12px', fontSize: 14, color: 'white', outline: 'none', fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Descripción</label>
              <input
                value={local.descripcion || ''}
                onChange={e => setLocal({ ...local, descripcion: e.target.value })}
                placeholder="Ej: Las mejores pizzas de Asunción"
                style={{ width: '100%', boxSizing: 'border-box', background: '#111', border: '1.5px solid #333', borderRadius: 10, padding: '10px 12px', fontSize: 14, color: 'white', outline: 'none', fontFamily: 'inherit' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Color principal</label>
                <input
                  type="color"
                  value={local.color_primario || '#1D9E75'}
                  onChange={e => setLocal({ ...local, color_primario: e.target.value })}
                  style={{ width: '100%', height: 44, border: '1.5px solid #333', borderRadius: 10, cursor: 'pointer', background: '#111' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Tiempo de prep. (min)</label>
                <input
                  type="number"
                  value={local.tiempo_prep_min || 15}
                  onChange={e => setLocal({ ...local, tiempo_prep_min: parseInt(e.target.value) })}
                  style={{ width: '100%', boxSizing: 'border-box', background: '#111', border: '1.5px solid #333', borderRadius: 10, padding: '10px 12px', fontSize: 14, color: 'white', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
            </div>
          </div>
        </div>
        {/* Horario */}
        <div style={{ background: '#1e1e1e', borderRadius: 14, padding: 16, border: '1px solid #2a2a2a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: color }}>🕐 Horario de atención</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#666' }}>Automático</span>
              <div onClick={() => setHorarioAutomatico(!horarioAutomatico)} style={{
                width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                background: horarioAutomatico ? color : '#333', position: 'relative', transition: 'background 0.2s'
              }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: horarioAutomatico ? 23 : 3, transition: 'left 0.2s' }} />
              </div>
            </div>
          </div>
          {horarioAutomatico && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Apertura</label>
                  <input type="time" value={horarioApertura} onChange={e => setHorarioApertura(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', background: '#111', border: '1.5px solid #333', borderRadius: 10, padding: '10px 12px', fontSize: 14, color: 'white', outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Cierre</label>
                  <input type="time" value={horarioCierre} onChange={e => setHorarioCierre(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', background: '#111', border: '1.5px solid #333', borderRadius: 10, padding: '10px 12px', fontSize: 14, color: 'white', outline: 'none', fontFamily: 'inherit' }} />
                </div>
              </div>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 8 }}>Días de atención</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[{n:1,l:'Lun'},{n:2,l:'Mar'},{n:3,l:'Mié'},{n:4,l:'Jue'},{n:5,l:'Vie'},{n:6,l:'Sáb'},{n:7,l:'Dom'}].map(d => (
                  <button key={d.n} onClick={() => setDiasActivos(prev => prev.includes(d.n) ? prev.filter(x => x !== d.n) : [...prev, d.n])}
                    style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                      background: diasActivos.includes(d.n) ? color : '#2a2a2a',
                      color: diasActivos.includes(d.n) ? 'white' : '#555' }}>
                    {d.l}
                  </button>
                ))}
              </div>
              <p style={{ margin: '10px 0 0', fontSize: 12, color: '#555' }}>El local abrirá y cerrará automáticamente según este horario.</p>
            </>
          )}
          {!horarioAutomatico && (
            <p style={{ margin: 0, fontSize: 13, color: '#555' }}>Activá el horario automático para que el local abra y cierre solo. Si está desactivado, podés controlarlo manualmente desde el dashboard.</p>
          )}
        </div>

       

        {/* Logo */}
        <div style={{ background: '#1e1e1e', borderRadius: 14, padding: 16, border: '1px solid #2a2a2a' }}>
          <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: 13, color: color }}>🖼 Logo del local</p>
          {local.logo_url ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src={local.logo_url} style={{ width: 70, height: 70, borderRadius: 12, objectFit: 'cover', border: '1px solid #333' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                <label style={{ background: '#2a2a2a', border: '1.5px solid #333', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontSize: 13, color: '#aaa', display: 'flex', alignItems: 'center', gap: 8 }}>
                  📷 Cambiar logo
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && subirImagen(e.target.files[0], 'logo')} />
                </label>
                <button onClick={() => quitarImagen('logo')} style={{ background: '#1a0000', border: '1px solid #330000', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 12, color: '#ef4444' }}>
                  🗑 Quitar logo
                </button>
              </div>
            </div>
          ) : (
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#111', border: '2px dashed #333', borderRadius: 12, padding: '24px', cursor: 'pointer', fontSize: 14, color: '#555' }}>
              {subiendo.logo ? '⏳ Subiendo...' : '📷 Subir logo'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && subirImagen(e.target.files[0], 'logo')} />
            </label>
          )}
        </div>

        {/* Banner */}
        <div style={{ background: '#1e1e1e', borderRadius: 14, padding: 16, border: '1px solid #2a2a2a' }}>
          <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: 13, color: color }}>🖼 Banner / foto de portada</p>
          {local.banner_url ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <img src={local.banner_url} style={{ width: '100%', height: 120, borderRadius: 10, objectFit: 'cover', border: '1px solid #333' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <label style={{ flex: 1, background: '#2a2a2a', border: '1.5px solid #333', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontSize: 13, color: '#aaa', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  📷 Cambiar banner
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && subirImagen(e.target.files[0], 'banner')} />
                </label>
                <button onClick={() => quitarImagen('banner')} style={{ background: '#1a0000', border: '1px solid #330000', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 12, color: '#ef4444' }}>
                  🗑 Quitar
                </button>
              </div>
            </div>
          ) : (
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#111', border: '2px dashed #333', borderRadius: 12, padding: '24px', cursor: 'pointer', fontSize: 14, color: '#555' }}>
              {subiendo.banner ? '⏳ Subiendo...' : '📷 Subir foto de portada'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && subirImagen(e.target.files[0], 'banner')} />
            </label>
          )}
        </div>

        {/* Botón guardar */}
        <button onClick={guardar} disabled={guardando} style={{
          width: '100%', background: guardado ? '#15803d' : guardando ? '#333' : color,
          color: guardando ? '#666' : 'white', border: 'none', borderRadius: 14,
          padding: '16px', fontSize: 15, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer',
          transition: 'background 0.3s'
        }}>
          {guardado ? '✅ ¡Guardado!' : guardando ? 'Guardando...' : '💾 Guardar cambios'}
        </button>

      </div>
    </div>
  )
}
