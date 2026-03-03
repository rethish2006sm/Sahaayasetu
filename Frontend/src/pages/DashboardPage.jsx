import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import RoleNav from '../components/RoleNav'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/api'

const roleContent = {
  admin: {
    title: 'Admin Control Centre',
    desc: 'Monitor analytics, issue alerts, and manage system-wide response.',
    action: '/admin',
    actionLabel: 'Open Admin Panel',
    capabilities: ['Create NGO accounts', 'Publish emergency alerts', 'Manage shelters and platform settings'],
  },
  survivor: {
    title: 'Survivor Help Desk',
    desc: 'Register urgent needs, search missing persons, and view nearest support.',
    action: '/survivor',
    actionLabel: 'Open Survivor Portal',
    capabilities: ['Submit help requests', 'Find/report missing persons', 'Locate nearby shelters and NGOs'],
  },
  ngo: {
    title: 'NGO Operations Desk',
    desc: 'Coordinate field activity and create worker accounts.',
    action: '/ngo',
    actionLabel: 'Open NGO Portal',
    capabilities: ['Create worker accounts', 'Raise tasks and assign operations', 'Publish NGO contact/location profile'],
  },
  worker: {
    title: 'Worker Task Board',
    desc: 'Track assigned tasks and update progress from field.',
    action: '/worker',
    actionLabel: 'Open Worker Board',
    capabilities: ['View open tasks', 'Move task status to in progress/completed', 'Coordinate with NGO operations'],
  },
  donor: {
    title: 'Donor Contribution Desk',
    desc: 'Support urgent needs with targeted contributions.',
    action: '/donor',
    actionLabel: 'Open Donor Portal',
    capabilities: ['Submit donations', 'View high-priority needs', 'Track recent contribution records'],
  },
}

