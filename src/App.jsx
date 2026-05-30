import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Menu from './pages/Menu'
import Stats from './pages/Stats'
import Mesas from './pages/Mesas'
import Configuracion from './pages/Configuracion'
import MiLocal from './pages/MiLocal'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/menu" element={<PrivateRoute><Menu /></PrivateRoute>} />
      <Route path="/stats" element={<PrivateRoute><Stats /></PrivateRoute>} />
      <Route path="/mesas" element={<PrivateRoute><Mesas /></PrivateRoute>} />
      <Route path="/configuracion" element={<PrivateRoute><Configuracion /></PrivateRoute>} />
      <Route path="/mi-local" element={<PrivateRoute><MiLocal /></PrivateRoute>} />
    </Routes>
  )
}

export default App
