import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'https://restaurant-backend-production-1271.up.railway.app'
const CLOUDINARY_CLOUD = 'dmunelwl2'
const CLOUDINARY_PRESET = 'restaurante_menu'

export default function Menu() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }
  const [categorias, setCategorias] = useState([])
  const [nuevaCat, setNuevaCat] = useState('')
  const [nuevoProducto, setNuevoProducto] = useState({ nombre: '', precio: '', descripcion: '', categoria_id: '', imagen_url: '' })
  const [mostrarFormProd, setMostrarFormProd] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [preview, setPreview] = useState(null)

  const cargar = async () => {
    try {
      const res = await axios.get(`${API}/menu/${localStorage.getItem('slug') || 'don-carlos'}`)
      setCategorias(res.data.categorias)
    } catch (e) { }
  }

  useEffect(() => { cargar() }, [])

  const subirFoto = async (archivo) => {
    setSubiendo(true)
    try {
      const formData = new FormData()
      formData.append('file', archivo)
      formData.append('upload_preset', CLOUDINARY_PRESET)
      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
        formData
      )
      setNuevoProducto(prev => ({ ...prev, imagen_url: res.data.secure_url }))
      setPreview(res.data.secure_url)
    } catch (e) {
      alert('Error al subir la imagen')
    } finally {
      setSubiendo(false)
    }
  }

  const crearCategoria = async () => {
    if (!nuevaCat) return
    try {
      await axios.post(`${API}/menu/categorias`, { nombre: nuevaCat, orden: 0 }, { headers })
      setNuevaCat('')
      cargar()
    } catch (e) { }
  }

  const crearProducto = async () => {
    if (!nuevoProducto.nombre || !nuevoProducto.precio || !nuevoProducto.categoria_id) return
    try {
      await axios.post(`${API}/menu/productos`, {
        ...nuevoProducto,
        precio: parseFloat(nuevoProducto.precio),
        categoria_id: parseInt(nuevoProducto.categoria_id)
      }, { headers })
      setNuevoProducto({ nombre: '', precio: '', descripcion: '', categoria_id: '', imagen_url: '' })
      setPreview(null)
      setMostrarFormProd(false)
      cargar()
    } catch (e) { }
  }

  const toggleDisponible = async (id, disponible) => {
    try {
      await axios.patch(`${API}/menu/productos/${id}`, { disponible: !disponible }, { headers })
      cargar()
    } catch (e) { }
  }

  const eliminarProducto = async (id) => {
    if (!confirm('¿Eliminar este producto?')) return
    try {
      await axios.delete(`${API}/menu/productos/${id}`, { headers })
      cargar()
    } catch (e) { }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#1a1a2e', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: '#333', color: 'white', border: 'none', borderRadius: 20, padding: '8px 16px', cursor: 'pointer' }}>← Volver</button>
        <h1 style={{ color: 'white', margin: 0, fontSize: 18 }}>Gestión del menú</h1>
      </div>

      <div style={{ padding: 20 }}>

        {/* Nueva categoría */}
        <div style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Nueva categoría</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={nuevaCat} onChange={e => setNuevaCat(e.target.value)}
              placeholder="Ej: Lomitos, Bebidas, Postres"
              style={{ flex: 1, border: '2px solid #e0e0e0', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none' }} />
            <button onClick={crearCategoria} style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, cursor: 'pointer' }}>+ Agregar</button>
          </div>
        </div>

        {/* Nuevo producto */}
        <div style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: mostrarFormProd ? 12 : 0 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Nuevo producto</h3>
            <button onClick={() => { setMostrarFormProd(!mostrarFormProd); setPreview(null) }} style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: 10, padding: '8px 16px', cursor: 'pointer' }}>
              {mostrarFormProd ? '✕ Cancelar' : '+ Agregar producto'}
            </button>
          </div>
          {mostrarFormProd && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <select value={nuevoProducto.categoria_id} onChange={e => setNuevoProducto({ ...nuevoProducto, categoria_id: e.target.value })}
                style={{ border: '2px solid #e0e0e0', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none', gridColumn: '1/-1' }}>
                <option value="">Seleccioná una categoría</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <input value={nuevoProducto.nombre} onChange={e => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })}
                placeholder="Nombre del producto"
                style={{ border: '2px solid #e0e0e0', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none' }} />
              <input value={nuevoProducto.precio} onChange={e => setNuevoProducto({ ...nuevoProducto, precio: e.target.value })}
                placeholder="Precio en Gs." type="number"
                style={{ border: '2px solid #e0e0e0', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none' }} />
              <input value={nuevoProducto.descripcion} onChange={e => setNuevoProducto({ ...nuevoProducto, descripcion: e.target.value })}
                placeholder="Descripción (opcional)"
                style={{ border: '2px solid #e0e0e0', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none', gridColumn: '1/-1' }} />

              {/* Subida de foto */}
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 8 }}>
                  Foto del producto
                </label>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <label style={{
                    background: '#f0f0f0', border: '2px dashed #ccc', borderRadius: 12,
                    padding: '16px 24px', cursor: 'pointer', fontSize: 14, color: '#555',
                    display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0
                  }}>
                    📷 {subiendo ? 'Subiendo...' : 'Sacar foto / Galería'}
                    <input type="file" accept="image/*" capture="environment"
                      style={{ display: 'none' }}
                      onChange={e => e.target.files[0] && subirFoto(e.target.files[0])} />
                  </label>
                  {preview && (
                    <div style={{ position: 'relative' }}>
                      <img src={preview} alt="preview" style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover' }} />
                      <button onClick={() => { setPreview(null); setNuevoProducto(prev => ({ ...prev, imagen_url: '' })) }}
                        style={{ position: 'absolute', top: -6, right: -6, background: '#F44336', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12 }}>✕</button>
                    </div>
                  )}
                </div>
              </div>

              <button onClick={crearProducto} disabled={subiendo} style={{
                gridColumn: '1/-1', background: subiendo ? '#ccc' : '#1D9E75',
                color: 'white', border: 'none', borderRadius: 10,
                padding: '12px', fontSize: 15, fontWeight: 700, cursor: 'pointer'
              }}>
                Guardar producto
              </button>
            </div>
          )}
        </div>

        {/* Lista de productos */}
        {categorias.map(cat => (
          <div key={cat.id} style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#1a1a1a' }}>{cat.nombre}</h3>
            {cat.productos.length === 0 && <p style={{ color: '#aaa', fontSize: 13 }}>Sin productos todavía</p>}
            {cat.productos.map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                borderBottom: '1px solid #f0f0f0', opacity: p.disponible ? 1 : 0.5
              }}>
                {p.imagen_url
                  ? <img src={p.imagen_url} alt={p.nombre} style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 56, height: 56, borderRadius: 10, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🍽</div>
                }
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{p.nombre}</p>
                  {p.descripcion && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>{p.descripcion}</p>}
                  <p style={{ margin: '4px 0 0', fontWeight: 700, color: '#1D9E75', fontSize: 15 }}>Gs. {parseInt(p.precio).toLocaleString()}</p>
                </div>
                <button onClick={() => toggleDisponible(p.id, p.disponible)} style={{
                  background: p.disponible ? '#E8F5E9' : '#FFEBEE',
                  color: p.disponible ? '#2E7D32' : '#C62828',
                  border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                }}>
                  {p.disponible ? '✓ Disponible' : '✗ Agotado'}
                </button>
                <button onClick={() => eliminarProducto(p.id)} style={{
                  background: '#fff0f0', color: '#F44336', border: 'none',
                  borderRadius: 8, padding: '6px 10px', fontSize: 16, cursor: 'pointer'
                }}>🗑</button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}