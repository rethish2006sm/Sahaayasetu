import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ allowRoles, children }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/signin" state={{ from: location }} replace />
  }

  if (allowRoles && !allowRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />
  }

  return children
}