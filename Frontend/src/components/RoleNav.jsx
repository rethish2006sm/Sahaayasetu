import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import appLogo from '../assets/logo.png'

const roleLink = {
  admin: { to: '/admin', label: 'Admin' },
  survivor: { to: '/survivor', label: 'Survivor' },
  ngo: { to: '/ngo', label: 'NGO' },
  worker: { to: '/worker', label: 'Employee' },
  donor: { to: '/donor', label: 'Donor' },
}

const roleDisplay = {
  admin: 'admin',
  survivor: 'survivor',
  ngo: 'ngo',
  worker: 'employee',
  donor: 'donor',
}

export default function RoleNav() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const goToSection = (id) => {
    const target = `#${id}`
    if (location.pathname === '/') {
      window.location.hash = target
      return
    }
    navigate({ pathname: '/', hash: target })
  }

  return (
    <header className="sticky top-2 z-40 mb-4 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src={appLogo} alt="SahaayaSetu logo" className="h-11 w-11 rounded object-contain" />
          <p className="text-2xl font-black leading-none tracking-tight">
            <span className="text-blue-900">Sahaaya</span><span className="text-orange-500">Setu</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/" className="rounded-lg bg-orange-400 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-500">Home</Link>
          <button onClick={() => goToSection('search')} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Search</button>
          <Link
            to={user ? '/dashboard' : '/signin'}
            className="ml-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-900 text-xs font-bold text-white">U</span>
            <span>{user ? user.name : 'Guest User'}</span>
          </Link>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
        {user ? (
          <div className="flex flex-wrap items-center gap-2">
            <NavLink to="/dashboard" className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium border ${isActive ? 'bg-blue-900 text-white border-blue-900' : 'border-slate-300 hover:bg-slate-50'}`}>
              Dashboard
            </NavLink>
            <NavLink to={roleLink[user.role].to} className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium border ${isActive ? 'bg-orange-500 text-white border-orange-500' : 'border-slate-300 hover:bg-slate-50'}`}>
              {roleLink[user.role].label}
            </NavLink>
            {(user.role === 'admin' || user.role === 'ngo') ? (
              <NavLink to="/signup" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">Create Users</NavLink>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <NavLink to="/signin" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">Sign In</NavLink>
            <NavLink to="/signup" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">Sign Up</NavLink>
          </div>
        )}

        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <span className="rounded-lg bg-slate-100 px-3 py-2 font-medium text-slate-700">
              {user.name} ({roleDisplay[user.role] || user.role})
            </span>
          ) : (
            <span className="rounded-lg bg-slate-100 px-3 py-2 font-medium text-slate-700">Guest</span>
          )}
          {user ? <button onClick={logout} className="rounded-lg border border-slate-300 px-3 py-2 font-medium hover:bg-slate-50">Logout</button> : null}
        </div>
      </div>
    </header>
  )
}

