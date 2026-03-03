import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import DashboardPage from './pages/DashboardPage'
import AdminPage from './pages/AdminPage'
import SurvivorPage from './pages/SurvivorPage'
import NgoPage from './pages/NgoPage'
import WorkerPage from './pages/WorkerPage'
import WorkerTransactionsPage from './pages/WorkerTransactionsPage'
import DonorPage from './pages/DonorPage'

function RoleRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/signin" replace />
  return <Navigate to={`/${user.role}`} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/role" element={<RoleRedirect />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowRoles={['admin', 'survivor', 'ngo', 'worker', 'donor']}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route path="/admin" element={<ProtectedRoute allowRoles={['admin']}><AdminPage /></ProtectedRoute>} />
      <Route path="/survivor" element={<ProtectedRoute allowRoles={['survivor']}><SurvivorPage /></ProtectedRoute>} />
      <Route path="/ngo" element={<ProtectedRoute allowRoles={['ngo']}><NgoPage /></ProtectedRoute>} />
      <Route path="/worker" element={<Navigate to="/worker/overview" replace />} />
      <Route path="/worker/:tab" element={<ProtectedRoute allowRoles={['worker']}><WorkerPage /></ProtectedRoute>} />
      <Route path="/worker/transactions" element={<Navigate to="/worker/transactions/overview" replace />} />
      <Route path="/worker/transactions/:tab" element={<ProtectedRoute allowRoles={['worker']}><WorkerTransactionsPage /></ProtectedRoute>} />
      <Route path="/donor" element={<ProtectedRoute allowRoles={['donor']}><DonorPage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
