import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom'
import RoleNav from '../components/RoleNav'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/api'

const statusOrder = {
  open: 0,
  in_progress: 1,
  completed: 2,
}

const priorityRank = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

const workerTabs = ['overview', 'availability', 'transactions', 'survivors', 'missing', 'tasks']

export default function WorkerPage() {
  const navigate = useNavigate()
  const { tab } = useParams()
  const currentTab = workerTabs.includes(tab) ? tab : 'overview'
  const { token, user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionTaskId, setActionTaskId] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [ownershipFilter, setOwnershipFilter] = useState('mine_or_unassigned')
  const [selectedTask, setSelectedTask] = useState(null)
  const [assignedSurvivors, setAssignedSurvivors] = useState([])
  const [donations, setDonations] = useState([])
  const [missingRecords, setMissingRecords] = useState([])
  const [workerProfile, setWorkerProfile] = useState(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [missingQuery, setMissingQuery] = useState('')
  const [missingStatusFilter, setMissingStatusFilter] = useState('all')
  const [missingVerificationFilter, setMissingVerificationFilter] = useState('all')
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: '',
    skills: '',
    coverage_area: '',
    lat: '',
    lon: '',
  })
  const [updatingMyStatus, setUpdatingMyStatus] = useState(false)

  const workerId = user?.id || ''

  useEffect(() => {
    if (!workerTabs.includes(tab)) {
      navigate('/worker/overview', { replace: true })
    }
  }, [tab, navigate])

  const load = async () => {
    setLoading(true)
    try {
      const [taskData, profileData, missingData, survivorData, donationData] = await Promise.all([
        apiRequest('/v1/platform/tasks', { token }),
        apiRequest('/v1/platform/workers/me', { token }),
        apiRequest('/v1/platform/missing-persons', { token }),
        apiRequest('/v1/survivors', { token }),
        apiRequest('/v1/platform/donations', { token }),
      ])
      setTasks(taskData || [])
      setWorkerProfile(profileData?.profile || null)
      setMissingRecords(missingData || [])
      setAssignedSurvivors((survivorData || []).filter((item) => item.assigned_worker_id && item.assigned_worker_id === workerId))
      setDonations(donationData || [])
    } catch (err) {
      setMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!msg) return
    const timer = setTimeout(() => setMsg(''), 3500)
    return () => clearTimeout(timer)
  }, [msg])

  const updateTask = async (task, payload, okMessage) => {
    if (actionTaskId) return
    setActionTaskId(task.id)
    try {
      await apiRequest(`/v1/platform/tasks/${task.id}/status`, { method: 'PATCH', token, body: payload })
      // Keep availability in sync automatically after each task action.
      await apiRequest('/v1/platform/workers/me/status', {
        method: 'PATCH',
        token,
        body: {},
      })
      setMsg(okMessage)
      await load()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setActionTaskId('')
    }
  }

  const normalizedQuery = query.trim().toLowerCase()
  const visibleTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      if (statusFilter !== 'all' && task.status !== statusFilter) return false
      if (priorityFilter !== 'all' && String(task.priority || '').toLowerCase() !== priorityFilter) return false

      const isMine = task.assigned_worker_id && task.assigned_worker_id === workerId
      const isUnassigned = !task.assigned_worker_id
      if (ownershipFilter === 'mine' && !isMine) return false
      if (ownershipFilter === 'unassigned' && !isUnassigned) return false
      if (ownershipFilter === 'mine_or_unassigned' && !(isMine || isUnassigned)) return false

      if (!normalizedQuery) return true
      return (
        String(task.title || '').toLowerCase().includes(normalizedQuery) ||
        String(task.description || '').toLowerCase().includes(normalizedQuery) ||
        String(task.priority || '').toLowerCase().includes(normalizedQuery) ||
        String(task.status || '').toLowerCase().includes(normalizedQuery)
      )
    })

    return filtered.sort((a, b) => {
      const aIsAdminSpecial = a.is_admin_special || a.assignment_tag === 'admin_special' || a.created_by_role === 'admin'
      const bIsAdminSpecial = b.is_admin_special || b.assignment_tag === 'admin_special' || b.created_by_role === 'admin'
      if (aIsAdminSpecial !== bIsAdminSpecial) return aIsAdminSpecial ? -1 : 1
      const statusDelta = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99)
      if (statusDelta !== 0) return statusDelta
      const priorityDelta = (priorityRank[b.priority] ?? 0) - (priorityRank[a.priority] ?? 0)
      if (priorityDelta !== 0) return priorityDelta
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    })
  }, [tasks, statusFilter, priorityFilter, ownershipFilter, normalizedQuery, workerId])

  const stats = useMemo(() => {
    const open = tasks.filter((task) => task.status === 'open').length
    const inProgress = tasks.filter((task) => task.status === 'in_progress').length
    const completed = tasks.filter((task) => task.status === 'completed').length
    const mine = tasks.filter((task) => task.assigned_worker_id && task.assigned_worker_id === workerId).length
    const critical = tasks.filter((task) => String(task.priority || '').toLowerCase() === 'critical').length
    return { open, inProgress, completed, mine, critical, total: tasks.length }
  }, [tasks, workerId])

  const filteredMissingRecords = useMemo(() => {
    const normalizedMissingQuery = missingQuery.trim().toLowerCase()
    return missingRecords.filter((item) => {
      const status = String(item.case_status || 'missing').toLowerCase()
      const verification = String(item.verification_status || 'not_required').toLowerCase()
      if (missingStatusFilter !== 'all' && status !== missingStatusFilter) return false
      if (missingVerificationFilter !== 'all' && verification !== missingVerificationFilter) return false
      if (!normalizedMissingQuery) return true
      return (
        String(item.name || '').toLowerCase().includes(normalizedMissingQuery) ||
        status.includes(normalizedMissingQuery) ||
        verification.includes(normalizedMissingQuery) ||
        String(item.found_reporter_contact || '').toLowerCase().includes(normalizedMissingQuery)
      )
    })
  }, [missingRecords, missingQuery, missingStatusFilter, missingVerificationFilter])

  const myParcelDonations = useMemo(() => {
    const profileId = workerProfile?.id
    return donations
      .filter((d) => d.item_type !== 'money')
      .filter((d) => d.status !== 'distributed')
      .filter((d) => {
        const byUser = d.assigned_worker_user_id && d.assigned_worker_user_id === workerId
        const byProfile = profileId && d.assigned_worker_profile_id && d.assigned_worker_profile_id === profileId
        return byUser || byProfile
      })
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
  }, [donations, workerId, workerProfile?.id])

  const formatDate = (raw) => {
    if (!raw) return 'Unknown'
    const dt = new Date(raw)
    if (Number.isNaN(dt.getTime())) return String(raw)
    return dt.toLocaleString()
  }

  const createWorkerProfile = async (e) => {
    e.preventDefault()
    if (savingProfile) return
    setSavingProfile(true)
    setMsg('')
    try {
      await apiRequest('/v1/platform/workers', {
        method: 'POST',
        token,
        body: {
          name: profileForm.name,
          phone: profileForm.phone,
          skills: profileForm.skills.split(',').map((s) => s.trim()).filter(Boolean),
          coverage_area: profileForm.coverage_area,
          lat: profileForm.lat ? Number(profileForm.lat) : null,
          lon: profileForm.lon ? Number(profileForm.lon) : null,
          availability_status: 'Available',
        },
      })
      setMsg('Employee profile created successfully.')
      await load()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setSavingProfile(false)
    }
  }

  const respondToSurvivorRequest = async (survivorId, action) => {
    if (actionTaskId) return
    setActionTaskId(`survivor-${survivorId}`)
    try {
      await apiRequest(`/v1/platform/survivor-requests/${survivorId}/worker-response`, {
        method: 'PATCH',
        token,
        body: { action },
      })
      setMsg(action === 'accept' ? 'Survivor request accepted.' : 'Rejection requested. Waiting NGO confirmation.')
      await load()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setActionTaskId('')
    }
  }

  const updateMyStatus = async (showMessage = true) => {
    if (updatingMyStatus) return
    setUpdatingMyStatus(true)
    try {
      await apiRequest('/v1/platform/workers/me/status', {
        method: 'PATCH',
        token,
        body: {},
      })
      if (showMessage) setMsg('Your status was auto-updated from assigned tasks.')
      await load()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setUpdatingMyStatus(false)
    }
  }

  const reportFoundMissing = async (item) => {
    if (actionTaskId) return
    const contact = window.prompt('Enter finder contact number/details for verification:', item.reporter_contact || '')
    if (contact === null) return
    setActionTaskId(`missing-${item.id}`)
    try {
      await apiRequest(`/v1/platform/missing-persons/${item.id}/report-found`, {
        method: 'PATCH',
        token,
        body: {
          found_notes: 'Reported from worker portal',
          found_reporter_contact: contact || null,
        },
      })
      setMsg('Found status submitted. Waiting NGO/Admin verification.')
      await load()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setActionTaskId('')
    }
  }

  const updateParcelStatus = async (donation, action) => {
    if (actionTaskId) return
    setActionTaskId(`donation-${donation.id}-${action}`)
    try {
      const url = action === 'picked_up'
        ? `/v1/platform/donations/${donation.id}/mark-picked-up`
        : `/v1/platform/donations/${donation.id}/mark-distributed`
      await apiRequest(url, {
        method: 'PATCH',
        token,
        body: {},
      })
      setMsg(action === 'picked_up' ? 'Parcel marked as picked up.' : 'Parcel marked as distributed.')
      await load()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setActionTaskId('')
    }
  }

  if (!loading && !workerProfile) {
    return (
      <main className="min-h-screen bg-slate-100 p-0">
        <div className="w-full">
          <RoleNav />
          <section className="bg-white border rounded-xl p-5 shadow-sm">
            <h1 className="text-2xl font-black text-blue-900">Employee Profile Setup</h1>
            <p className="mt-1 text-sm text-slate-600">Complete this one time form to join your NGO's employee list and receive assignments.</p>
            <form onSubmit={createWorkerProfile} className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <input className="border rounded-lg px-3 py-2 sm:col-span-2" placeholder="Employee name" value={profileForm.name} onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))} required />
              <input className="border rounded-lg px-3 py-2" placeholder="Phone" value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} />
              <input className="border rounded-lg px-3 py-2" placeholder="Coverage area" value={profileForm.coverage_area} onChange={(e) => setProfileForm((p) => ({ ...p, coverage_area: e.target.value }))} />
              <input className="border rounded-lg px-3 py-2 sm:col-span-2" placeholder="Skills comma separated" value={profileForm.skills} onChange={(e) => setProfileForm((p) => ({ ...p, skills: e.target.value }))} />
              <input className="border rounded-lg px-3 py-2" placeholder="Lat (optional)" value={profileForm.lat} onChange={(e) => setProfileForm((p) => ({ ...p, lat: e.target.value }))} />
              <input className="border rounded-lg px-3 py-2" placeholder="Lon (optional)" value={profileForm.lon} onChange={(e) => setProfileForm((p) => ({ ...p, lon: e.target.value }))} />
              <button disabled={savingProfile} className="sm:col-span-2 rounded-lg bg-blue-900 text-white px-4 py-2 disabled:opacity-60">
                {savingProfile ? 'Saving...' : 'Create Employee Profile'}
              </button>
            </form>
            {msg ? <p className="mt-3 text-sm text-slate-700">{msg}</p> : null}
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 p-0">
      <div className="w-full">
        <RoleNav />
        <section className="bg-white border rounded-xl p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-blue-900">Employee Mission Console</h1>
              <p className="text-sm text-slate-600">Track assignments, claim open tasks, and close field work quickly.</p>
            </div>
            <button
              onClick={load}
              disabled={loading || Boolean(actionTaskId)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-60"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'availability', label: 'Availability' },
              { id: 'transactions', label: 'Transactions' },
              { id: 'survivors', label: 'Survivor Requests' },
              { id: 'missing', label: 'Missing Reports' },
              { id: 'tasks', label: 'Tasks' },
            ].map((item) => (
              <NavLink
                key={item.id}
                to={`/worker/${item.id}`}
                className={({ isActive }) => `rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-orange-500 text-white' : 'bg-blue-900 text-white'}`}
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          {currentTab === 'overview' ? (
            <section className="mt-4 space-y-4">
	              <div className="grid gap-2 text-xs sm:grid-cols-3 lg:grid-cols-6">
	                <div className="rounded-lg border bg-slate-50 p-3"><p className="text-slate-500">Total</p><p className="mt-1 text-lg font-bold">{stats.total}</p></div>
                <div className="rounded-lg border bg-blue-50 p-3"><p className="text-blue-700">Open</p><p className="mt-1 text-lg font-bold text-blue-900">{stats.open}</p></div>
                <div className="rounded-lg border bg-amber-50 p-3"><p className="text-amber-700">In Progress</p><p className="mt-1 text-lg font-bold text-amber-800">{stats.inProgress}</p></div>
                <div className="rounded-lg border bg-emerald-50 p-3"><p className="text-emerald-700">Completed</p><p className="mt-1 text-lg font-bold text-emerald-800">{stats.completed}</p></div>
                <div className="rounded-lg border bg-indigo-50 p-3"><p className="text-indigo-700">Assigned to Me</p><p className="mt-1 text-lg font-bold text-indigo-900">{stats.mine}</p></div>
	                <div className="rounded-lg border bg-red-50 p-3"><p className="text-red-700">Critical</p><p className="mt-1 text-lg font-bold text-red-900">{stats.critical}</p></div>
	              </div>
              <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border bg-purple-50 p-3">
                  <p className="text-indigo-700">Admin Special Tasks</p>
                  <p className="mt-1 text-lg font-bold text-indigo-900">{tasks.filter((t) => t.is_admin_special || t.assignment_tag === 'admin_special' || t.created_by_role === 'admin').length}</p>
                </div>
                <div className="rounded-lg border bg-teal-50 p-3">
                  <p className="text-teal-700">My Donor Parcels</p>
                  <p className="mt-1 text-lg font-bold text-teal-900">{myParcelDonations.length}</p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                <article className="rounded-xl border bg-slate-50 p-3">
                  <h2 className="font-semibold text-blue-900">Availability</h2>
                  <p className="mt-1 text-slate-700">{workerProfile?.availability_status || '-'}</p>
                  <NavLink to="/worker/availability" className="mt-2 inline-flex rounded border border-blue-300 px-3 py-1.5 text-xs text-blue-700">Open</NavLink>
                </article>
                <article className="rounded-xl border bg-slate-50 p-3">
                  <h2 className="font-semibold text-blue-900">Transactions</h2>
                  <p className="mt-1 text-slate-700">Wallet transfer, payments, history.</p>
                  <NavLink to="/worker/transactions" className="mt-2 inline-flex rounded border border-blue-300 px-3 py-1.5 text-xs text-blue-700">Open</NavLink>
                </article>
                <article className="rounded-xl border bg-slate-50 p-3">
                  <h2 className="font-semibold text-blue-900">Survivor Requests</h2>
                  <p className="mt-1 text-slate-700">Assigned: {assignedSurvivors.length}</p>
                  <NavLink to="/worker/survivors" className="mt-2 inline-flex rounded border border-blue-300 px-3 py-1.5 text-xs text-blue-700">Open</NavLink>
                </article>
                <article className="rounded-xl border bg-slate-50 p-3">
                  <h2 className="font-semibold text-blue-900">Missing Reports</h2>
                  <p className="mt-1 text-slate-700">Available records: {missingRecords.length}</p>
                  <NavLink to="/worker/missing" className="mt-2 inline-flex rounded border border-blue-300 px-3 py-1.5 text-xs text-blue-700">Open</NavLink>
                </article>
              </div>
            </section>
          ) : null}

          {currentTab === 'availability' ? (
            <section className="mt-4 rounded-xl border bg-slate-50 p-3 text-sm">
              <h2 className="font-semibold text-blue-900">My Availability Status</h2>
              <p className="mt-1 text-xs text-slate-600">Status is automatic: if any task is assigned and active, it becomes On-Task; otherwise Available.</p>
              <p className="mt-2 text-sm"><span className="font-semibold">Current:</span> {workerProfile?.availability_status || '-'}</p>
              <button
                onClick={updateMyStatus}
                disabled={updatingMyStatus}
                className="mt-2 rounded border border-blue-300 px-3 py-1.5 text-xs text-blue-700 disabled:opacity-60"
              >
                {updatingMyStatus ? 'Syncing...' : 'Sync From Assignments'}
              </button>
            </section>
          ) : null}

          {currentTab === 'transactions' ? (
            <section className="mt-4 rounded-xl border bg-slate-50 p-3 text-sm">
              <h2 className="font-semibold text-blue-900">Website Wallet Transfer</h2>
              <p className="mt-1 text-xs text-slate-600">Open the dedicated page for transfer overview, history, payments, and invoices.</p>
              <Link to="/worker/transactions/overview" className="mt-3 inline-flex rounded-lg bg-blue-900 px-4 py-2 text-sm text-white">
                Open Transactions Page
              </Link>
            </section>
          ) : null}

          {currentTab === 'survivors' ? (
            <section className="mt-4 rounded-xl border bg-slate-50 p-3 text-sm">
              <h2 className="font-semibold text-blue-900">Assigned Survivor Requests</h2>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {assignedSurvivors.map((item) => (
                  <article key={item.id} className="rounded-lg border bg-white p-2">
                    <p className="font-semibold">{item.name}</p>
                    <p><span className="font-semibold">Need:</span> {item.voice_transcript || '-'}</p>
                    <p><span className="font-semibold">Location:</span> {item.location_text || '-'}</p>
                    <p><span className="font-semibold">Request Status:</span> {item.request_status || 'open'}</p>
                    <p><span className="font-semibold">NGO Confirmation:</span> {item.worker_response_status || 'pending'}</p>
                    <p><span className="font-semibold">Phone:</span> {item.phone || '-'}</p>
                    <p><span className="font-semibold">Medical:</span> {item.needs_medical ? 'Yes' : 'No'}</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => respondToSurvivorRequest(item.id, 'accept')}
                        disabled={Boolean(actionTaskId) || item.request_status === 'accepted_by_worker' || item.request_status === 'in_progress' || item.request_status === 'completed'}
                        className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700 disabled:opacity-60"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => respondToSurvivorRequest(item.id, 'reject')}
                        disabled={Boolean(actionTaskId) || item.request_status === 'rejection_pending_ngo'}
                        className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 disabled:opacity-60"
                      >
                        Reject (Needs NGO Confirm)
                      </button>
                    </div>
                  </article>
                ))}
                {assignedSurvivors.length === 0 ? <p className="text-slate-500">No survivor requests assigned to you.</p> : null}
              </div>
            </section>
          ) : null}

          {currentTab === 'missing' ? (
            <section className="mt-4 rounded-xl border bg-slate-50 p-3 text-sm">
              <h2 className="font-semibold text-blue-900">Missing Person Reports</h2>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <input
                  className="rounded border px-3 py-2"
                  placeholder="Search name, status, verification, contact..."
                  value={missingQuery}
                  onChange={(e) => setMissingQuery(e.target.value)}
                />
                <select
                  className="rounded border px-3 py-2"
                  value={missingStatusFilter}
                  onChange={(e) => setMissingStatusFilter(e.target.value)}
                >
                  <option value="all">All status</option>
                  <option value="missing">Missing</option>
                  <option value="found_pending_verification">Found Pending Verification</option>
                  <option value="found_verified">Found Verified</option>
                </select>
                <select
                  className="rounded border px-3 py-2"
                  value={missingVerificationFilter}
                  onChange={(e) => setMissingVerificationFilter(e.target.value)}
                >
                  <option value="all">All verification</option>
                  <option value="not_required">Not Required</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                </select>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {filteredMissingRecords.slice(0, 12).map((item) => (
                  <article key={item.id} className="rounded-lg border bg-white p-2">
                    <p className="font-semibold">{item.name}</p>
                    <p><span className="font-semibold">Status:</span> {item.case_status || 'missing'}</p>
                    <p><span className="font-semibold">Verification:</span> {item.verification_status || 'not_required'}</p>
                    <p><span className="font-semibold">Finder Contact:</span> {item.found_reporter_contact || '-'}</p>
                    <button
                      onClick={() => reportFoundMissing(item)}
                      disabled={Boolean(actionTaskId) || item.case_status === 'found_verified' || item.case_status === 'found_pending_verification'}
                      className="mt-2 rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700 disabled:opacity-60"
                    >
                      Report Found
                    </button>
                  </article>
                ))}
                {missingRecords.length === 0 ? <p className="text-slate-500">No missing person records available.</p> : null}
                {missingRecords.length > 0 && filteredMissingRecords.length === 0 ? <p className="text-slate-500">No records match your search/filter.</p> : null}
              </div>
            </section>
          ) : null}

          {currentTab === 'tasks' ? (
            <>
              {myParcelDonations.length > 0 ? (
                <section className="mt-4 rounded-xl border bg-slate-50 p-3 text-sm">
                  <h3 className="font-semibold text-blue-900">Donor Parcel Status (Assigned to You)</h3>
                  <p className="mt-1 text-xs text-slate-600">Update pickup and distribution status for donor item parcels assigned by admin.</p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {myParcelDonations.map((d) => {
                      const busy = Boolean(actionTaskId)
                      return (
                        <article key={d.id} className="rounded-lg border bg-white p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold">{d.donor_name || 'Donor'}</p>
                            <span className="rounded-full border bg-slate-50 px-2 py-1 text-xs">{d.status || 'submitted'}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600">Type: {d.item_type === 'other' ? d.custom_item || 'other' : d.item_type} | Qty: {d.quantity || 1}</p>
                          <p className="text-xs text-slate-600">Incident: {d.incident_ref || '-'}</p>
                          <p className="text-xs text-slate-600">Contact: {d.donor_phone || '-'}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              onClick={() => updateParcelStatus(d, 'picked_up')}
                              disabled={busy || !['worker_assigned', 'picked_up'].includes(d.status)}
                              className="rounded border border-amber-300 px-2 py-1 text-xs text-amber-700 disabled:opacity-60"
                            >
                              Mark Picked Up
                            </button>
                            <button
                              onClick={() => updateParcelStatus(d, 'distributed')}
                              disabled={busy || !['picked_up', 'distributed'].includes(d.status)}
                              className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700 disabled:opacity-60"
                            >
                              Mark Distributed
                            </button>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </section>
              ) : null}

              <div className="mt-4 grid gap-2 text-sm md:grid-cols-4">
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Search title, description, status..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <select className="border rounded-lg px-3 py-2" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All status</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
                <select className="border rounded-lg px-3 py-2" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                  <option value="all">All priority</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select className="border rounded-lg px-3 py-2" value={ownershipFilter} onChange={(e) => setOwnershipFilter(e.target.value)}>
                  <option value="mine_or_unassigned">Mine + Unassigned</option>
                  <option value="mine">Only Mine</option>
                  <option value="unassigned">Only Unassigned</option>
                  <option value="all">All assignments</option>
                </select>
              </div>

              <p className="mt-3 text-xs text-slate-600">Tasks are shown one by one. Click a card to view full details.</p>
              <div className="mt-4 grid gap-3 text-sm">
	                {visibleTasks.map((task) => {
	                  const isMine = task.assigned_worker_id && task.assigned_worker_id === workerId
	                  const isUnassigned = !task.assigned_worker_id
	                  const isBusy = actionTaskId === task.id
                    const isAdminSpecial = task.is_admin_special || task.assignment_tag === 'admin_special' || task.created_by_role === 'admin'
	                  return (
                    <article
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition hover:border-blue-300"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">{task.title}</p>
                          <p className="mt-1 text-xs text-slate-500">{task.description || 'No description provided.'}</p>
                        </div>
	                        <div className="flex flex-wrap gap-2 text-xs">
	                          <span className="rounded-full border bg-slate-50 px-2 py-1">{task.status || 'open'}</span>
	                          <span className="rounded-full border bg-orange-50 px-2 py-1 text-orange-700">{task.priority || 'medium'}</span>
                            {isAdminSpecial ? <span className="rounded-full border border-indigo-300 bg-indigo-50 px-2 py-1 font-semibold text-indigo-800">Admin Special</span> : null}
	                        </div>
	                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <p><span className="font-semibold">Assigned:</span> {isMine ? 'You' : (isUnassigned ? 'Unassigned' : 'Another employee')}</p>
                        <p><span className="font-semibold">Created:</span> {formatDate(task.created_at)}</p>
                        <p className="col-span-2"><span className="font-semibold">Task ID:</span> {task.id}</p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {task.status === 'open' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              updateTask(task, { status: 'in_progress', assigned_worker_id: workerId }, 'Task claimed and started.')
                            }}
                            disabled={isBusy || !workerId}
                            className="rounded border border-blue-300 px-3 py-1.5 text-xs text-blue-700 disabled:opacity-60"
                          >
                            Claim & Start
                          </button>
                        ) : null}
                        {task.status === 'in_progress' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              updateTask(task, { status: 'completed', assigned_worker_id: task.assigned_worker_id || workerId }, 'Task marked completed.')
                            }}
                            disabled={isBusy || (!isMine && !isUnassigned)}
                            className="rounded border border-emerald-300 px-3 py-1.5 text-xs text-emerald-700 disabled:opacity-60"
                          >
                            Complete
                          </button>
                        ) : null}
                        {task.status === 'completed' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              updateTask(task, { status: 'open', assigned_worker_id: null }, 'Task reopened and unassigned.')
                            }}
                            disabled={isBusy}
                            className="rounded border border-amber-300 px-3 py-1.5 text-xs text-amber-700 disabled:opacity-60"
                          >
                            Reopen
                          </button>
                        ) : null}
                        {(isMine && task.status !== 'completed') ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              updateTask(task, { status: 'open', assigned_worker_id: null }, 'Task released to queue.')
                            }}
                            disabled={isBusy}
                            className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 disabled:opacity-60"
                          >
                            Release
                          </button>
                        ) : null}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedTask(task)
                          }}
                          className="rounded border border-indigo-300 px-3 py-1.5 text-xs text-indigo-700"
                        >
                          View Details
                        </button>
                      </div>
                    </article>
                  )
                })}
                {!loading && visibleTasks.length === 0 ? (
                  <article className="rounded-xl border border-dashed bg-slate-50 p-5 text-sm text-slate-500">
                    No tasks match your filters.
                  </article>
                ) : null}
                {loading ? (
                  <article className="rounded-xl border bg-slate-50 p-5 text-sm text-slate-500">
                    Loading tasks...
                  </article>
                ) : null}
	              </div>

            </>
          ) : null}

          {msg ? <p className="mt-3 text-sm text-slate-700">{msg}</p> : null}
        </section>

        {selectedTask ? (
          <section className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 p-4 pt-32">
            <article className="w-full max-w-lg max-h-[calc(100vh-9rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-2xl break-words">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-bold text-blue-900">Task Details</h2>
                <button onClick={() => setSelectedTask(null)} className="rounded border px-3 py-1 text-sm">Close</button>
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p><span className="font-semibold">Title:</span> {selectedTask.title || '-'}</p>
                <p><span className="font-semibold">Description:</span> {selectedTask.description || '-'}</p>
                <p><span className="font-semibold">Priority:</span> {selectedTask.priority || '-'}</p>
                <p><span className="font-semibold">Status:</span> {selectedTask.status || '-'}</p>
                <p><span className="font-semibold">Assigned Employee ID:</span> {selectedTask.assigned_worker_id || 'Unassigned'}</p>
                <p><span className="font-semibold">NGO ID:</span> {selectedTask.ngo_id || '-'}</p>
                <p><span className="font-semibold">Created At:</span> {formatDate(selectedTask.created_at)}</p>
                <p><span className="font-semibold">Updated At:</span> {formatDate(selectedTask.updated_at)}</p>
                <p><span className="font-semibold">Category:</span> {selectedTask.category || '-'}</p>
                <p><span className="font-semibold">Assignment Tag:</span> {selectedTask.assignment_tag || '-'}</p>
                <p><span className="font-semibold">Special:</span> {selectedTask.is_admin_special ? 'Admin Special Task' : 'Standard'}</p>
                <p><span className="font-semibold">Location:</span> {selectedTask.location_text || '-'}</p>
                <p><span className="font-semibold">Survivor ID:</span> {selectedTask.survivor_id || '-'}</p>
                <p><span className="font-semibold">Created By:</span> {selectedTask.created_by_user_id || '-'}</p>
                <p><span className="font-semibold">Task ID:</span> {selectedTask.id}</p>
              </div>
            </article>
          </section>
        ) : null}

      </div>
    </main>
  )
}
