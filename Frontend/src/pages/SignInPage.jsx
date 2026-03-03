import { useCallback, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import RoleNav from '../components/RoleNav'
import { apiRequest } from '../lib/api'
export default function SignInPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotPassword, setForgotPassword] = useState('')
  const [forgotConfirm, setForgotConfirm] = useState('')
  const [forgotMsg, setForgotMsg] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  const handleFormSubmit = useCallback(async () => {
    setError('')
    try {
      await login(email, password)
      const from = location.state?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message)
    }
  }, [email, login, location, navigate, password])

  const onSubmit = async (e) => {
    e.preventDefault()
    await handleFormSubmit()
  }

  const onForgotSubmit = async (e) => {
    e.preventDefault()
    setForgotMsg('')
    if (forgotPassword !== forgotConfirm) {
      setForgotMsg('New password and confirm password do not match.')
      return
    }
    try {
      await apiRequest('/v1/auth/forgot-password', {
        method: 'POST',
        body: {
          email: forgotEmail,
          new_password: forgotPassword,
        },
      })
      setForgotMsg('Password changed successfully. You can sign in now.')
      setForgotPassword('')
      setForgotConfirm('')
    } catch (err) {
      setForgotMsg(err.message)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-0">
      <div className="w-full">
        <RoleNav />
        <section className="bg-white w-full max-w-md p-6 rounded-xl border border-slate-200 shadow-sm mx-auto">
          <h1 className="text-2xl font-bold">Sign In</h1>
          <p className="text-sm text-slate-600 mt-1">Use your role account credentials.</p>
          <form onSubmit={onSubmit} className="space-y-3 mt-4">
            <input className="w-full border rounded-lg px-3 py-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="w-full border rounded-lg px-3 py-2" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button className="w-full bg-slate-900 text-white rounded-lg py-2">Sign In</button>
          </form>
          <button
            type="button"
            onClick={() => {
              setShowForgot(true)
              setForgotEmail(email || '')
              setForgotMsg('')
            }}
            className="mt-3 text-sm text-blue-700 underline"
          >
            Forgot Password?
          </button>
          {error ? <p className="text-sm text-red-600 mt-3">{error}</p> : null}
          <p className="text-sm mt-4">No account? <Link to="/signup" className="text-blue-600">Sign up</Link></p>
        </section>
      </div>

      {showForgot ? (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center p-4 pt-32">
          <section className="w-full max-w-sm max-h-[calc(100vh-9rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl break-words">
            <h2 className="text-xl font-bold">Forgot Password</h2>
            <p className="mt-1 text-sm text-slate-600">Enter your email and set a new password.</p>
            <form onSubmit={onForgotSubmit} className="mt-4 space-y-3">
              <input
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
              <input
                type="password"
                className="w-full border rounded-lg px-3 py-2"
                placeholder="New password"
                value={forgotPassword}
                onChange={(e) => setForgotPassword(e.target.value)}
                required
              />
              <input
                type="password"
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Confirm new password"
                value={forgotConfirm}
                onChange={(e) => setForgotConfirm(e.target.value)}
                required
              />
              <div className="flex gap-2">
                <button className="flex-1 rounded-lg bg-slate-900 text-white py-2">Change Password</button>
                <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  className="flex-1 rounded-lg border border-slate-300 py-2"
                >
                  Close
                </button>
              </div>
            </form>
            {forgotMsg ? <p className="mt-3 text-sm text-slate-700">{forgotMsg}</p> : null}
          </section>
        </div>
      ) : null}
    </main>
  )
}
