import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'https://restaurant-backend-production-1271.up.railway.app'
const GOOGLE_API_KEY = 'AIzaSyA62BdP0S_uQJauHy-q9CeZmYEm-XA_SyQ'

export default function Configuracion() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const mapInstanceRef = useRef(null)

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [costoKm, setCostoKm] = useState('')
  const [distanciaMax, setDistanciaMax] = useState('')
  const [lat, setLat] = useState(-25.2867)
  const [lng, setLng] = useState(-57.647)
  const [direccionLocal, setDireccionLocal] = useState('')
  const [mapListo, setMapListo] = useState(false)

  // Cargar datos del local
  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await axios.get(`${API}/locales/mi-local/info`, { headers })
        if (res.data.latitud) setLat(res.data.latitud)
        if (res.data.longitud) setLng(res.data.longitud)
        if (res.data.costo_km) setCostoKm(res.data.costo_km.toString())
          if (res.data.distancia_max_km) setDistanciaMax(res.data.distancia_max_km.toString())
        if (res.data.direccion) setDireccionLocal(res.data.direccion)
      } catch (e) {}
      finally { setCargando(false) }
    }
    cargar()
  }, [])

  // Cargar Google Maps
  useEffect(() => {
    if (window.google) { setMapListo(true); return }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places`
    script.async = true
    script.onload = () => setMapListo(true)
    document.head.appendChild(script)
  }, [])

  // Inicializar mapa cuando esté listo y no cargando
  useEffect(() => {
    if (!mapListo || cargando || !mapRef.current) return
    const google = window.google
    const map = new google.maps.Map(mapRef.current, {
      center: { lat, lng },
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    })
    mapInstanceRef.current = map

    const marker = new google.maps.Marker({
      position: { lat, lng },
      map,
      draggable: true,
      title: 'Ubicación del local',
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
      }
    })
    markerRef.current = marker

    // Actualizar coordenadas al arrastrar
    marker.addListener('dragend', async (e) => {
      const newLat = e.latLng.lat()
      const newLng = e.latLng.lng()
      setLat(newLat)
      setLng(newLng)
      // Geocoding inverso para obtener dirección
      try {
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${newLat},${newLng}&key=${GOOGLE_API_KEY}`)
        const data = await res.json()
        if (data.results[0]) setDireccionLocal(data.results[0].formatted_address)
      } catch (e) {}
    })

    // Click en mapa para mover marker
    map.addListener('click', async (e) => {
      const newLat = e.latLng.lat()
      const newLng = e.latLng.lng()
      marker.setPosition({ lat: newLat, lng: newLng })
      setLat(newLat)
      setLng(newLng)
      try {
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${newLat},${newLng}&key=${GOOGLE_API_KEY}`)
        const data = await res.json()
        if (data.results[0]) setDireccionLocal(data.results[0].formatted_address)
      } catch (e) {}
    })
  }, [mapListo, cargando])

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) { alert('Tu dispositivo no soporta geolocalización'); return }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const newLat = pos.coords.latitude
      const newLng = pos.coords.longitude
      setLat(newLat)
      setLng(newLng)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter({ lat: newLat, lng: newLng })
        markerRef.current?.setPosition({ lat: newLat, lng: newLng })
      }
      try {
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${newLat},${newLng}&key=${GOOGLE_API_KEY}`)
        const data = await res.json()
        if (data.results[0]) setDireccionLocal(data.results[0].formatted_address)
      } catch (e) {}
    }, () => alert('No se pudo obtener tu ubicación'))
  }

  const guardar = async () => {
    if (!costoKm || parseInt(costoKm) < 0) { alert('Ingresá un costo por km válido'); return }
    setGuardando(true)
    try {
      await axios.patch(`${API}/locales/mi-local`, {
        latitud: lat,
        longitud: lng,
        costo_km: parseInt(costoKm),
        distancia_max_km: parseInt(distanciaMax) || 0,
        direccion: direccionLocal,
      }, { headers })
      alert('✅ Configuración guardada')
    } catch (e) {
      alert('Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#111', fontFamily: "'Segoe UI', system-ui, sans-serif", color: 'white' }}>

      {/* Header */}
      <div style={{ background: '#1a1a2e', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: 20, padding: '7px 14px', cursor: 'pointer', fontSize: 13 }}>← Volver</button>
        <h1 style={{ color: 'white', margin: 0, fontSize: 17, fontWeight: 700 }}>⚙️ Configuración delivery</h1>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Costo por km */}
        <div style={{ background: '#1e1e1e', borderRadius: 14, padding: 16, border: '1px solid #2a2a2a' }}>
          <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 13, color: '#f59e0b' }}>💰 Costo de delivery por km</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#666', fontSize: 14 }}>Gs.</span>
            <input
              type="number"
              value={costoKm}
              onChange={e => setCostoKm(e.target.value)}
              placeholder="Ej: 3000"
              style={{ flex: 1, background: '#111', border: '1.5px solid #333', borderRadius: 10, padding: '10px 12px', fontSize: 16, color: 'white', outline: 'none', fontFamily: 'inherit' }}
            />
            <span style={{ color: '#666', fontSize: 14 }}>/km</span>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#555' }}>Ej: si el cliente está a 3km y el costo es Gs. 3.000/km → delivery = Gs. 9.000</p>
          <div style={{ marginTop: 14 }}>
  <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, color: '#f59e0b' }}>📏 Distancia máxima de delivery (km)</p>
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <input
      type="number"
      value={distanciaMax}
      onChange={e => setDistanciaMax(e.target.value)}
      placeholder="Ej: 30"
      style={{ flex: 1, background: '#111', border: '1.5px solid #333', borderRadius: 10, padding: '10px 12px', fontSize: 16, color: 'white', outline: 'none', fontFamily: 'inherit' }}
    />
    <span style={{ color: '#666', fontSize: 14 }}>km</span>
  </div>
  <p style={{ margin: '8px 0 0', fontSize: 12, color: '#555' }}>Si el cliente está más lejos no podrá hacer el pedido. Poné 0 para sin límite.</p>
</div>
        </div>

        {/* Ubicación del local */}
        <div style={{ background: '#1e1e1e', borderRadius: 14, padding: 16, border: '1px solid #2a2a2a' }}>
          <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 13, color: '#3b82f6' }}>📍 Ubicación del local</p>

          {direccionLocal && (
            <div style={{ background: '#111', borderRadius: 10, padding: '10px 12px', marginBottom: 12, fontSize: 13, color: '#aaa' }}>
              📍 {direccionLocal}
            </div>
          )}

          <button onClick={usarMiUbicacion} style={{
            width: '100%', background: '#1e3a5f', color: 'white', border: 'none',
            borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', marginBottom: 12
          }}>
            🎯 Usar mi ubicación actual
          </button>

          <p style={{ margin: '0 0 8px', fontSize: 12, color: '#555' }}>O tocá en el mapa para mover el pin:</p>

          {/* Mapa */}
          {cargando ? (
            <div style={{ height: 300, background: '#111', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
              Cargando mapa...
            </div>
          ) : (
            <div ref={mapRef} style={{ height: 300, borderRadius: 12, overflow: 'hidden', border: '1px solid #333' }} />
          )}
        </div>

        {/* Botón guardar */}
        <button onClick={guardar} disabled={guardando} style={{
          width: '100%', background: guardando ? '#333' : '#22c55e',
          color: guardando ? '#666' : 'black', border: 'none', borderRadius: 14,
          padding: '16px', fontSize: 15, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer'
        }}>
          {guardando ? 'Guardando...' : '✓ Guardar configuración'}
        </button>

      </div>
    </div>
  )
}
