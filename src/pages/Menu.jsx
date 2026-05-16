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
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: '', precio: '', descripcion: '',
    categoria_id: '', imagen_url: '', tiempo_prep: '10'
  })
  const [mostrarFormProd, setMostrarFormProd] = useState(false)
  const [editando, setEditando] = useState(null)
  const [previewEdicion, setPreviewEdicion] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [preview, setPreview] = useState(null)

  const cargar = async () => {
    try {
      const res = await axios.get(`${API}/menu/${localStorage.getItem('slug') || 'don-carlos'}`)
      const cats = res.data.categorias.map(cat => ({
        ...cat,
        productos: cat.productos.filter(p => !p.eliminado)
      }))
      setCategorias(cats)
    } catch (e) { }
  }

  useEffect(() => { cargar() }, [])

  const subirFoto = async (archivo) => {
    setSubiendo(true)
    try {
      const formData = new FormData()
      formData.append('file', archivo)
      formData.append('upload_preset', CLOUDINARY_PRESET)
      const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, formData)
      setNuevoProducto(prev => ({ ...prev, imagen_url: res.data.secure_url }))
      setPreview(res.data.secure_url)
    } catch (e) {
      alert('Error al subir la imagen')
    } finally {
      setSubiendo(false)
    }
  }

  const subirFotoEdicion = async (archivo) => {
    setSubiendo(true)
    try {
      const formData = new FormData()
      formData.append('file', archivo)
      formData.append('upload_preset', CLOUDINARY_PRESET)
      const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, formData)
      setEditando(prev => ({ ...prev, imagen_url: res.data.secure_url }))
      setPreviewEdicion(res.data.secure_url)
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
        categoria_id: parseInt(nuevoProducto.categoria_id),
        tiempo_prep: parseInt(nuevoProducto.tiempo_prep) || 10,
      }, { headers })
      setNuevoProducto({ nombre: '', precio: '', descripcion: '', categoria_id: '', imagen_url: '', tiempo_prep: '10' })
      setPreview(null)
      setMostrarFormProd(false)
      cargar()
    } catch (e) { }
  }

  const editarProducto = async () => {
    if (!editando) return
    try {
      await axios.patch(`${API}/menu/productos/${editando.id}`, {
        nombre: editando.nombre,
        precio: parseFloat(editando.precio),
        descripcion: editando.descripcion,
        tiempo_prep: parseInt(editando.tiempo_prep) || 10,
        imagen_url: editando.imagen_url || null,
      }, { headers })
      setEditando(null)
      setPreviewEdicion(null)
      cargar()
    } catch (e) { alert('Error al guardar') }
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

  const inputStyle = {
    border: '1.5px solid #e0e0e0', borderRadius: 10,
    padding: '10px 12px', fontSize: 14, outline: 'none',
    fontFamily: 'inherit', background: '#fafafa',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: '#1a1a2e', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/dashboard')} style={{
          background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none',
          borderRadius: 20, padding: '7px 14px', cursor: 'pointer', fontSize: 13
        }}>← Volver</button>
        <h1 style={{ color: 'white', margin: 0, fontSize: 17, fontWeight: 700 }}>Gestión del menú</h1>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Nueva categoría */}
        <div style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #efefef' }}>
          <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 13, color: '#999', letterSpacing: 1, textTransform: 'uppercase' }}>Nueva categoría</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={nuevaCat} onChange={e => setNuevaCat(e.target.value)}
              placeholder="Ej: Lomitos, Bebidas, Postres"
              style={{ ...inputStyle, flex: 1 }} />
            <button onClick={crearCategoria} style={{
              background: '#22c55e', color: 'white', border: 'none',
              borderRadius: 10, padding: '10px 18px', fontWeight: 700, cursor: 'pointer', fontSize: 14
            }}>+ Agregar</button>
          </div>
        </div>

        {/* Nuevo producto */}
        <div style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #efefef' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: mostrarFormProd ? 14 : 0 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#999', letterSpacing: 1, textTransform: 'uppercase' }}>Nuevo producto</p>
            <button onClick={() => { setMostrarFormProd(!mostrarFormProd); setPreview(null) }} style={{
              background: mostrarFormProd ? '#ef4444' : '#22c55e',
              color: 'white', border: 'none', borderRadius: 10,
              padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600
            }}>
              {mostrarFormProd ? '✕ Cancelar' : '+ Agregar producto'}
            </button>
          </div>

          {mostrarFormProd && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <select value={nuevoProducto.categoria_id}
                onChange={e => setNuevoProducto({ ...nuevoProducto, categoria_id: e.target.value })}
                style={{ ...inputStyle, gridColumn: '1/-1' }}>
                <option value="">Seleccioná una categoría</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <input value={nuevoProducto.nombre}
                onChange={e => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })}
                placeholder="Nombre del producto" style={inputStyle} />
              <input value={nuevoProducto.precio}
                onChange={e => setNuevoProducto({ ...nuevoProducto, precio: e.target.value })}
                placeholder="Precio en Gs." type="number" style={inputStyle} />
              <input value={nuevoProducto.descripcion}
                onChange={e => setNuevoProducto({ ...nuevoProducto, descripcion: e.target.value })}
                placeholder="Descripción (opcional)"
                style={{ ...inputStyle, gridColumn: '1/-1' }} />
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 6 }}>
                  ⏱ Tiempo de preparación (minutos)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="number" min="1" max="120"
                    value={nuevoProducto.tiempo_prep}
                    onChange={e => setNuevoProducto({ ...nuevoProducto, tiempo_prep: e.target.value })}
                    style={{ ...inputStyle, width: 100 }} />
                  <span style={{ fontSize: 12, color: '#999' }}>min</span>
                </div>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 8 }}>
                  Foto del producto
                </label>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <label style={{
                    background: '#f5f5f5', border: '2px dashed #ddd', borderRadius: 12,
                    padding: '14px 20px', cursor: 'pointer', fontSize: 13, color: '#666',
                    display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0
                  }}>
                    📷 {subiendo ? 'Subiendo...' : 'Foto / Galería'}
                    <input type="file" accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => e.target.files[0] && subirFoto(e.target.files[0])} />
                  </label>
                  {preview && (
                    <div style={{ position: 'relative' }}>
                      <img src={preview} alt="preview" style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover' }} />
                      <button onClick={() => { setPreview(null); setNuevoProducto(prev => ({ ...prev, imagen_url: '' })) }}
                        style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 11 }}>✕</button>
                    </div>
                  )}
                </div>
              </div>
              <button onClick={crearProducto} disabled={subiendo} style={{
                gridColumn: '1/-1',
                background: subiendo ? '#ccc' : '#22c55e',
                color: 'white', border: 'none', borderRadius: 10,
                padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer'
              }}>
                Guardar producto
              </button>
            </div>
          )}
        </div>

        {/* Lista de productos por categoría */}
        {categorias.map(cat => (
          <div key={cat.id} style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #efefef' }}>
            <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 15, color: '#111' }}>{cat.nombre}</p>
            {cat.productos.length === 0 && (
              <p style={{ color: '#ccc', fontSize: 13 }}>Sin productos todavía</p>
            )}
            {cat.productos.map(p => (
              <div key={p.id}>
                {/* Fila del producto */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0', borderBottom: editando?.id === p.id ? 'none' : '1px solid #f5f5f5',
                  opacity: p.disponible ? 1 : 0.5
                }}>
                  {p.imagen_url
                    ? <img src={p.imagen_url} alt={p.nombre} style={{ width: 54, height: 54, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 54, height: 54, borderRadius: 10, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🍽️</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#111' }}>{p.nombre}</p>
                    {p.descripcion && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#aaa' }}>{p.descripcion}</p>}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginTop: 3 }}>
                      <p style={{ margin: 0, fontWeight: 700, color: '#22c55e', fontSize: 14 }}>Gs. {parseInt(p.precio).toLocaleString()}</p>
                      <span style={{ fontSize: 11, color: '#aaa' }}>⏱ {p.tiempo_prep || 0} min</span>
                    </div>
                  </div>
                  <button onClick={() => toggleDisponible(p.id, p.disponible)} style={{
                    background: p.disponible ? '#f0fdf4' : '#fff5f5',
                    color: p.disponible ? '#16a34a' : '#dc2626',
                    border: 'none', borderRadius: 8, padding: '6px 12px',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0
                  }}>
                    {p.disponible ? '✓ Disponible' : '✗ Agotado'}
                  </button>
                  <button onClick={() => {
                    if (editando?.id === p.id) { setEditando(null); setPreviewEdicion(null) }
                    else { setEditando({ id: p.id, nombre: p.nombre, precio: p.precio, descripcion: p.descripcion || '', tiempo_prep: p.tiempo_prep || 10, imagen_url: p.imagen_url || '' }); setPreviewEdicion(p.imagen_url || null) }
                  }} style={{
                    background: editando?.id === p.id ? '#dbeafe' : '#eff6ff',
                    color: '#2563eb', border: 'none',
                    borderRadius: 8, padding: '6px 10px', fontSize: 16, cursor: 'pointer', flexShrink: 0
                  }}>✏️</button>
                  <button onClick={() => eliminarProducto(p.id)} style={{
                    background: '#fff5f5', color: '#ef4444', border: 'none',
                    borderRadius: 8, padding: '6px 10px', fontSize: 16, cursor: 'pointer', flexShrink: 0
                  }}>🗑</button>
                </div>

                {/* Formulario edición inline */}
                {editando?.id === p.id && (
                  <div style={{ margin: '8px 0 12px', background: '#f0f6ff', borderRadius: 12, padding: 14, border: '1.5px solid #bfdbfe', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 12, color: '#2563eb' }}>✏️ Editando: {p.nombre}</p>
                    <input value={editando.nombre} onChange={e => setEditando({ ...editando, nombre: e.target.value })}
                      placeholder="Nombre" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                    <input value={editando.precio} onChange={e => setEditando({ ...editando, precio: e.target.value })}
                      placeholder="Precio en Gs." type="number" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                    <input value={editando.descripcion} onChange={e => setEditando({ ...editando, descripcion: e.target.value })}
                      placeholder="Descripción (opcional)" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ fontSize: 12, color: '#555', fontWeight: 600, flexShrink: 0 }}>⏱ Tiempo prep:</label>
                      <input value={editando.tiempo_prep} onChange={e => setEditando({ ...editando, tiempo_prep: e.target.value })}
                        type="number" min="1" max="120" style={{ ...inputStyle, width: 80 }} />
                      <span style={{ fontSize: 12, color: '#aaa' }}>min</span>
                    </div>
                    {/* Foto */}
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <label style={{ background: '#f5f5f5', border: '2px dashed #ddd', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 13, color: '#666', display: 'flex', alignItems: 'center', gap: 6 }}>
                        📷 {subiendo ? 'Subiendo...' : 'Cambiar foto'}
                        <input type="file" accept="image/*" style={{ display: 'none' }}
                          onChange={e => e.target.files[0] && subirFotoEdicion(e.target.files[0])} />
                      </label>
                      {previewEdicion && (
                        <div style={{ position: 'relative' }}>
                          <img src={previewEdicion} alt="preview" style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover' }} />
                          <button onClick={() => { setPreviewEdicion(null); setEditando(prev => ({ ...prev, imagen_url: '' })) }}
                            style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 11 }}>✕</button>
                        </div>
                      )}
                    </div>
                    {/* Botones */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={editarProducto} disabled={subiendo} style={{ flex: 1, background: subiendo ? '#ccc' : '#2563eb', color: 'white', border: 'none', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        ✓ Guardar cambios
                      </button>
                      <button onClick={() => { setEditando(null); setPreviewEdicion(null) }} style={{ flex: 1, background: '#f5f5f5', color: '#666', border: 'none', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
