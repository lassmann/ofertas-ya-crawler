import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { auth } from '../lib/api'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!auth.isAuthenticated() || auth.isTokenExpired()) {
      auth.removeToken()
      navigate('/login', { state: { from: location } })
    }
  }, [navigate, location])

  if (!auth.isAuthenticated() || auth.isTokenExpired()) {
    return null
  }

  return <>{children}</>
}
