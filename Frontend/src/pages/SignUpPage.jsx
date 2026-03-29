import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRequest } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import RoleNav from '../components/RoleNav'
export default function SignUpPage() {
  const { user, token } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('survivor')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const navigate = useNavigate()
  const roleLabel = (value) => (value === 'worker' ? 'employee' : value)
  const roleOptions = useMemo(() => {
    if (!user) return ['survivor', 'donor']
    if (user.role === 'admin') return ['ngo']
    if (user.role === 'ngo') return ['worker']
    return []
  }, [user])

  useEffect(() => {
    if (roleOptions.length === 0) {
      setRole('')
      return
    }
    if (!roleOptions.includes(role)) {
      setRole(roleOptions[0])
    }
  }, [roleOptions, role])

  const handleFormSubmit = useCallback(async () => {
    setErr('')
    setMsg('')
    try {
      const data = await apiRequest('/v1/auth/signup', {
        method: 'POST',
        token,
        body: { name, email, password, phone: phone || null, role },
      })
      setMsg(`Created ${roleLabel(data.user.role)} user successfully.`)
      if (!user) navigate('/signin')
    } catch (error) {
      setErr(error.message)
    }
  }, [email, name, navigate, password, role, token, user])

  const onSubmit = async (e) => {
    e.preventDefault()
    await handleFormSubmit()
  }

  return (
    <main className="min-h-screen bg-slate-100 p-0">
      <div className="w-full">
        <RoleNav />
        <section className="bg-white w-full max-w-md p-6 rounded-xl border border-slate-200 shadow-sm mx-auto">
          <h1 className="text-2xl font-bold">Sign Up</h1>
          <p className="text-sm text-slate-600 mt-1">
            Public signup: donor/survivor. Admin can create NGO accounts. NGO can create employee accounts.
          </p>
          <form onSubmit={onSubmit} className="space-y-3 mt-4">
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={roleOptions.length === 0}
            >
              {roleOptions.length > 0 ? (
                roleOptions.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)
              ) : (
                <option value="">No role available</option>
              )}
            </select>
            <button className="w-full bg-slate-900 text-white rounded-lg py-2 disabled:opacity-60" disabled={roleOptions.length === 0}>Create Account</button>
          </form>
          {roleOptions.length === 0 ? (
            <p className="text-sm text-amber-700 mt-3">
              Your current role cannot create new users.
            </p>
          ) : null}
          {msg ? <p className="text-sm text-green-700 mt-3">{msg}</p> : null}
          {err ? <p className="text-sm text-red-600 mt-3">{err}</p> : null}
          <p className="text-sm mt-4"><Link to="/signin" className="text-blue-600">Back to sign in</Link></p>
        </section>
      </div>
    </main>
  )
}