export default function DashboardPage() {
  const { user, token, refreshUser } = useAuth()
  const data = roleContent[user?.role] || roleContent.survivor

  const [summary, setSummary] = useState({})
  const [alerts, setAlerts] = useState([])
  const [tasks, setTasks] = useState([])
  const [donations, setDonations] = useState([])
  const [msg, setMsg] = useState('')
  const [profileMsg, setProfileMsg] = useState('')
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [loading, setLoading] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  })
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  const loadDashboardData = async () => {
    setLoading(true)
    setMsg('')
    try {
      const [summaryData, alertsData, tasksData, donationsData] = await Promise.all([
        apiRequest('/v1/platform/summary', { token }),
        apiRequest('/v1/platform/alerts', { token }),
        apiRequest('/v1/platform/tasks', { token }),
        apiRequest('/v1/platform/donations', { token }),
      ])
      setSummary(summaryData)
      setAlerts(alertsData)
      setTasks(tasksData)
      setDonations(donationsData)
    } catch (err) {
      setMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  useEffect(() => {
    setProfileForm({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    })
  }, [user?.name, user?.email, user?.phone])

  const openTasks = useMemo(() => tasks.filter((t) => t.status !== 'completed').slice(0, 6), [tasks])
  const highAlerts = useMemo(() => alerts.filter((a) => ['high', 'critical'].includes(a.severity)).slice(0, 6), [alerts])
  const recentDonations = useMemo(() => donations.slice(0, 6), [donations])

  const saveProfileChanges = async (e) => {
    e.preventDefault()
    setProfileMsg('')

    const wantsPasswordChange = passwordForm.current_password || passwordForm.new_password || passwordForm.confirm_password
    if (wantsPasswordChange) {
      if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
        setProfileMsg('To change password, fill current, new, and confirm fields.')
        return
      }
      if (passwordForm.new_password !== passwordForm.confirm_password) {
        setProfileMsg('New password and confirm password do not match.')
        return
      }
    }

    try {
      await apiRequest('/v1/auth/me', {
        method: 'PATCH',
        token,
        body: {
          name: profileForm.name,
          email: profileForm.email,
          phone: profileForm.phone,
        },
      })

      if (wantsPasswordChange) {
        await apiRequest('/v1/auth/change-password', {
          method: 'POST',
          token,
          body: {
            current_password: passwordForm.current_password,
            new_password: passwordForm.new_password,
          },
        })
      }

      await refreshUser()
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      })
      setProfileMsg('Profile updated successfully.')
      setShowEditProfile(false)
    } catch (err) {
      setProfileMsg(err.message)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-0">
      <div className="w-full">
        <RoleNav />

        <section className="grid md:grid-cols-3 gap-4">
          <article className="md:col-span-1 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h1 className="text-lg font-bold">Your Profile</h1>
            <div className="mt-4 space-y-2 text-sm">
              <p><span className="font-semibold">Name:</span> {user?.name}</p>
              <p><span className="font-semibold">Email:</span> {user?.email}</p>
              <p><span className="font-semibold">Phone:</span> {user?.phone || 'Not provided'}</p>
              <p><span className="font-semibold">Role:</span> {user?.role}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setProfileForm({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' })
                setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
                setProfileMsg('')
                setShowEditProfile(true)
              }}
              className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              Edit Profile
            </button>
            {(user?.role === 'admin' || user?.role === 'ngo') ? (
              <Link to="/signup" className="inline-block mt-4 px-3 py-2 rounded-lg border border-slate-300 text-sm">
                Create Allowed Users
              </Link>
            ) : null}
          </article>

          <article className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-2xl font-black text-blue-900">{data.title}</h2>
            <p className="mt-2 text-slate-600">{data.desc}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={data.action} className="bg-blue-900 text-white px-4 py-2 rounded-lg text-sm">
                {data.actionLabel}
              </Link>
              <button onClick={loadDashboardData} className="border border-slate-300 px-4 py-2 rounded-lg text-sm">
                Refresh Dashboard
              </button>
            </div>

            <div className="mt-6 grid sm:grid-cols-3 gap-3">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm">
                <p className="font-semibold">Account State</p>
                <p className="text-slate-600 mt-1">Authenticated and role-validated</p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm">
                <p className="font-semibold">Access Scope</p>
                <p className="text-slate-600 mt-1">Restricted to your role-specific operations</p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm">
                <p className="font-semibold">Live Status</p>
                <p className="text-slate-600 mt-1">{loading ? 'Refreshing...' : 'Up to date'}</p>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-4 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-xl font-bold text-blue-900">Role Capabilities</h3>
          <div className="mt-3 grid sm:grid-cols-3 gap-2 text-sm">
            {data.capabilities.map((cap) => (
              <div key={cap} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                {cap}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard label="Survivors" value={summary.survivors} />
          <SummaryCard label="Open Tasks" value={summary.open_tasks} />
          <SummaryCard label="Active Alerts" value={summary.alerts} />
          <SummaryCard label="Donations" value={summary.donations} />
        </section>

        <section className="mt-4 grid md:grid-cols-2 gap-4">
          <article className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-xl font-bold text-blue-900">Critical Alerts</h3>
            <div className="mt-3 space-y-2 text-sm max-h-64 overflow-auto pr-1">
              {highAlerts.map((a) => (
                <div key={a.id} className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                  <p className="font-semibold">[{a.severity}] {a.title}</p>
                  <p className="text-slate-700 mt-1">{a.message}</p>
                </div>
              ))}
              {highAlerts.length === 0 ? <p className="text-slate-500">No high/critical alerts right now.</p> : null}
            </div>
          </article>

          <article className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-xl font-bold text-blue-900">Open Task Feed</h3>
            <div className="mt-3 space-y-2 text-sm max-h-64 overflow-auto pr-1">
              {openTasks.map((t) => (
                <div key={t.id} className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                  <p className="font-semibold">{t.title}</p>
                  <p className="text-slate-700 mt-1">Priority: {t.priority} | Status: {t.status}</p>
                </div>
              ))}
              {openTasks.length === 0 ? <p className="text-slate-500">No open tasks available.</p> : null}
            </div>
          </article>
        </section>

        <section className="mt-4 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-xl font-bold text-blue-900">Recent Donation Feed</h3>
          <div className="mt-3 grid md:grid-cols-3 gap-2 text-sm">
            {recentDonations.map((d) => (
              <div key={d.id} className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                <p className="font-semibold">{d.donor_name}</p>
                <p className="text-slate-700 mt-1">{d.item_type} x {d.quantity}</p>
              </div>
            ))}
            {recentDonations.length === 0 ? <p className="text-slate-500">No donations recorded yet.</p> : null}
          </div>
        </section>

        {msg ? (
          <section className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-sm text-red-700 shadow-sm">
            {msg}
          </section>
        ) : null}

        {showEditProfile ? (
          <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center p-4 pt-32">
            <section className="w-full max-w-md max-h-[calc(100vh-9rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl break-words">
              <h3 className="text-xl font-bold text-blue-900">Edit Profile</h3>
              <p className="text-sm text-slate-600 mt-1">Update name, email, phone, and optionally password.</p>

              <form onSubmit={saveProfileChanges} className="mt-4 space-y-3">
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Name"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                  required
                />
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Phone (optional)"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                />

                <div className="border rounded-lg p-3 bg-slate-50">
                  <p className="text-sm font-semibold">Change Password (Optional)</p>
                  <div className="mt-2 space-y-2">
                    <input
                      type="password"
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="Current password"
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, current_password: e.target.value }))}
                    />
                    <input
                      type="password"
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="New password"
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, new_password: e.target.value }))}
                    />
                    <input
                      type="password"
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="Confirm new password"
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, confirm_password: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 rounded-lg bg-blue-900 text-white py-2 text-sm">Save Changes</button>
                  <button
                    type="button"
                    onClick={() => setShowEditProfile(false)}
                    className="flex-1 rounded-lg border border-slate-300 py-2 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>

              {profileMsg ? <p className="mt-3 text-sm text-slate-700">{profileMsg}</p> : null}
            </section>
          </div>
        ) : null}
      </div>
    </main>
  )
}

function SummaryCard({ label, value }) {
  return (
    <article className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-black text-blue-900 mt-1">{value ?? 0}</p>
    </article>
  )
}
