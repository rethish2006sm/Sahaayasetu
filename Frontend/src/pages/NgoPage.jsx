import { useEffect, useMemo, useState } from 'react'
import RoleNav from '../components/RoleNav'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/api'

const tabs = [
  ['inventory', 'Inventory'],
  ['volunteers', 'Volunteers'],
  ['compensation', 'Compensation'],
  ['tasks', 'Tasks'],
  ['tracking', 'Tracking'],
  ['disaster', 'Disaster'],
  ['missing', 'Missing'],
  ['alerts', 'Alerts'],
]

export default function NgoPage() {
  const { token, user } = useAuth()
  const [tab, setTab] = useState('inventory')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [sectionErrors, setSectionErrors] = useState({})
  const [actionLoading, setActionLoading] = useState('')
  const [lang, setLang] = useState('en')

  const [inventory, setInventory] = useState([])
  const [insights, setInsights] = useState({ shortage_alerts: [], duplication_flags: [] })
  const [workers, setWorkers] = useState([])
  const [tasks, setTasks] = useState([])
  const [alerts, setAlerts] = useState([])
  const [survivors, setSurvivors] = useState([])
  const [missing, setMissing] = useState([])
  const [missingMatches, setMissingMatches] = useState([])
  const [ngos, setNgos] = useState([])
  const [shelters, setShelters] = useState([])
  const [q, setQ] = useState('')
  const [workerQuery, setWorkerQuery] = useState('')
  const [workerStatusFilter, setWorkerStatusFilter] = useState('all')
  const [taskQuery, setTaskQuery] = useState('')
  const [taskStatusFilter, setTaskStatusFilter] = useState('all')
  const [taskPriorityFilter, setTaskPriorityFilter] = useState('all')
  const [taskAssignmentFilter, setTaskAssignmentFilter] = useState('all')
  const [rescueQuery, setRescueQuery] = useState('')
  const [rescueStatusFilter, setRescueStatusFilter] = useState('all')
  const [rescueMedicalFilter, setRescueMedicalFilter] = useState('all')
  const [rescueUrgencyFilter, setRescueUrgencyFilter] = useState('all')
  const [alertsView, setAlertsView] = useState('targeted')
  const [alertQuery, setAlertQuery] = useState('')
  const [alertSeverityFilter, setAlertSeverityFilter] = useState('all')
  const [alertChannelFilter, setAlertChannelFilter] = useState('all')
  const [showAlertCreateModal, setShowAlertCreateModal] = useState(false)
  const [shelterQuery, setShelterQuery] = useState('')
  const [shelterTypeFilter, setShelterTypeFilter] = useState('all')
  const [shelterAvailabilityFilter, setShelterAvailabilityFilter] = useState('all')
  const [showShelterCreateModal, setShowShelterCreateModal] = useState(false)
  const [shelterDeltaDrafts, setShelterDeltaDrafts] = useState({})
  const [showTaskCreateModal, setShowTaskCreateModal] = useState(false)
  const [showCompletedTasksModal, setShowCompletedTasksModal] = useState(false)
  const [selectedMissing, setSelectedMissing] = useState(null)
  const [selectedWorkerId, setSelectedWorkerId] = useState('')
  const [survivorAssignDrafts, setSurvivorAssignDrafts] = useState({})
  const [walletMe, setWalletMe] = useState(null)
  const [walletSharePhone, setWalletSharePhone] = useState('')
  const [walletDirectory, setWalletDirectory] = useState([])
  const [walletTransfers, setWalletTransfers] = useState([])
  const [walletTransferForm, setWalletTransferForm] = useState({
    to_user_id: '',
    phone: '',
    amount: '',
    note: '',
  })
  const [compAccount, setCompAccount] = useState(null)
  const [compTransactions, setCompTransactions] = useState([])
  const [compPage, setCompPage] = useState('overview')
  const [compPayForm, setCompPayForm] = useState({
    amount: '',
    merchant_name: '',
    purpose: '',
    note: '',
  })
  const [compWithdrawForm, setCompWithdrawForm] = useState({
    amount: '',
    account_holder: '',
    bank_name: '',
    account_number: '',
    ifsc: '',
    note: '',
  })
  const [compTopupForm, setCompTopupForm] = useState({
    amount: '',
    note: '',
  })

  const [invForm, setInvForm] = useState({
    resource_type: '',
    quantity: 0,
    location: '',
    expiration_date: '',
    estimated_need: 100,
    ngo_name: user?.name || '',
  })
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', assigned_worker_id: '' })
  const [alertForm, setAlertForm] = useState({
    title: '',
    message: '',
    severity: 'medium',
    channel: 'web',
    target_location: '',
    radius_km: 5,
    language: 'en',
  })
  const [ngoForm, setNgoForm] = useState({
    name: user?.name || '',
    contact: '',
    location: '',
    specialization: '',
    lat: '',
    lon: '',
  })
  const [shelterForm, setShelterForm] = useState({
    name: '',
    location: '',
    contact: '',
    shelter_type: '',
    capacity: 100,
    occupied: 0,
  })

  const handleSectionFetch = async (name, fn) => {
    try {
      await fn()
      setSectionErrors((prev) => {
        if (!prev[name]) return prev
        const next = { ...prev }
        delete next[name]
        return next
      })
    } catch (err) {
      setSectionErrors((prev) => ({
        ...prev,
        [name]: err?.message || 'Failed to load data',
      }))
    }
  }

  const fetchInventory = async () => {
    const data = await apiRequest('/v1/platform/inventory', { token })
    setInventory(data || [])
  }

  const fetchInventoryInsights = async () => {
    const data = await apiRequest('/v1/platform/inventory/insights', { token })
    const safeData = data || {}
    setInsights({
      shortage_alerts: safeData.shortage_alerts || [],
      duplication_flags: safeData.duplication_flags || [],
      ...safeData,
    })
  }

  const fetchWorkers = async () => {
    const data = await apiRequest('/v1/platform/workers', { token })
    setWorkers(data || [])
  }

  const fetchTasks = async () => {
    const data = await apiRequest('/v1/platform/tasks', { token })
    setTasks(data || [])
  }

  const fetchAlerts = async () => {
    const data = await apiRequest('/v1/platform/alerts', { token })
    setAlerts(data || [])
  }

  const fetchSurvivors = async () => {
    const data = await apiRequest('/v1/survivors', { token })
    setSurvivors(data || [])
  }

  const fetchMissing = async () => {
    const data = await apiRequest('/v1/platform/missing-persons', { token })
    setMissing(data || [])
  }

  const fetchNgos = async () => {
    const data = await apiRequest('/v1/platform/ngos', { token })
    setNgos(data || [])
  }

  const fetchShelters = async () => {
    const data = await apiRequest('/v1/platform/shelters', { token })
    const normalized = (data || []).map((item) => {
      const capacity = Number(item.capacity || 0)
      const occupied = Number(item.occupancy ?? item.occupied ?? 0)
      return {
        ...item,
        occupied,
        available: Math.max(capacity - occupied, 0),
        location: item.location_text || item.location || 'Not provided',
        contact: item.contact_phone || item.contact || 'Not provided',
        shelter_type: item.shelter_type || item.type || 'General',
      }
    })
    setShelters(normalized)
  }

  const fetchWallet = async () => {
    const data = await apiRequest('/v1/platform/wallet/me', { token })
    setWalletMe(data?.account || null)
    setWalletSharePhone(data?.share_phone || '')
  }

  const fetchWalletDirectory = async () => {
    const data = await apiRequest('/v1/platform/wallet/directory', { token })
    setWalletDirectory(data || [])
  }

  const fetchWalletTransfers = async () => {
    const data = await apiRequest('/v1/platform/wallet/transactions', { token })
    setWalletTransfers(data || [])
  }

  const fetchCompAccounts = async () => {
    const data = await apiRequest('/v1/platform/compensation/accounts', { token })
    setCompAccount((data || [])[0] || null)
  }

  const fetchCompTransactions = async () => {
    const data = await apiRequest('/v1/platform/compensation/transactions', { token })
    setCompTransactions(data || [])
  }

  const loadData = async ({ notify = false } = {}) => {
    if (!token) return
    setLoading(true)
    await Promise.all([
      handleSectionFetch('inventory', fetchInventory),
      handleSectionFetch('inventory_insights', fetchInventoryInsights),
      handleSectionFetch('workers', fetchWorkers),
      handleSectionFetch('tasks', fetchTasks),
      handleSectionFetch('alerts', fetchAlerts),
      handleSectionFetch('survivors', fetchSurvivors),
      handleSectionFetch('missing', fetchMissing),
      handleSectionFetch('ngos', fetchNgos),
      handleSectionFetch('shelters', fetchShelters),
      handleSectionFetch('wallet', fetchWallet),
      handleSectionFetch('wallet_directory', fetchWalletDirectory),
      handleSectionFetch('wallet_transactions', fetchWalletTransfers),
      handleSectionFetch('comp_accounts', fetchCompAccounts),
      handleSectionFetch('comp_transactions', fetchCompTransactions),
    ])
    if (notify) setMsg('Updated successfully.')
    setLoading(false)
  }

  const formatSectionLabel = (label) => label.replace(/_/g, ' ')

  useEffect(() => {
    if (!token) return
    loadData()
  }, [token])

  useEffect(() => {
    if (!token) return undefined
    const timer = setInterval(() => {
      loadData()
    }, 10000)
    return () => clearInterval(timer)
  }, [token])

  useEffect(() => {
    if (!msg) return
    const timer = setTimeout(() => setMsg(''), 3500)
    return () => clearTimeout(timer)
  }, [msg])

  const submit = async (path, body, ok) => {
    if (actionLoading) return false
    setActionLoading('Saving...')
    try {
      await apiRequest(path, { method: 'POST', token, body })
      setMsg(ok)
      await loadData()
      return true
    } catch (err) {
      setMsg(err.message)
      return false
    } finally {
      setActionLoading('')
    }
  }

  const remove = async (path, ok) => {
    if (actionLoading) return
    setActionLoading('Deleting...')
    try {
      await apiRequest(path, { method: 'DELETE', token })
      setMsg(ok)
      await loadData()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setActionLoading('')
    }
  }


  const updateShelterOccupancy = async (shelterId, payload, okMessage) => {
    if (actionLoading) return
    setActionLoading('Updating occupancy...')
    try {
      await apiRequest(`/v1/platform/shelters/${shelterId}/occupancy`, {
        method: 'PATCH',
        token,
        body: payload,
      })
      setMsg(okMessage)
      await loadData()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setActionLoading('')
    }
  }

  const assignWorkerToSurvivor = async (survivorId) => {
    if (actionLoading) return
    const assigned_worker_id = survivorAssignDrafts[survivorId] || null
    setActionLoading('Assigning worker...')
    try {
      await apiRequest(`/v1/platform/survivor-requests/${survivorId}/assign`, {
        method: 'PATCH',
        token,
        body: { assigned_worker_id },
      })
      setMsg(assigned_worker_id ? 'Worker assigned to survivor request successfully.' : 'Worker unassigned successfully.')
      await loadData()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setActionLoading('')
    }
  }

  const confirmWorkerRejection = async (survivorId, decision) => {
    if (actionLoading) return
    setActionLoading('Updating NGO confirmation...')
    try {
      await apiRequest(`/v1/platform/survivor-requests/${survivorId}/confirm-rejection`, {
        method: 'PATCH',
        token,
        body: { decision },
      })
      setMsg(decision === 'confirm_reject' ? 'Rejection confirmed. Request moved back to open queue.' : 'Assignment kept with worker.')
      await loadData()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setActionLoading('')
    }
  }

  const verifyFoundReport = async (missingId, decision) => {
    if (actionLoading) return
    setActionLoading('Updating verification...')
    try {
      await apiRequest(`/v1/platform/missing-persons/${missingId}/verify-found`, {
        method: 'PATCH',
        token,
        body: { decision },
      })
      setMsg(decision === 'approve' ? 'Found report verified successfully.' : 'Found report rejected and moved back to missing.')
      await loadData()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setActionLoading('')
    }
  }

  const reportFoundFromNgo = async (item) => {
    if (actionLoading) return
    const contact = window.prompt('Enter finder contact number/details for verification:', item.reporter_contact || '')
    if (contact === null) return
    setActionLoading('Reporting found status...')
    try {
      await apiRequest(`/v1/platform/missing-persons/${item.id}/report-found`, {
        method: 'PATCH',
        token,
        body: {
          found_notes: 'Reported from NGO portal',
          found_reporter_contact: contact || null,
        },
      })
      setMsg('Found status submitted. Awaiting NGO/Admin verification.')
      await loadData()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setActionLoading('')
    }
  }

  const sendWalletBySelection = async (e) => {
    e.preventDefault()
    if (actionLoading) return
    setActionLoading('Sending wallet transfer...')
    try {
      await apiRequest('/v1/platform/wallet/transfer', {
        method: 'POST',
        token,
        body: {
          to_user_id: walletTransferForm.to_user_id,
          amount: Number(walletTransferForm.amount),
          note: walletTransferForm.note || null,
        },
      })
      setMsg('Wallet transfer completed.')
      setWalletTransferForm((p) => ({ ...p, to_user_id: '', amount: '', note: '' }))
      await loadData()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setActionLoading('')
    }
  }

  const sendWalletByPhone = async (e) => {
    e.preventDefault()
    if (actionLoading) return
    setActionLoading('Sending mobile-number wallet transfer...')
    try {
      await apiRequest('/v1/platform/wallet/transfer/by-phone', {
        method: 'POST',
        token,
        body: {
          phone: walletTransferForm.phone,
          amount: Number(walletTransferForm.amount),
          note: walletTransferForm.note || null,
        },
      })
      setMsg('Mobile-number wallet transfer completed.')
      setWalletTransferForm((p) => ({ ...p, phone: '', amount: '', note: '', to_user_id: '' }))
      await loadData()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setActionLoading('')
    }
  }

  const payWithCompensation = async (e) => {
    e.preventDefault()
    if (actionLoading) return
    setActionLoading('Processing compensation payment...')
    try {
      await apiRequest('/v1/platform/compensation/pay', {
        method: 'POST',
        token,
        body: {
          amount: Number(compPayForm.amount),
          merchant_name: compPayForm.merchant_name || null,
          purpose: compPayForm.purpose || null,
          note: compPayForm.note || null,
        },
      })
      setMsg('Compensation payment completed successfully.')
      setCompPayForm({ amount: '', merchant_name: '', purpose: '', note: '' })
      await loadData()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setActionLoading('')
    }
  }

  const requestCompensationWithdraw = async (e) => {
    e.preventDefault()
    if (actionLoading) return
    setActionLoading('Submitting compensation withdraw request...')
    try {
      await apiRequest('/v1/platform/compensation/withdraw-request', {
        method: 'POST',
        token,
        body: {
          amount: Number(compWithdrawForm.amount),
          account_holder: compWithdrawForm.account_holder,
          bank_name: compWithdrawForm.bank_name,
          account_number: compWithdrawForm.account_number,
          ifsc: compWithdrawForm.ifsc,
          note: compWithdrawForm.note || null,
        },
      })
      setMsg('Compensation withdraw request submitted.')
      setCompWithdrawForm({ amount: '', account_holder: '', bank_name: '', account_number: '', ifsc: '', note: '' })
      await loadData()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setActionLoading('')
    }
  }

  const topupFromCompensation = async (e) => {
    e.preventDefault()
    if (actionLoading) return
    setActionLoading('Moving compensation to website wallet...')
    try {
      await apiRequest('/v1/platform/wallet/topup-from-compensation', {
        method: 'POST',
        token,
        body: {
          amount: Number(compTopupForm.amount),
          note: compTopupForm.note || null,
        },
      })
      setMsg('Amount moved to website wallet successfully.')
      setCompTopupForm({ amount: '', note: '' })
      await loadData()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setActionLoading('')
    }
  }

  const formatInvoiceDate = (raw) => {
    if (!raw) return 'Unknown'
    const dt = new Date(raw)
    if (Number.isNaN(dt.getTime())) return String(raw)
    return dt.toLocaleString()
  }

  const compensationSummary = useMemo(() => {
    const compBalance = Number(compAccount?.balance || 0)
    const compCredited = Number(compAccount?.total_credited || 0)
    const compSpent = Number(compAccount?.total_spent || 0)
    const compWithdrawn = Number(compAccount?.total_withdrawn || 0)
    const websiteBalance = compBalance
    const websiteReceived = Number(walletMe?.total_received || 0)
    const websiteSent = Number(walletMe?.total_sent || 0)
    const totalAvailable = compBalance
    const totalSpent = compSpent + websiteSent
    return {
      compBalance,
      compCredited,
      compSpent,
      compWithdrawn,
      websiteBalance,
      websiteReceived,
      websiteSent,
      totalAvailable,
      totalSpent,
    }
  }, [compAccount, walletMe])

  const compensationInvoiceRows = useMemo(() => {
    const comp = compTransactions.map((tx) => ({
      invoiceNo: `INV-COMP-${String(tx.id || '').slice(0, 8).toUpperCase()}`,
      source: 'Compensation Wallet',
      txType: tx.tx_type || 'transaction',
      status: tx.status || 'completed',
      amount: Number(tx.amount || 0),
      date: tx.processed_at || tx.created_at,
      note: tx.note || tx.review_note || '-',
      from: user?.name || user?.id || '-',
      to: tx.merchant_name || tx.bank_details?.account_holder || '-',
      id: tx.id,
    }))
    const web = walletTransfers.map((tx) => ({
      invoiceNo: `INV-WEB-${String(tx.id || '').slice(0, 8).toUpperCase()}`,
      source: 'Website Wallet',
      txType: tx.tx_type || 'transfer',
      status: tx.status || 'completed',
      amount: Number(tx.amount || 0),
      date: tx.created_at,
      note: tx.note || '-',
      from: tx.from_user_id || '-',
      to: tx.to_user_id || '-',
      id: tx.id,
    }))
    return [...comp, ...web].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
  }, [compTransactions, walletTransfers, user?.name, user?.id])

  const rescueQueue = useMemo(
    () => [...survivors].sort((a, b) => Number(b.priority_score || 0) - Number(a.priority_score || 0)).slice(0, 25),
    [survivors],
  )
  const filteredRescueQueue = useMemo(() => {
    const query = rescueQuery.trim().toLowerCase()
    return rescueQueue.filter((item) => {
      const score = Number(item.priority_score || 0)
      const urgency = score >= 80 ? 'critical' : (score >= 60 ? 'high' : (score >= 40 ? 'medium' : 'low'))
      if (rescueStatusFilter !== 'all' && String(item.request_status || 'open').toLowerCase() !== rescueStatusFilter) return false
      if (rescueMedicalFilter === 'medical_only' && !item.needs_medical) return false
      if (rescueMedicalFilter === 'non_medical' && item.needs_medical) return false
      if (rescueUrgencyFilter !== 'all' && urgency !== rescueUrgencyFilter) return false
      if (!query) return true
      return (
        String(item.name || '').toLowerCase().includes(query) ||
        String(item.location_text || '').toLowerCase().includes(query) ||
        String(item.phone || '').toLowerCase().includes(query) ||
        String(item.source || '').toLowerCase().includes(query) ||
        String(item.assigned_worker_name || '').toLowerCase().includes(query)
      )
    })
  }, [rescueQueue, rescueQuery, rescueStatusFilter, rescueMedicalFilter, rescueUrgencyFilter])
  const filteredCriticalCount = useMemo(
    () => filteredRescueQueue.filter((item) => Number(item.priority_score || 0) >= 80).length,
    [filteredRescueQueue],
  )
  const filteredMedicalCount = useMemo(
    () => filteredRescueQueue.filter((item) => item.needs_medical).length,
    [filteredRescueQueue],
  )
  const filteredWorkers = useMemo(() => {
    const query = workerQuery.trim().toLowerCase()
    return workers.filter((w) => {
      if (workerStatusFilter !== 'all' && w.availability_status !== workerStatusFilter) return false
      if (!query) return true
      return (
        String(w.name || '').toLowerCase().includes(query) ||
        String(w.phone || '').toLowerCase().includes(query) ||
        String(w.coverage_area || '').toLowerCase().includes(query) ||
        String((w.skills || []).join(',')).toLowerCase().includes(query)
      )
    })
  }, [workers, workerQuery, workerStatusFilter])
  const workerStatusSummary = useMemo(() => {
    const available = workers.filter((w) => w.availability_status === 'Available').length
    const onTask = workers.filter((w) => w.availability_status === 'On-Task').length
    const unavailable = workers.filter((w) => w.availability_status === 'Unavailable').length
    return { available, onTask, unavailable, total: workers.length }
  }, [workers])
  const workerByAssigneeId = useMemo(() => {
    const map = new Map()
    workers.forEach((w) => {
      if (w.id) map.set(w.id, w)
      if (w.linked_user_id) map.set(w.linked_user_id, w)
    })
    return map
  }, [workers])
  const filteredTasks = useMemo(() => {
    const query = taskQuery.trim().toLowerCase()
    return tasks.filter((t) => {
      const isAssigned = Boolean(t.assigned_worker_id || t.assigned_worker_name)
      if (taskStatusFilter !== 'all' && String(t.status || '').toLowerCase() !== taskStatusFilter) return false
      if (taskPriorityFilter !== 'all' && String(t.priority || '').toLowerCase() !== taskPriorityFilter) return false
      if (taskAssignmentFilter === 'assigned' && !isAssigned) return false
      if (taskAssignmentFilter === 'unassigned' && isAssigned) return false
      if (!query) return true
      return (
        String(t.title || '').toLowerCase().includes(query) ||
        String(t.description || '').toLowerCase().includes(query) ||
        String(t.status || '').toLowerCase().includes(query) ||
        String(t.priority || '').toLowerCase().includes(query) ||
        String(t.assigned_worker_name || '').toLowerCase().includes(query) ||
        String(t.assigned_worker_id || '').toLowerCase().includes(query)
      )
    })
  }, [tasks, taskQuery, taskStatusFilter, taskPriorityFilter, taskAssignmentFilter])
  const filteredAlerts = useMemo(() => {
    const query = alertQuery.trim().toLowerCase()
    return alerts.filter((a) => {
      if (alertSeverityFilter !== 'all' && String(a.severity || '').toLowerCase() !== alertSeverityFilter) return false
      if (alertChannelFilter !== 'all' && String(a.channel || '').toLowerCase() !== alertChannelFilter) return false
      if (!query) return true
      return (
        String(a.title || '').toLowerCase().includes(query) ||
        String(a.message || '').toLowerCase().includes(query) ||
        String(a.target_location || '').toLowerCase().includes(query)
      )
    })
  }, [alerts, alertQuery, alertSeverityFilter, alertChannelFilter])
  const filteredShelters = useMemo(() => {
    const query = shelterQuery.trim().toLowerCase()
    return shelters.filter((s) => {
      const type = String(s.shelter_type || '').toLowerCase()
      const available = Number(s.available ?? Math.max((Number(s.capacity || 0) - Number(s.occupied || 0)), 0))
      if (shelterTypeFilter !== 'all' && type !== shelterTypeFilter) return false
      if (shelterAvailabilityFilter === 'available_only' && available <= 0) return false
      if (shelterAvailabilityFilter === 'full_only' && available > 0) return false
      if (!query) return true
      return (
        String(s.name || '').toLowerCase().includes(query) ||
        String(s.location || '').toLowerCase().includes(query) ||
        String(s.contact || '').toLowerCase().includes(query) ||
        type.includes(query)
      )
    })
  }, [shelters, shelterQuery, shelterTypeFilter, shelterAvailabilityFilter])
  const workerTaskSummaryByWorkerId = useMemo(() => {
    const matchesWorker = (worker, task) => {
      const keys = [worker.id, worker.linked_user_id].filter(Boolean)
      if (keys.includes(task.assigned_worker_id)) return true
      const taskName = String(task.assigned_worker_name || '').trim().toLowerCase()
      const workerName = String(worker.name || '').trim().toLowerCase()
      if (taskName && workerName && taskName === workerName) return true
      return false
    }

    const summary = new Map()
    workers.forEach((w) => {
      const assignedTasks = tasks.filter((t) => matchesWorker(w, t))
      const open = assignedTasks.filter((t) => t.status === 'open').length
      const inProgress = assignedTasks.filter((t) => t.status === 'in_progress').length
      const completed = assignedTasks.filter((t) => t.status === 'completed').length
      const activeNow = assignedTasks.filter((t) => t.status === 'in_progress')
      summary.set(w.id, {
        total: assignedTasks.length,
        open,
        inProgress,
        completed,
        activeNow,
        tasks: assignedTasks,
      })
    })
    return summary
  }, [workers, tasks])
  const selectedWorker = useMemo(
    () => workers.find((w) => w.id === selectedWorkerId) || null,
    [workers, selectedWorkerId],
  )
  const taskTrackingSummary = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter((t) => t.status === 'completed').length
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length
    const open = tasks.filter((t) => t.status === 'open').length
    const completionRate = total ? Math.round((completed / total) * 100) : 0
    return { total, completed, inProgress, open, completionRate }
  }, [tasks])
  const upcomingTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status === 'open' || t.status === 'in_progress')
        .sort((a, b) => {
          const aTime = new Date(a.created_at || 0).getTime()
          const bTime = new Date(b.created_at || 0).getTime()
          return bTime - aTime
        }),
    [tasks],
  )
  const completedTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status === 'completed')
        .sort((a, b) => {
          const aTime = new Date(a.created_at || 0).getTime()
          const bTime = new Date(b.created_at || 0).getTime()
          return bTime - aTime
        }),
    [tasks],
  )

  const getUrgency = (score) => {
    const normalized = Number(score || 0)
    if (normalized >= 80) return { label: 'Critical', tone: 'bg-red-100 text-red-700 border-red-200' }
    if (normalized >= 60) return { label: 'High', tone: 'bg-orange-100 text-orange-700 border-orange-200' }
    if (normalized >= 40) return { label: 'Medium', tone: 'bg-amber-100 text-amber-700 border-amber-200' }
    return { label: 'Low', tone: 'bg-slate-100 text-slate-700 border-slate-200' }
  }

  const formatWhen = (raw) => {
    if (!raw) return 'Unknown'
    const dt = new Date(raw)
    if (Number.isNaN(dt.getTime())) return String(raw)
    return dt.toLocaleString()
  }

  return (
    <main className="min-h-screen bg-slate-100 p-0">
      <div className="w-full">
        <RoleNav />
        <section className="bg-white rounded-xl border p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-blue-900">NGO Operations Suite</h1>
              <p className="text-sm text-slate-600">Demo-ready workflow for NGO role.</p>
            </div>
            <div className="flex gap-2">
              <select value={lang} onChange={(e) => { setLang(e.target.value); setAlertForm((p) => ({ ...p, language: e.target.value })) }} className="border rounded-lg px-3 py-2 text-sm">
                <option value="en">English</option><option value="hi">Hindi</option><option value="mr">Marathi</option><option value="ta">Tamil</option>
              </select>
              <button onClick={() => loadData({ notify: true })} className="border rounded-lg px-3 py-2 text-sm">Refresh</button>
            </div>
          </div>
        </section>

        <section className="sticky top-36 z-30 mt-4 rounded-xl border bg-white/95 p-3 shadow-sm backdrop-blur">
          <div className="flex flex-wrap gap-2">
            {tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`rounded-lg px-3 py-2 text-sm ${tab === id ? 'bg-orange-500 text-white' : 'bg-blue-900 text-white'}`}>{label}</button>)}
          </div>
        </section>

        {Object.keys(sectionErrors).length > 0 ? (
          <section className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 shadow-sm">
            <p className="font-semibold">Partial data load errors</p>
            <ul className="ml-4 list-disc space-y-1">
              {Object.entries(sectionErrors).map(([key, err]) => (
                <li key={key}>
                  <span className="font-semibold">{formatSectionLabel(key)}:</span> {err}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {tab === 'compensation' ? (
          <section className="mt-4 rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="text-xl font-bold text-blue-900">Compensation</h2>
            <p className="mt-1 text-sm text-slate-600">NGO compensation wallet with website wallet transfer and invoice tracking.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'website_wallet', label: 'Website Wallet' },
                { id: 'transfer', label: 'Transfer' },
                { id: 'payments', label: 'Payments' },
                { id: 'history', label: 'History' },
                { id: 'invoices', label: 'Invoices' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCompPage(item.id)}
                  className={`rounded-lg px-3 py-2 text-sm ${compPage === item.id ? 'bg-orange-500 text-white' : 'bg-blue-900 text-white'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {compPage === 'overview' ? (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-slate-600">Wallet balance reflects the compensation funds available to your NGO.</p>
                <div className="grid gap-2 text-xs sm:grid-cols-1">
                  <div className="rounded border bg-blue-50 p-2">
                    <p className="text-blue-700">Wallet Balance (Compensation)</p>
                    <p className="text-lg font-bold text-blue-900">{compensationSummary.compBalance.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {compPage === 'website_wallet' ? (
              <article className="mt-4 max-w-xl rounded border bg-slate-50 p-3 text-sm">
                <h3 className="font-semibold text-blue-900">NGO Website Wallet</h3>
                <p className="mt-1"><span className="font-semibold">Balance:</span> {compensationSummary.websiteBalance.toFixed(2)}</p>
                <p><span className="font-semibold">Total Received:</span> {compensationSummary.websiteReceived.toFixed(2)}</p>
                <p><span className="font-semibold">Total Sent:</span> {compensationSummary.websiteSent.toFixed(2)}</p>
                <p className="mt-2 text-xs text-slate-600">Share this mobile number to receive money.</p>
                <input className="mt-1 w-full rounded border px-2 py-2 text-xs" value={walletSharePhone || '-'} readOnly />
              </article>
            ) : null}

            {compPage === 'transfer' ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <article className="rounded border bg-slate-50 p-3 text-sm">
                  <h3 className="font-semibold text-blue-900">Move Compensation To Website Wallet</h3>
                  <form onSubmit={topupFromCompensation} className="mt-2 space-y-2">
                    <input className="w-full rounded border px-3 py-2" type="number" min="1" step="0.01" placeholder="Amount" value={compTopupForm.amount} onChange={(e) => setCompTopupForm((p) => ({ ...p, amount: e.target.value }))} required />
                    <textarea className="w-full rounded border px-3 py-2" placeholder="Note (optional)" value={compTopupForm.note} onChange={(e) => setCompTopupForm((p) => ({ ...p, note: e.target.value }))} />
                    <button disabled={Boolean(actionLoading)} className="w-full rounded-lg bg-indigo-700 px-4 py-2 text-white disabled:opacity-60">{actionLoading ? 'Please wait...' : 'Move To Website Wallet'}</button>
                  </form>
                </article>
                <article className="rounded border bg-slate-50 p-3 text-sm">
                  <h3 className="font-semibold text-blue-900">Request Bank Transfer</h3>
                  <form onSubmit={requestCompensationWithdraw} className="mt-2 space-y-2">
                    <input className="w-full rounded border px-3 py-2" type="number" min="1" step="0.01" placeholder="Amount" value={compWithdrawForm.amount} onChange={(e) => setCompWithdrawForm((p) => ({ ...p, amount: e.target.value }))} required />
                    <input className="w-full rounded border px-3 py-2" placeholder="Account holder name" value={compWithdrawForm.account_holder} onChange={(e) => setCompWithdrawForm((p) => ({ ...p, account_holder: e.target.value }))} required />
                    <input className="w-full rounded border px-3 py-2" placeholder="Bank name" value={compWithdrawForm.bank_name} onChange={(e) => setCompWithdrawForm((p) => ({ ...p, bank_name: e.target.value }))} required />
                    <input className="w-full rounded border px-3 py-2" placeholder="Account number" value={compWithdrawForm.account_number} onChange={(e) => setCompWithdrawForm((p) => ({ ...p, account_number: e.target.value }))} required />
                    <input className="w-full rounded border px-3 py-2" placeholder="IFSC" value={compWithdrawForm.ifsc} onChange={(e) => setCompWithdrawForm((p) => ({ ...p, ifsc: e.target.value }))} required />
                    <textarea className="w-full rounded border px-3 py-2" placeholder="Note (optional)" value={compWithdrawForm.note} onChange={(e) => setCompWithdrawForm((p) => ({ ...p, note: e.target.value }))} />
                    <button disabled={Boolean(actionLoading)} className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-white disabled:opacity-60">{actionLoading ? 'Please wait...' : 'Request Bank Transfer'}</button>
                  </form>
                </article>
              </div>
            ) : null}

            {compPage === 'history' ? (
              <div className="mt-4 space-y-4">
                <article className="rounded border bg-slate-50 p-3 text-sm">
                  <h3 className="font-semibold text-blue-900">Compensation Transaction History</h3>
                  <div className="mt-2 max-h-72 space-y-2 overflow-auto">
                    {compTransactions.map((tx) => (
                      <div key={tx.id} className="rounded border bg-white p-2">
                        <p><span className="font-semibold">Type:</span> {tx.tx_type} ({tx.status})</p>
                        <p><span className="font-semibold">Amount:</span> {Number(tx.amount || 0).toFixed(2)}</p>
                        <p><span className="font-semibold">Note:</span> {tx.note || tx.review_note || '-'}</p>
                        <p><span className="font-semibold">Bank:</span> {tx.bank_details?.bank_name || '-'}</p>
                      </div>
                    ))}
                    {compTransactions.length === 0 ? <p className="text-slate-500">No compensation transactions yet.</p> : null}
                  </div>
                </article>

                <article className="rounded border bg-slate-50 p-3 text-sm">
                  <h3 className="font-semibold text-blue-900">Website Wallet Transfer History</h3>
                  <div className="mt-2 max-h-72 space-y-2 overflow-auto">
                    {walletTransfers.map((tx) => (
                      <div key={tx.id} className="rounded border bg-white p-2">
                        <p><span className="font-semibold">Type:</span> {tx.tx_type} ({tx.status})</p>
                        <p><span className="font-semibold">Amount:</span> {Number(tx.amount || 0).toFixed(2)}</p>
                        <p><span className="font-semibold">From:</span> {tx.from_user_id || '-'}</p>
                        <p><span className="font-semibold">To:</span> {tx.to_user_id || '-'}</p>
                        <p><span className="font-semibold">Note:</span> {tx.note || '-'}</p>
                      </div>
                    ))}
                    {walletTransfers.length === 0 ? <p className="text-slate-500">No website-wallet transfers yet.</p> : null}
                  </div>
                </article>
              </div>
            ) : null}

            {compPage === 'invoices' ? (
              <article className="mt-4 rounded border bg-slate-50 p-3 text-sm">
                <h3 className="font-semibold text-blue-900">Transaction Invoices</h3>
                <p className="mt-1 text-xs text-slate-600">Every transaction generates an invoice-style record.</p>
                <div className="mt-2 max-h-[28rem] space-y-2 overflow-auto">
                  {compensationInvoiceRows.map((row) => (
                    <div key={`inv-${row.source}-${row.id}`} className="rounded border bg-white p-2">
                      <p><span className="font-semibold">Invoice No:</span> {row.invoiceNo}</p>
                      <p><span className="font-semibold">Date:</span> {formatInvoiceDate(row.date)}</p>
                      <p><span className="font-semibold">Source:</span> {row.source}</p>
                      <p><span className="font-semibold">Type:</span> {row.txType}</p>
                      <p><span className="font-semibold">Status:</span> {row.status}</p>
                      <p><span className="font-semibold">Amount:</span> {row.amount.toFixed(2)}</p>
                      <p><span className="font-semibold">From:</span> {row.from}</p>
                      <p><span className="font-semibold">To:</span> {row.to}</p>
                      <p><span className="font-semibold">Note:</span> {row.note}</p>
                    </div>
                  ))}
                  {compensationInvoiceRows.length === 0 ? <p className="text-slate-500">No invoices generated yet.</p> : null}
                </div>
              </article>
            ) : null}
          </section>
        ) : null}

        {tab === 'inventory' ? <section className="mt-4 grid lg:grid-cols-3 gap-4">
          <article className="lg:col-span-2 bg-white rounded-xl border p-4 shadow-sm">
            <h2 className="font-bold text-blue-900">Resource Inventory</h2>
            <form onSubmit={async (e) => { e.preventDefault(); const ok = await submit('/v1/platform/inventory', { ...invForm, quantity: Number(invForm.quantity), estimated_need: Number(invForm.estimated_need) }, 'Inventory saved successfully.'); if (ok) setInvForm((p) => ({ ...p, resource_type: '', quantity: 0, location: '', expiration_date: '' })) }} className="mt-2 grid md:grid-cols-2 gap-2 text-sm">
              <input className="border rounded-lg px-3 py-2" placeholder="Resource type" value={invForm.resource_type} onChange={(e) => setInvForm((p) => ({ ...p, resource_type: e.target.value }))} required />
              <input className="border rounded-lg px-3 py-2" type="number" placeholder="Quantity" value={invForm.quantity} onChange={(e) => setInvForm((p) => ({ ...p, quantity: e.target.value }))} required />
              <input className="border rounded-lg px-3 py-2" placeholder="Location" value={invForm.location} onChange={(e) => setInvForm((p) => ({ ...p, location: e.target.value }))} required />
              <input className="border rounded-lg px-3 py-2" type="number" placeholder="Estimated need" value={invForm.estimated_need} onChange={(e) => setInvForm((p) => ({ ...p, estimated_need: e.target.value }))} required />
              <input className="border rounded-lg px-3 py-2" type="date" value={invForm.expiration_date} onChange={(e) => setInvForm((p) => ({ ...p, expiration_date: e.target.value }))} />
              <input className="border rounded-lg px-3 py-2" placeholder="NGO name" value={invForm.ngo_name} onChange={(e) => setInvForm((p) => ({ ...p, ngo_name: e.target.value }))} />
              <button disabled={Boolean(actionLoading)} className="md:col-span-2 rounded-lg bg-blue-900 text-white px-4 py-2 disabled:opacity-60">{actionLoading ? 'Please wait...' : 'Save'}</button>
            </form>
            <div className="mt-3 text-sm grid md:grid-cols-2 gap-2">
              <div className="rounded border bg-slate-50 p-2"><p className="font-semibold text-red-700">Shortage Alerts</p>{insights.shortage_alerts.length ? insights.shortage_alerts.map((s, i) => <p key={i}>{s.resource_type} @ {s.location}</p>) : <p className="text-slate-500">None</p>}</div>
              <div className="rounded border bg-slate-50 p-2"><p className="font-semibold text-amber-700">Duplication Flags</p>{insights.duplication_flags.length ? insights.duplication_flags.map((d, i) => <p key={i}>{d.resource_type} @ {d.location}</p>) : <p className="text-slate-500">None</p>}</div>
            </div>
            <div className="mt-3 space-y-2 text-sm max-h-52 overflow-auto">
              {inventory.map((item) => <div key={item.id} className="rounded border bg-white p-2 flex items-center justify-between gap-2"><p>{item.resource_type} - {item.quantity} @ {item.location}</p><button onClick={() => remove(`/v1/platform/inventory/${item.id}`, 'Inventory deleted successfully.')} className="rounded border border-red-300 px-2 py-1 text-xs text-red-700">Delete</button></div>)}
              {inventory.length === 0 ? <p className="text-slate-500">No inventory records yet.</p> : null}
            </div>
          </article>

          <article className="bg-white rounded-xl border p-4 shadow-sm">
            <h3 className="font-semibold text-blue-900">NGO Profile (for Survivor Help Centre)</h3>
            <form onSubmit={async (e) => { e.preventDefault(); await submit('/v1/platform/ngos', { ...ngoForm, lat: Number(ngoForm.lat), lon: Number(ngoForm.lon) }, 'NGO profile saved successfully.') }} className="mt-2 space-y-2 text-sm">
              <input className="w-full border rounded-lg px-3 py-2" placeholder="NGO name" value={ngoForm.name} onChange={(e) => setNgoForm((p) => ({ ...p, name: e.target.value }))} required />
              <input className="w-full border rounded-lg px-3 py-2" placeholder="Contact" value={ngoForm.contact} onChange={(e) => setNgoForm((p) => ({ ...p, contact: e.target.value }))} />
              <input className="w-full border rounded-lg px-3 py-2" placeholder="Location" value={ngoForm.location} onChange={(e) => setNgoForm((p) => ({ ...p, location: e.target.value }))} />
              <input className="w-full border rounded-lg px-3 py-2" placeholder="Specialization" value={ngoForm.specialization} onChange={(e) => setNgoForm((p) => ({ ...p, specialization: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <input className="border rounded-lg px-3 py-2" placeholder="Lat" value={ngoForm.lat} onChange={(e) => setNgoForm((p) => ({ ...p, lat: e.target.value }))} required />
                <input className="border rounded-lg px-3 py-2" placeholder="Lon" value={ngoForm.lon} onChange={(e) => setNgoForm((p) => ({ ...p, lon: e.target.value }))} required />
              </div>
              <button disabled={Boolean(actionLoading)} className="w-full rounded-lg bg-emerald-700 text-white px-4 py-2 disabled:opacity-60">{actionLoading ? 'Please wait...' : 'Save NGO'}</button>
            </form>
            <div className="mt-3 space-y-2 text-sm max-h-40 overflow-auto">
              {ngos.map((ngo) => <div key={ngo.id} className="rounded border bg-white p-2 flex items-center justify-between gap-2"><p>{ngo.name} - {ngo.location || 'No location'}</p><button onClick={() => remove(`/v1/platform/ngos/${ngo.id}`, 'NGO profile deleted successfully.')} className="rounded border border-red-300 px-2 py-1 text-xs text-red-700">Delete</button></div>)}
              {ngos.length === 0 ? <p className="text-slate-500">No NGO profiles yet.</p> : null}
            </div>
          </article>
        </section> : null}

        {tab === 'volunteers' ? <section className="mt-4 bg-white rounded-xl border p-4 shadow-sm">
          <h2 className="font-bold text-blue-900">Volunteers</h2>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
            <div className="rounded border bg-emerald-50 p-2"><p className="text-emerald-700">Active (Available)</p><p className="text-lg font-bold text-emerald-900">{workerStatusSummary.available}</p></div>
            <div className="rounded border bg-amber-50 p-2"><p className="text-amber-700">Busy (On-Task)</p><p className="text-lg font-bold text-amber-900">{workerStatusSummary.onTask}</p></div>
            <div className="rounded border bg-slate-100 p-2"><p className="text-slate-700">Inactive</p><p className="text-lg font-bold text-slate-900">{workerStatusSummary.unavailable}</p></div>
            <div className="rounded border bg-blue-50 p-2"><p className="text-blue-700">Total Workers</p><p className="text-lg font-bold text-blue-900">{workerStatusSummary.total}</p></div>
          </div>
          <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
            <input className="border rounded-lg px-3 py-2" placeholder="Search worker name/phone/skills..." value={workerQuery} onChange={(e) => setWorkerQuery(e.target.value)} />
            <select className="border rounded-lg px-3 py-2" value={workerStatusFilter} onChange={(e) => setWorkerStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="Available">Available (Active)</option>
              <option value="On-Task">On-Task (Busy)</option>
              <option value="Unavailable">Unavailable (Inactive)</option>
            </select>
          </div>
          <div className="mt-2">
            <div className="rounded border bg-slate-50 p-3 text-sm text-slate-600">
              Use search and filters above to find volunteers quickly by status, name, phone, and skills.
            </div>
          </div>
          <div className="mt-3 rounded border bg-slate-50 p-2 text-sm">
            <p className="font-semibold">Volunteer Status</p>
            {filteredWorkers.map((w) => {
              const tone = w.availability_status === 'Available'
                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                : (w.availability_status === 'On-Task'
                  ? 'bg-amber-100 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200')
              return <div key={w.id} className="mt-2 rounded border bg-white p-2"><div className="flex items-center justify-between gap-2"><button type="button" onClick={() => setSelectedWorkerId(w.id)} className="text-left"><p className="font-semibold text-blue-900 hover:underline">{w.name}</p></button><button onClick={() => remove(`/v1/platform/workers/${w.id}`, 'Volunteer deleted successfully.')} className="rounded border border-red-300 px-2 py-1 text-xs text-red-700">Delete</button></div><p className="text-xs text-slate-600">{w.linked_user_id ? 'Linked account' : 'No linked account'}</p><p className={`mt-1 inline-block rounded-full border px-2 py-1 text-xs font-semibold ${tone}`}>{w.availability_status || 'Unknown'}</p><p className="mt-1 text-xs text-slate-500">Status is auto-updated from assigned tasks.</p><button type="button" onClick={() => setSelectedWorkerId(w.id)} className="mt-2 rounded border border-blue-300 px-2 py-1 text-xs text-blue-700">View Details</button></div>
            })}
            {filteredWorkers.length === 0 ? <p className="text-slate-500 mt-2">No volunteers match this filter.</p> : null}
          </div>
        </section> : null}

        {tab === 'tasks' ? <section className="mt-4 bg-white rounded-xl border p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-blue-900">Tasks</h2>
            <button
              type="button"
              onClick={() => setShowTaskCreateModal(true)}
              className="rounded-lg bg-blue-900 px-4 py-2 text-sm text-white"
            >
              Create Task
            </button>
          </div>
          <div className="mt-3 grid gap-2 text-sm md:grid-cols-4">
            <input
              className="rounded-lg border px-3 py-2 md:col-span-2"
              placeholder="Search by title, description, worker, status..."
              value={taskQuery}
              onChange={(e) => setTaskQuery(e.target.value)}
            />
            <select className="rounded-lg border px-3 py-2" value={taskStatusFilter} onChange={(e) => setTaskStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <select className="rounded-lg border px-3 py-2" value={taskPriorityFilter} onChange={(e) => setTaskPriorityFilter(e.target.value)}>
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <select className="rounded-lg border px-3 py-2 md:col-span-2" value={taskAssignmentFilter} onChange={(e) => setTaskAssignmentFilter(e.target.value)}>
              <option value="all">All Assignment</option>
              <option value="assigned">Assigned Only</option>
              <option value="unassigned">Unassigned Only</option>
            </select>
          </div>
          <div className="mt-3 rounded border bg-slate-50 p-2 text-sm">
            <p className="font-semibold">Task Board ({filteredTasks.length})</p>
            {filteredTasks.map((t) => {
              const taskWorker = workerByAssigneeId.get(t.assigned_worker_id)
              return <div key={t.id} className="mt-2 rounded border bg-white p-2"><div className="flex items-center justify-between gap-2"><p>{t.title}</p><div className="flex items-center gap-2"><button onClick={() => remove(`/v1/platform/tasks/${t.id}`, 'Task deleted successfully.')} className="rounded border border-red-300 px-2 py-1 text-xs text-red-700">Delete</button></div></div><p className="text-xs text-slate-600">Status: {t.status}</p><p className="text-xs text-slate-600">Assigned: {t.assigned_worker_name || 'Unassigned'}</p><p className="text-xs text-slate-600">Worker Availability: {taskWorker?.availability_status || '-'}</p><p className="text-xs text-slate-600">Worker Contact: {taskWorker?.phone || '-'}</p><p className="mt-1 text-xs text-slate-500">Task status is updated only by the assigned worker.</p></div>
            })}
            {filteredTasks.length === 0 ? <p className="text-slate-500 mt-2">No tasks match this filter.</p> : null}
          </div>
        </section> : null}

        {tab === 'tracking' ? <section className="mt-4 bg-white rounded-xl border p-4 shadow-sm">
          <h2 className="font-bold text-blue-900">Task Tracking</h2>
          <p className="mt-1 text-sm text-slate-600">Monitor completed work and upcoming NGO tasks.</p>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded border bg-slate-50 p-3"><p className="text-slate-500">Total Tasks</p><p className="text-xl font-bold text-slate-900">{taskTrackingSummary.total}</p></div>
            <div className="rounded border bg-emerald-50 p-3"><p className="text-emerald-700">Completed</p><p className="text-xl font-bold text-emerald-900">{taskTrackingSummary.completed}</p></div>
            <div className="rounded border bg-amber-50 p-3"><p className="text-amber-700">In Progress</p><p className="text-xl font-bold text-amber-900">{taskTrackingSummary.inProgress}</p></div>
            <div className="rounded border bg-blue-50 p-3"><p className="text-blue-700">Upcoming (Open)</p><p className="text-xl font-bold text-blue-900">{taskTrackingSummary.open}</p></div>
            <div className="rounded border bg-indigo-50 p-3"><p className="text-indigo-700">Completion Rate</p><p className="text-xl font-bold text-indigo-900">{taskTrackingSummary.completionRate}%</p></div>
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowCompletedTasksModal(true)}
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800"
            >
              View Completed Tasks ({completedTasks.length})
            </button>
          </div>
          <div className="mt-4 rounded border bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-blue-900">Upcoming Task List ({upcomingTasks.length})</p>
            <div className="mt-2 max-h-80 space-y-2 overflow-auto">
              {upcomingTasks.map((t) => {
                const taskWorker = workerByAssigneeId.get(t.assigned_worker_id)
                return (
                  <article key={t.id} className="rounded border bg-white p-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">{t.title}</p>
                      <span className="rounded-full border bg-slate-50 px-2 py-1 text-xs">{t.status || 'open'}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{t.description || 'No description provided.'}</p>
                    <div className="mt-1 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                      <p><span className="font-semibold">Priority:</span> {t.priority || '-'}</p>
                      <p><span className="font-semibold">Assigned:</span> {t.assigned_worker_name || 'Unassigned'}</p>
                      <p><span className="font-semibold">Worker Availability:</span> {taskWorker?.availability_status || '-'}</p>
                      <p><span className="font-semibold">Created:</span> {formatWhen(t.created_at)}</p>
                    </div>
                  </article>
                )
              })}
              {upcomingTasks.length === 0 ? <p className="text-slate-500">No upcoming tasks.</p> : null}
            </div>
          </div>
        </section> : null}

        {tab === 'disaster' ? <section className="mt-4">
          <article className="bg-white rounded-xl border p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-blue-900">Prioritized Rescue Queue</h2>
                <p className="text-xs text-slate-600">Sorted by risk score, medical urgency, and report source confidence.</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border bg-red-50 px-3 py-1 text-red-700">Critical: {filteredCriticalCount}</span>
                <span className="rounded-full border bg-emerald-50 px-3 py-1 text-emerald-700">Medical cases: {filteredMedicalCount}</span>
                <span className="rounded-full border bg-slate-50 px-3 py-1 text-slate-700">Queue size: {filteredRescueQueue.length}</span>
              </div>
            </div>
            <div className="mt-3 grid gap-2 text-sm md:grid-cols-2 lg:grid-cols-5">
              <input
                className="rounded-lg border px-3 py-2 lg:col-span-2"
                placeholder="Search by name, location, phone, source..."
                value={rescueQuery}
                onChange={(e) => setRescueQuery(e.target.value)}
              />
              <select className="rounded-lg border px-3 py-2" value={rescueStatusFilter} onChange={(e) => setRescueStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="assigned">Assigned</option>
                <option value="accepted_by_worker">Accepted By Worker</option>
                <option value="rejection_pending_ngo">Rejection Pending NGO</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              <select className="rounded-lg border px-3 py-2" value={rescueMedicalFilter} onChange={(e) => setRescueMedicalFilter(e.target.value)}>
                <option value="all">All Medical</option>
                <option value="medical_only">Medical Only</option>
                <option value="non_medical">Non-Medical</option>
              </select>
              <select className="rounded-lg border px-3 py-2" value={rescueUrgencyFilter} onChange={(e) => setRescueUrgencyFilter(e.target.value)}>
                <option value="all">All Urgency</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="mt-3 max-h-[34rem] space-y-3 overflow-auto pr-1 text-sm">
              {filteredRescueQueue.map((s, idx) => {
                const urgency = getUrgency(s.priority_score)
                return (
                  <article key={s.id} className="rounded-xl border bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-900 px-2 text-xs font-bold text-white">{idx + 1}</span>
                        <p className="font-semibold text-slate-900">{s.name}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${urgency.tone}`}>{urgency.label}</span>
                        <span className="rounded-full border bg-white px-2 py-1 text-xs font-semibold text-slate-700">Score: {Number(s.priority_score || 0).toFixed(1)}</span>
                      </div>
                    </div>

                    <div className="mt-2 grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
                      <p><span className="font-semibold">Age:</span> {s.age ?? '-'}</p>
                      <p><span className="font-semibold">Needs Medical:</span> {s.needs_medical ? 'Yes' : 'No'}</p>
                      <p><span className="font-semibold">Phone:</span> {s.phone || '-'}</p>
                      <p><span className="font-semibold">Source:</span> {s.source || '-'}</p>
                      <p><span className="font-semibold">Location:</span> {s.location_text || '-'}</p>
                      <p><span className="font-semibold">Latitude:</span> {s.location_lat ?? '-'}</p>
                      <p><span className="font-semibold">Longitude:</span> {s.location_lon ?? '-'}</p>
                      <p><span className="font-semibold">Request Status:</span> {s.request_status || 'open'}</p>
                      <p><span className="font-semibold">Worker Response:</span> {s.worker_response_status || '-'}</p>
                      <p><span className="font-semibold">Response Note:</span> {s.worker_response_note || '-'}</p>
                      <p><span className="font-semibold">Assigned Worker:</span> {s.assigned_worker_name || 'Unassigned'}</p>
                      <p><span className="font-semibold">Worker Availability:</span> {s.assigned_worker_status || '-'}</p>
                      <p><span className="font-semibold">Worker Contact:</span> {s.assigned_worker_phone || '-'}</p>
                    </div>

                    <div className="mt-2 rounded-lg border bg-white p-2 text-xs text-slate-700">
                      <p className="font-semibold text-slate-800">Situation note</p>
                      <p className="mt-1">{s.voice_transcript || 'No additional message provided.'}</p>
                    </div>

                    <div className="mt-2 rounded-lg border bg-white p-2 text-xs text-slate-700">
                      <p className="font-semibold text-slate-800">Assign NGO Worker</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <select
                          className="min-w-52 rounded border px-2 py-1"
                          value={survivorAssignDrafts[s.id] ?? (s.assigned_worker_id || '')}
                          onChange={(e) => setSurvivorAssignDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))}
                        >
                          <option value="">Unassigned</option>
                          {workers.map((w) => (
                            <option key={w.id} value={w.linked_user_id || w.id}>
                              {w.name} ({w.availability_status || 'Unknown'})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => assignWorkerToSurvivor(s.id)}
                          className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-700"
                        >
                          Save Assignment
                        </button>
                        {s.request_status === 'rejection_pending_ngo' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => confirmWorkerRejection(s.id, 'confirm_reject')}
                              className="rounded border border-red-300 px-2 py-1 text-xs text-red-700"
                            >
                              Confirm Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => confirmWorkerRejection(s.id, 'keep_assignment')}
                              className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700"
                            >
                              Keep Assignment
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <p><span className="font-semibold">Created:</span> {formatWhen(s.created_at)}</p>
                      <p><span className="font-semibold">ID:</span> {s.id}</p>
                    </div>
                  </article>
                )
              })}
              {filteredRescueQueue.length === 0 ? <p className="text-slate-500">No survivor queue data for this filter.</p> : null}
            </div>
          </article>
        </section> : null}

        {tab === 'missing' ? <section className="mt-4 bg-white rounded-xl border p-4 shadow-sm">
          <h2 className="font-bold text-blue-900">Missing Person Match Center</h2>
          <form onSubmit={async (e) => { e.preventDefault(); if (!q.trim()) { setMissingMatches([]); return } try { const results = await apiRequest(`/v1/platform/missing-persons/search?q=${encodeURIComponent(q.trim())}`, { token }); setMissingMatches(results); setMsg(`Search completed successfully. Found ${results.length} result(s).`) } catch (err) { setMsg(err.message) } }} className="mt-2 flex gap-2">
            <input className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Search by name/notes" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="rounded-lg border px-4 py-2 text-sm">Search</button>
          </form>
          <div className="mt-3 space-y-2 text-sm max-h-72 overflow-auto">
            {(q ? missingMatches : missing).map((m) => (
              <div key={m.id} className="rounded border bg-white p-2">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMissing(m)}
                    className="text-left font-semibold text-blue-900 hover:underline"
                  >
                    {m.name} - {m.last_seen || 'Unknown'}
                  </button>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setSelectedMissing(m)} className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-700">View</button>
                    <button type="button" onClick={() => remove(`/v1/platform/missing-persons/${m.id}`, 'Missing person record deleted successfully.')} className="rounded border border-red-300 px-2 py-1 text-xs text-red-700">Delete</button>
                  </div>
                </div>
                <p className="mt-1 text-slate-600">{m.notes || 'No notes provided.'}</p>
                <p className="mt-1 text-xs text-slate-600">Case status: {m.case_status || 'missing'}</p>
                <p className="text-xs text-slate-600">Verification: {m.verification_status || 'not_required'}</p>
                <p className="text-xs text-slate-600">Reported by: {m.found_reported_by_role || '-'}</p>
                <p className="text-xs text-slate-600">Finder contact: {m.found_reporter_contact || '-'}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => reportFoundFromNgo(m)}
                    disabled={m.case_status === 'found_verified' || m.case_status === 'found_pending_verification'}
                    className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700 disabled:opacity-60"
                  >
                    Report Found
                  </button>
                  {m.case_status === 'found_pending_verification' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => verifyFoundReport(m.id, 'approve')}
                        className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-700"
                      >
                        Verify Found
                      </button>
                      <button
                        type="button"
                        onClick={() => verifyFoundReport(m.id, 'reject')}
                        className="rounded border border-amber-300 px-2 py-1 text-xs text-amber-700"
                      >
                        Reject Verification
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
            {(q ? missingMatches : missing).length === 0 ? <p className="text-slate-500">No records found.</p> : null}
          </div>
        </section> : null}

        {tab === 'alerts' ? (
          <section className="mt-4 bg-white rounded-xl border p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAlertsView('targeted')}
                className={`rounded-lg px-3 py-2 text-sm ${alertsView === 'targeted' ? 'bg-orange-500 text-white' : 'bg-blue-900 text-white'}`}
              >
                Targeted Alerts
              </button>
              <button
                type="button"
                onClick={() => setAlertsView('shelters')}
                className={`rounded-lg px-3 py-2 text-sm ${alertsView === 'shelters' ? 'bg-orange-500 text-white' : 'bg-blue-900 text-white'}`}
              >
                Shelter Management
              </button>
            </div>

            {alertsView === 'targeted' ? (
              <article className="mt-4 rounded-xl border p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-bold text-blue-900">Targeted Alerts</h2>
                  <button
                    type="button"
                    onClick={() => setShowAlertCreateModal(true)}
                    className="rounded-lg bg-blue-900 px-4 py-2 text-sm text-white"
                  >
                    Create Alert
                  </button>
                </div>
                <div className="mt-3 grid gap-2 text-sm md:grid-cols-4">
                  <input
                    className="rounded-lg border px-3 py-2 md:col-span-2"
                    placeholder="Search by title, message, location..."
                    value={alertQuery}
                    onChange={(e) => setAlertQuery(e.target.value)}
                  />
                  <select className="rounded-lg border px-3 py-2" value={alertSeverityFilter} onChange={(e) => setAlertSeverityFilter(e.target.value)}>
                    <option value="all">All Severity</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  <select className="rounded-lg border px-3 py-2" value={alertChannelFilter} onChange={(e) => setAlertChannelFilter(e.target.value)}>
                    <option value="all">All Channels</option>
                    <option value="web">Web</option>
                    <option value="sms">SMS</option>
                    <option value="voice">Voice</option>
                    <option value="push">Push</option>
                  </select>
                </div>
                <div className="mt-3 rounded border bg-slate-50 p-2 text-sm">
                  <p className="font-semibold">Alert Feed ({filteredAlerts.length})</p>
                  <div className="mt-2 max-h-72 space-y-2 overflow-auto">
                    {filteredAlerts.map((a) => (
                      <article key={a.id} className="rounded border bg-white p-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900">{a.title}</p>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full border bg-slate-50 px-2 py-1 text-xs">{a.severity || 'medium'} / {a.channel || 'web'}</span>
                            <button
                              onClick={() => remove(`/v1/platform/alerts/${a.id}`, 'Alert deleted successfully.')}
                              className="rounded border border-red-300 px-2 py-1 text-xs text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-slate-700">{a.message || '-'}</p>
                        <p className="mt-1 text-xs text-slate-600"><span className="font-semibold">Target:</span> {a.target_location || '-'}</p>
                      </article>
                    ))}
                    {filteredAlerts.length === 0 ? <p className="text-slate-500">No alerts match this filter.</p> : null}
                  </div>
                </div>
              </article>
            ) : null}

            {alertsView === 'shelters' ? (
              <article className="mt-4 rounded-xl border p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-bold text-blue-900">Shelter Management</h2>
                  <button
                    type="button"
                    onClick={() => setShowShelterCreateModal(true)}
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white"
                  >
                    Create Shelter
                  </button>
                </div>
                <div className="mt-3 grid gap-2 text-sm md:grid-cols-4">
                  <input
                    className="rounded-lg border px-3 py-2 md:col-span-2"
                    placeholder="Search by shelter name, location, contact..."
                    value={shelterQuery}
                    onChange={(e) => setShelterQuery(e.target.value)}
                  />
                  <select className="rounded-lg border px-3 py-2" value={shelterTypeFilter} onChange={(e) => setShelterTypeFilter(e.target.value)}>
                    <option value="all">All Types</option>
                    <option value="school">School</option>
                    <option value="community hall">Community Hall</option>
                    <option value="camp">Camp</option>
                  </select>
                  <select className="rounded-lg border px-3 py-2" value={shelterAvailabilityFilter} onChange={(e) => setShelterAvailabilityFilter(e.target.value)}>
                    <option value="all">All Availability</option>
                    <option value="available_only">Available Only</option>
                    <option value="full_only">Full Only</option>
                  </select>
                </div>
                <div className="mt-3 rounded border bg-slate-50 p-2 text-sm">
                  <p className="font-semibold">Shelter List ({filteredShelters.length})</p>
                  <div className="mt-2 max-h-80 space-y-2 overflow-auto">
                    {filteredShelters.map((s) => {
                      const draft = String(shelterDeltaDrafts[s.id] ?? '1')
                      const delta = Math.max(1, Number(draft || 1))
                      return (
                        <article key={s.id} className="rounded border bg-white p-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold">{s.name}</p>
                            <button onClick={() => remove(`/v1/platform/shelters/${s.id}`, 'Shelter deleted successfully.')} className="rounded border border-red-300 px-2 py-1 text-xs text-red-700">Delete</button>
                          </div>
                          <p className="mt-1 text-xs text-slate-600">
                            Occupied: {s.occupied} / {s.capacity} | Available: {s.available ?? Math.max((s.capacity || 0) - (s.occupied || 0), 0)}
                          </p>
                          <p className="text-xs text-slate-600">Location: {s.location || '-'}</p>
                          <p className="text-xs text-slate-600">Contact: {s.contact || '-'}</p>
                          <p className="text-xs text-slate-600">Type: {s.shelter_type || '-'}</p>
                          <div className="mt-2 grid gap-2 sm:grid-cols-3">
                            <input
                              className="rounded border px-2 py-1 text-xs"
                              type="number"
                              min="1"
                              value={draft}
                              onChange={(e) => setShelterDeltaDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))}
                              placeholder="Number"
                            />
                            <button
                              onClick={() => updateShelterOccupancy(s.id, { occupied_delta: delta }, `Shelter occupancy increased by ${delta}.`)}
                              className="rounded border px-2 py-1 text-xs"
                            >
                              Increase By Number
                            </button>
                            <button
                              onClick={() => updateShelterOccupancy(s.id, { occupied_delta: -delta }, `Shelter occupancy decreased by ${delta}.`)}
                              className="rounded border px-2 py-1 text-xs"
                            >
                              Decrease By Number
                            </button>
                          </div>
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => updateShelterOccupancy(s.id, { occupied: Number(s.capacity || 0) }, 'Shelter set to full.')}
                              className="rounded border border-amber-300 px-2 py-1 text-xs text-amber-700"
                            >
                              Set Full
                            </button>
                            <button
                              onClick={() => updateShelterOccupancy(s.id, { occupied: 0 }, 'Shelter set to empty.')}
                              className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-700"
                            >
                              Set Empty
                            </button>
                          </div>
                        </article>
                      )
                    })}
                    {filteredShelters.length === 0 ? <p className="text-slate-500">No shelters match this filter.</p> : null}
                  </div>
                </div>
              </article>
            ) : null}

          </section>
        ) : null}

        {actionLoading ? (
          <section className="fixed right-4 top-32 z-50 max-w-sm rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm shadow-xl">
            {actionLoading}
          </section>
        ) : null}
        {msg ? (
          <section className="fixed right-4 top-32 z-50 max-w-sm rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-xl">
            {msg}
          </section>
        ) : null}
        {selectedMissing ? (
          <section className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 p-4 pt-32">
            <article className="w-full max-w-md max-h-[calc(100vh-9rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-2xl break-words">
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-lg font-bold text-blue-900">Missing Person Details</h4>
                <button
                  type="button"
                  onClick={() => setSelectedMissing(null)}
                  className="rounded border px-3 py-1 text-sm"
                >
                  Close
                </button>
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p><span className="font-semibold">Name:</span> {selectedMissing.name || '-'}</p>
                <p><span className="font-semibold">Age:</span> {selectedMissing.age ?? '-'}</p>
                <p><span className="font-semibold">Last Seen:</span> {selectedMissing.last_seen || '-'}</p>
                <p><span className="font-semibold">Reporter Contact:</span> {selectedMissing.reporter_contact || '-'}</p>
                <p><span className="font-semibold">Notes:</span> {selectedMissing.notes || '-'}</p>
                <p><span className="font-semibold">Case Status:</span> {selectedMissing.case_status || 'missing'}</p>
                <p><span className="font-semibold">Verification:</span> {selectedMissing.verification_status || 'not_required'}</p>
                <p><span className="font-semibold">Found Notes:</span> {selectedMissing.found_notes || '-'}</p>
                <p><span className="font-semibold">Finder Contact:</span> {selectedMissing.found_reporter_contact || '-'}</p>
                <p><span className="font-semibold">Record ID:</span> {selectedMissing.id || '-'}</p>
                <p><span className="font-semibold">Created At:</span> {selectedMissing.created_at || '-'}</p>
              </div>
            </article>
          </section>
        ) : null}
        {showTaskCreateModal ? (
          <section className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 p-4 pt-32">
            <article className="w-full max-w-md max-h-[calc(100vh-9rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-2xl break-words">
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-lg font-bold text-blue-900">Create Task</h4>
                <button
                  type="button"
                  onClick={() => setShowTaskCreateModal(false)}
                  className="rounded border px-3 py-1 text-sm"
                >
                  Close
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  const ok = await submit('/v1/platform/tasks', { ...taskForm, assigned_worker_id: taskForm.assigned_worker_id || null }, 'Task created successfully.')
                  if (ok) {
                    setTaskForm({ title: '', description: '', priority: 'medium', assigned_worker_id: '' })
                    setShowTaskCreateModal(false)
                  }
                }}
                className="mt-3 space-y-2 text-sm"
              >
                <input className="w-full border rounded-lg px-3 py-2" placeholder="Task title" value={taskForm.title} onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))} required />
                <textarea className="w-full border rounded-lg px-3 py-2" placeholder="Task description" value={taskForm.description} onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))} />
                <select className="w-full border rounded-lg px-3 py-2" value={taskForm.priority} onChange={(e) => setTaskForm((p) => ({ ...p, priority: e.target.value }))}><option>low</option><option>medium</option><option>high</option><option>critical</option></select>
                <select className="w-full border rounded-lg px-3 py-2" value={taskForm.assigned_worker_id} onChange={(e) => setTaskForm((p) => ({ ...p, assigned_worker_id: e.target.value }))}>
                  <option value="">Unassigned</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.linked_user_id || w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                <button disabled={Boolean(actionLoading)} className="w-full rounded-lg bg-blue-900 text-white px-4 py-2 disabled:opacity-60">{actionLoading ? 'Please wait...' : 'Create Task'}</button>
              </form>
            </article>
          </section>
        ) : null}
        {showAlertCreateModal ? (
          <section className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 p-4 pt-32">
            <article className="w-full max-w-md max-h-[calc(100vh-9rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-2xl break-words">
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-lg font-bold text-blue-900">Create Alert</h4>
                <button
                  type="button"
                  onClick={() => setShowAlertCreateModal(false)}
                  className="rounded border px-3 py-1 text-sm"
                >
                  Close
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  const ok = await submit('/v1/platform/alerts', { ...alertForm, radius_km: Number(alertForm.radius_km) }, 'Alert published successfully.')
                  if (ok) {
                    setAlertForm((p) => ({ ...p, title: '', message: '', target_location: '', radius_km: 5 }))
                    setShowAlertCreateModal(false)
                  }
                }}
                className="mt-3 space-y-2 text-sm"
              >
                <input className="w-full border rounded-lg px-3 py-2" placeholder="Alert title" value={alertForm.title} onChange={(e) => setAlertForm((p) => ({ ...p, title: e.target.value }))} required />
                <textarea className="w-full border rounded-lg px-3 py-2" placeholder="Message" value={alertForm.message} onChange={(e) => setAlertForm((p) => ({ ...p, message: e.target.value }))} required />
                <div className="grid grid-cols-2 gap-2">
                  <select className="border rounded-lg px-3 py-2" value={alertForm.severity} onChange={(e) => setAlertForm((p) => ({ ...p, severity: e.target.value }))}><option>low</option><option>medium</option><option>high</option><option>critical</option></select>
                  <select className="border rounded-lg px-3 py-2" value={alertForm.channel} onChange={(e) => setAlertForm((p) => ({ ...p, channel: e.target.value }))}><option>web</option><option>sms</option><option>voice</option><option>push</option></select>
                </div>
                <input className="w-full border rounded-lg px-3 py-2" placeholder="Target location" value={alertForm.target_location} onChange={(e) => setAlertForm((p) => ({ ...p, target_location: e.target.value }))} />
                <input className="w-full border rounded-lg px-3 py-2" type="number" min="1" max="500" placeholder="Radius KM" value={alertForm.radius_km} onChange={(e) => setAlertForm((p) => ({ ...p, radius_km: e.target.value }))} />
                <button disabled={Boolean(actionLoading)} className="w-full rounded-lg bg-blue-900 text-white px-4 py-2 disabled:opacity-60">{actionLoading ? 'Please wait...' : 'Broadcast'}</button>
              </form>
            </article>
          </section>
        ) : null}
        {showShelterCreateModal ? (
          <section className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 p-4 pt-32">
            <article className="w-full max-w-md max-h-[calc(100vh-9rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-2xl break-words">
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-lg font-bold text-blue-900">Create Shelter</h4>
                <button
                  type="button"
                  onClick={() => setShowShelterCreateModal(false)}
                  className="rounded border px-3 py-1 text-sm"
                >
                  Close
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  const ok = await submit('/v1/platform/shelters', { ...shelterForm, capacity: Number(shelterForm.capacity), occupied: Number(shelterForm.occupied) }, 'Shelter added successfully.')
                  if (ok) {
                    setShelterForm({ name: '', location: '', contact: '', shelter_type: '', capacity: 100, occupied: 0 })
                    setShowShelterCreateModal(false)
                  }
                }}
                className="mt-3 space-y-2 text-sm"
              >
                <input className="w-full border rounded-lg px-3 py-2" placeholder="Shelter name" value={shelterForm.name} onChange={(e) => setShelterForm((p) => ({ ...p, name: e.target.value }))} required />
                <input className="w-full border rounded-lg px-3 py-2" placeholder="Location / Address" value={shelterForm.location} onChange={(e) => setShelterForm((p) => ({ ...p, location: e.target.value }))} required />
                <input className="w-full border rounded-lg px-3 py-2" placeholder="Contact phone" value={shelterForm.contact} onChange={(e) => setShelterForm((p) => ({ ...p, contact: e.target.value }))} />
                <input className="w-full border rounded-lg px-3 py-2" placeholder="Shelter type (school, hall, camp)" value={shelterForm.shelter_type} onChange={(e) => setShelterForm((p) => ({ ...p, shelter_type: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                  <input className="border rounded-lg px-3 py-2" type="number" min="1" placeholder="Capacity" value={shelterForm.capacity} onChange={(e) => setShelterForm((p) => ({ ...p, capacity: e.target.value }))} required />
                  <input className="border rounded-lg px-3 py-2" type="number" min="0" placeholder="Occupied" value={shelterForm.occupied} onChange={(e) => setShelterForm((p) => ({ ...p, occupied: e.target.value }))} required />
                </div>
                <button disabled={Boolean(actionLoading)} className="w-full rounded-lg bg-emerald-700 text-white px-4 py-2 disabled:opacity-60">{actionLoading ? 'Please wait...' : 'Add Shelter'}</button>
              </form>
            </article>
          </section>
        ) : null}
        {showCompletedTasksModal ? (
          <section className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 p-4 pt-32">
            <article className="w-full max-w-3xl max-h-[calc(100vh-9rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-2xl break-words">
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-lg font-bold text-emerald-800">Completed Task List ({completedTasks.length})</h4>
                <button
                  type="button"
                  onClick={() => setShowCompletedTasksModal(false)}
                  className="rounded border px-3 py-1 text-sm"
                >
                  Close
                </button>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                {completedTasks.map((t) => {
                  const taskWorker = workerByAssigneeId.get(t.assigned_worker_id)
                  return (
                    <article key={t.id} className="rounded border bg-slate-50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">{t.title}</p>
                        <span className="rounded-full border bg-emerald-50 px-2 py-1 text-xs text-emerald-700">completed</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">{t.description || 'No description provided.'}</p>
                      <div className="mt-1 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                        <p><span className="font-semibold">Priority:</span> {t.priority || '-'}</p>
                        <p><span className="font-semibold">Assigned:</span> {t.assigned_worker_name || 'Unassigned'}</p>
                        <p><span className="font-semibold">Worker Availability:</span> {taskWorker?.availability_status || '-'}</p>
                        <p><span className="font-semibold">Created:</span> {formatWhen(t.created_at)}</p>
                      </div>
                    </article>
                  )
                })}
                {completedTasks.length === 0 ? <p className="text-slate-500">No completed tasks yet.</p> : null}
              </div>
            </article>
          </section>
        ) : null}
        {selectedWorker ? (
          <section className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 p-4 pt-32">
            <article className="w-full max-w-3xl max-h-[calc(100vh-9rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-2xl break-words">
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-lg font-bold text-blue-900">Worker Details</h4>
                <button
                  type="button"
                  onClick={() => setSelectedWorkerId('')}
                  className="rounded border px-3 py-1 text-sm"
                >
                  Close
                </button>
              </div>
              <div className="mt-3 grid gap-3 text-sm text-slate-700 lg:grid-cols-3">
                <div className="space-y-2 rounded border bg-slate-50 p-3">
                  <p><span className="font-semibold">Name:</span> {selectedWorker.name || '-'}</p>
                  <p><span className="font-semibold">Phone:</span> {selectedWorker.phone || '-'}</p>
                  <p><span className="font-semibold">Availability:</span> {selectedWorker.availability_status || '-'}</p>
                  <p><span className="font-semibold">Coverage Area:</span> {selectedWorker.coverage_area || '-'}</p>
                </div>
                <div className="space-y-2 rounded border bg-slate-50 p-3">
                  <p><span className="font-semibold">NGO Name:</span> {selectedWorker.ngo_name || '-'}</p>
                  <p><span className="font-semibold">Linked User ID:</span> {selectedWorker.linked_user_id || '-'}</p>
                  <p><span className="font-semibold">Worker ID:</span> {selectedWorker.id || '-'}</p>
                  <p><span className="font-semibold">Created At:</span> {selectedWorker.created_at || '-'}</p>
                </div>
                <div className="space-y-2 rounded border bg-slate-50 p-3">
                  <p><span className="font-semibold">Skills:</span> {(selectedWorker.skills || []).join(', ') || '-'}</p>
                  <p><span className="font-semibold">Latitude:</span> {selectedWorker.lat ?? '-'}</p>
                  <p><span className="font-semibold">Longitude:</span> {selectedWorker.lon ?? '-'}</p>
                </div>
                {workerTaskSummaryByWorkerId.get(selectedWorker.id) ? (
                  <div className="rounded border bg-slate-50 p-3 lg:col-span-3">
                    <p className="font-semibold text-blue-900">Assigned Work Summary</p>
                    <div className="mt-2 grid gap-2 text-xs sm:grid-cols-4">
                      <p><span className="font-semibold">Total:</span> {workerTaskSummaryByWorkerId.get(selectedWorker.id).total}</p>
                      <p><span className="font-semibold">Pending (Open):</span> {workerTaskSummaryByWorkerId.get(selectedWorker.id).open}</p>
                      <p><span className="font-semibold">In Progress:</span> {workerTaskSummaryByWorkerId.get(selectedWorker.id).inProgress}</p>
                      <p><span className="font-semibold">Completed:</span> {workerTaskSummaryByWorkerId.get(selectedWorker.id).completed}</p>
                    </div>
                    <div className="mt-2 text-xs">
                      <p className="font-semibold text-blue-900">Current On-Task Work</p>
                      {workerTaskSummaryByWorkerId.get(selectedWorker.id).activeNow.map((t) => (
                        <div key={`active-${t.id}`} className="mt-1 rounded border bg-white p-2">
                          <p className="font-semibold">{t.title}</p>
                          <p>Priority: {t.priority || '-'}</p>
                          <p>Status: {t.status}</p>
                        </div>
                      ))}
                      {workerTaskSummaryByWorkerId.get(selectedWorker.id).activeNow.length === 0 ? (
                        <p className="text-slate-500">No active in-progress task mapped right now.</p>
                      ) : null}
                    </div>
                    <div className="mt-2 max-h-44 overflow-auto text-xs">
                      {workerTaskSummaryByWorkerId.get(selectedWorker.id).tasks.map((t) => (
                        <div key={t.id} className="mt-1 rounded border bg-white p-2">
                          <p className="font-semibold">{t.title}</p>
                          <p>Status: {t.status}</p>
                          <p>Priority: {t.priority || '-'}</p>
                        </div>
                      ))}
                      {workerTaskSummaryByWorkerId.get(selectedWorker.id).tasks.length === 0 ? <p className="text-slate-500">No assigned tasks.</p> : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          </section>
        ) : null}
        {loading ? <section className="mt-2 text-xs text-slate-500">Loading...</section> : null}
      </div>
    </main>
  )
}
