import { useCallback, useEffect, useMemo, useState } from 'react'
import RoleNav from '../components/RoleNav'
import VoiceAssistant from '../components/VoiceAssistant'
import AssistantHub from '../components/AssistantHub'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/api'

const tabs = [
  { id: 'home', label: 'Home' },
  { id: 'requests', label: 'My Requests' },
  { id: 'compensation', label: 'Compensation' },
  { id: 'suraksha', label: 'Suraksha Kendra' },
  { id: 'help', label: 'Help Centre' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'missing', label: 'Missing Person' },
]

const COMMAND_TAB_MAP = {
  'show help': 'help',
  'show shelters': 'suraksha',
  'show requests': 'requests',
  'show compensation': 'compensation',
  'show missing': 'missing',
}

export default function SurvivorPage() {
  const { token, user } = useAuth()
  const [activeTab, setActiveTab] = useState('home')
  const [alerts, setAlerts] = useState([])
  const [shelters, setShelters] = useState([])
  const [nearbyNgos, setNearbyNgos] = useState([])
  const [survivorRequests, setSurvivorRequests] = useState([])
  const [walletAccount, setWalletAccount] = useState(null)
  const [walletTransactions, setWalletTransactions] = useState([])
  const [requestForm, setRequestForm] = useState({
    name: user?.name || '',
    age: 30,
    phone: '',
    needs_medical: false,
    source: 'manual',
    voice_transcript: '',
    location_text: '',
    location_lat: '',
    location_lon: '',
  })
  const [myRequestQuery, setMyRequestQuery] = useState('')
  const [myRequestStatusFilter, setMyRequestStatusFilter] = useState('all')
  const [missing, setMissing] = useState([])
  const [missingSearchQuery, setMissingSearchQuery] = useState('')
  const [missingMatches, setMissingMatches] = useState([])
  const [missingMsg, setMissingMsg] = useState('')
  const [missingForm, setMissingForm] = useState({
    name: '',
    age: '',
    last_seen: '',
    notes: '',
    reporter_contact: '',
  })
  const [selectedMissing, setSelectedMissing] = useState(null)
  const [foundConfirm, setFoundConfirm] = useState({
    open: false,
    record: null,
    email: '',
    phone: '',
  })
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState('')
  const [walletPayForm, setWalletPayForm] = useState({
    amount: '',
    merchant_name: '',
    purpose: '',
    note: '',
  })
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    account_holder: '',
    bank_name: '',
    account_number: '',
    ifsc: '',
    note: '',
  })
  const [p2pWallet, setP2pWallet] = useState(null)
  const [p2pSharePhone, setP2pSharePhone] = useState('')
  const [p2pDirectory, setP2pDirectory] = useState([])
  const [p2pTransactions, setP2pTransactions] = useState([])
  const [p2pTransferForm, setP2pTransferForm] = useState({
    to_user_id: '',
    phone: '',
    amount: '',
    note: '',
  })
  const [p2pUserSearch, setP2pUserSearch] = useState('')
  const [topupForm, setTopupForm] = useState({
    amount: '',
    note: '',
  })
  const [compPage, setCompPage] = useState('overview')
  const [showSendSelectionModal, setShowSendSelectionModal] = useState(false)
  const [showSendMobileModal, setShowSendMobileModal] = useState(false)
  const [showTopupModal, setShowTopupModal] = useState(false)
  const [showBankTransferModal, setShowBankTransferModal] = useState(false)
  const [lastVoiceCommand, setLastVoiceCommand] = useState('')
  const handleVoiceCommand = useCallback((commandKey = {}) => {
    const key = commandKey?.key || commandKey
    if (!key) return
    const targetTab = COMMAND_TAB_MAP[key]
    if (targetTab) {
      setActiveTab(targetTab)
    }
    if (commandKey?.action) {
      setLastVoiceCommand(commandKey.action)
    }
  }, [setActiveTab, setLastVoiceCommand])

  const filteredP2PUsers = useMemo(() => {
    const query = p2pUserSearch.trim().toLowerCase()
    if (!query) return p2pDirectory
    return p2pDirectory
      .filter((entry) => (
        String(entry.name || '').toLowerCase().includes(query) ||
        String(entry.role || '').toLowerCase().includes(query) ||
        String(entry.email || '').toLowerCase().includes(query) ||
        String(entry.phone || '').toLowerCase().includes(query)
      ))
  }, [p2pDirectory, p2pUserSearch])

  const loadRoleData = async ({ notify = false } = {}) => {
    setLoading(true)
    try {
      const [alertData, shelterAllData, ngoData, missingData, survivorData, walletAccountData, walletTxData, p2pMeData, p2pDirectoryData, p2pTxData] = await Promise.all([
        apiRequest('/v1/platform/alerts', { token }),
        apiRequest('/v1/platform/shelters', { token }),
        apiRequest('/v1/platform/ngos', { token }),
        apiRequest('/v1/platform/missing-persons', { token }),
        apiRequest('/v1/survivors', { token }),
        apiRequest('/v1/platform/compensation/accounts', { token }),
        apiRequest('/v1/platform/compensation/transactions', { token }),
        apiRequest('/v1/platform/wallet/me', { token }),
        apiRequest('/v1/platform/wallet/directory', { token }),
        apiRequest('/v1/platform/wallet/transactions', { token }),
      ])

      setAlerts(alertData)
      const allShelters = (shelterAllData || []).map((item) => {
        const capacity = Number(item.capacity || 0)
        const occupied = Number(item.occupied ?? item.occupancy ?? 0)
        const normalizedLocation = item.location_text || item.location || null
        const normalizedContact = item.contact_phone || item.contact || null
        return {
          ...item,
          occupied,
          location: normalizedLocation,
          contact: normalizedContact,
          available: Math.max(capacity - occupied, 0),
        }
      })
      setShelters(allShelters)
      setNearbyNgos(ngoData)
      setMissing(missingData || [])
      setSurvivorRequests(survivorData || [])
      setWalletAccount((walletAccountData || [])[0] || null)
      setWalletTransactions(walletTxData || [])
      setP2pWallet(p2pMeData?.account || null)
      setP2pSharePhone(p2pMeData?.share_phone || '')
      setP2pDirectory(p2pDirectoryData || [])
      setP2pTransactions(p2pTxData || [])
      if (!missingSearchQuery.trim()) {
        setMissingMatches(missingData || [])
      }
      if (notify) {
        setMsg('Updated successfully.')
      }
    } catch (err) {
      setMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRoleData()
  }, [])

  useEffect(() => {
    if (!msg && !missingMsg) return
    const timer = setTimeout(() => {
      setMsg('')
      setMissingMsg('')
    }, 3500)
    return () => clearTimeout(timer)
  }, [msg, missingMsg])

  const submitHelpRequest = async (e) => {
    e.preventDefault()
    if (actionLoading) return
    setActionLoading('Submitting help request...')
    setMsg('')
    try {
      const createdRequest = await apiRequest('/v1/survivors', {
        method: 'POST',
        token,
          body: {
              ...requestForm,
              age: Number(requestForm.age),
              phone: requestForm.phone || null,
              voice_transcript: requestForm.voice_transcript || null,
              location_text: requestForm.location_text || null,
              location_lat: requestForm.location_lat ? Number(requestForm.location_lat) : null,
              location_lon: requestForm.location_lon ? Number(requestForm.location_lon) : null,
            },
          })
      setMsg(
        createdRequest?.assigned_ngo_name
          ? `Help request sent to matched NGO: ${createdRequest.assigned_ngo_name}.`
          : 'Help request submitted. No NGO address matched this request yet.',
      )
      setRequestForm((prev) => ({
        ...prev,
        phone: '',
        needs_medical: false,
        voice_transcript: '',
        location_text: '',
        location_lat: '',
        location_lon: '',
      }))
      await loadRoleData()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setActionLoading('')
    }
  }

  const findMissingPerson = async (e) => {
    e.preventDefault()
    if (actionLoading) return
    if (!missingSearchQuery.trim()) {
      setMissingMatches(missing)
      setMissingMsg('Showing all missing person records.')
      return
    }
    setActionLoading('Searching...')
    try {
      const data = await apiRequest(
        `/v1/platform/missing-persons/search?q=${encodeURIComponent(missingSearchQuery.trim())}`,
        { token },
      )
      setMissingMatches(data)
      setMissingMsg(data.length ? `Found ${data.length} matching record(s).` : 'No matching records found.')
    } catch (err) {
      setMissingMsg(err.message)
    } finally {
      setActionLoading('')
    }
  }

  const displayedMissing = missingSearchQuery.trim() ? missingMatches : missing
  const myRequests = useMemo(() => {
    const byCreator = survivorRequests.filter((item) => item.created_by_user_id === user?.id)
    if (byCreator.length) return byCreator
    return survivorRequests.filter((item) => String(item.name || '').trim().toLowerCase() === String(user?.name || '').trim().toLowerCase())
  }, [survivorRequests, user?.id, user?.name])
  const filteredMyRequests = useMemo(() => {
    const query = myRequestQuery.trim().toLowerCase()
    return myRequests.filter((req) => {
      const status = String(req.request_status || 'open').toLowerCase()
      if (myRequestStatusFilter !== 'all' && status !== myRequestStatusFilter) return false
      if (!query) return true
      return (
        String(req.voice_transcript || '').toLowerCase().includes(query) ||
        String(req.location_text || '').toLowerCase().includes(query) ||
        String(req.assigned_worker_name || '').toLowerCase().includes(query) ||
        String(req.id || '').toLowerCase().includes(query)
      )
    })
  }, [myRequests, myRequestQuery, myRequestStatusFilter])
  const myRequestSummary = useMemo(() => {
    const open = myRequests.filter((req) => String(req.request_status || 'open').toLowerCase() === 'open').length
    const assigned = myRequests.filter((req) => String(req.request_status || '').toLowerCase() === 'assigned').length
    const accepted = myRequests.filter((req) => String(req.request_status || '').toLowerCase() === 'accepted_by_worker').length
    const inProgress = myRequests.filter((req) => String(req.request_status || '').toLowerCase() === 'in_progress').length
    const completed = myRequests.filter((req) => String(req.request_status || '').toLowerCase() === 'completed').length
    return { total: myRequests.length, open, assigned, accepted, inProgress, completed }
  }, [myRequests])

  const reportMissingPerson = async (e) => {
    e.preventDefault()
    if (actionLoading) return
    setActionLoading('Submitting report...')
    try {
      await apiRequest('/v1/platform/missing-persons', {
        method: 'POST',
        token,
        body: {
          ...missingForm,
          age: missingForm.age ? Number(missingForm.age) : null,
          report_type: 'missing',
        },
      })
      setMissingForm({
        name: '',
        age: '',
        last_seen: '',
        notes: '',
        reporter_contact: '',
      })
      setMissingMsg('Missing person report submitted successfully.')
      const fresh = await apiRequest('/v1/platform/missing-persons', { token })
      setMissing(fresh)
      setMissingMatches(fresh.slice(0, 12))
    } catch (err) {
      setMissingMsg(err.message)
    } finally {
      setActionLoading('')
    }
  }

  const deleteMissingPerson = async (id) => {
    if (actionLoading) return
    setActionLoading('Deleting record...')
    try {
      await apiRequest(`/v1/platform/missing-persons/${id}`, {
        method: 'DELETE',
        token,
      })
      setMissingMsg('Missing person record deleted successfully.')
      const fresh = await apiRequest('/v1/platform/missing-persons', { token })
      setMissing(fresh)
      setMissingMatches(fresh.slice(0, 12))
    } catch (err) {
      setMissingMsg(err.message)
    } finally {
      setActionLoading('')
    }
  }

  const markRequestCompleted = async (id) => {
    if (actionLoading) return
    setActionLoading('Updating request...')
    try {
      await apiRequest(`/v1/survivors/${id}/status`, {
        method: 'PATCH',
        token,
        body: { status: 'completed' },
      })
      setMsg('Request marked as completed.')
      await loadRoleData()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setActionLoading('')
    }
  }

  const reportFound = async ({ item, email, phone }) => {
    if (actionLoading) return
    setActionLoading('Reporting found status...')
    try {
      await apiRequest(`/v1/platform/missing-persons/${item.id}/report-found`, {
        method: 'PATCH',
        token,
        body: {
          found_notes: 'Reported from survivor portal',
          found_reporter_contact: phone || null,
          found_reporter_email: email || null,
        },
      })
      setMissingMsg('Found status submitted. Waiting NGO/Admin verification.')
      const fresh = await apiRequest('/v1/platform/missing-persons', { token })
      setMissing(fresh)
      setMissingMatches(fresh.slice(0, 12))
      setFoundConfirm({ open: false, record: null, email: '', phone: '' })
    } catch (err) {
      setMissingMsg(err.message)
    } finally {
      setActionLoading('')
    }
  }

  const openFoundConfirm = (item) => {
    setFoundConfirm({
      open: true,
      record: item,
      email: '',
      phone: item.reporter_contact || '',
    })
  }

  const submitFoundConfirm = async (e) => {
    e.preventDefault()
    if (!foundConfirm.record) return
    if (!window.confirm('Confirm 1/2: Do you want to mark this person as found?')) return
    if (!window.confirm('Confirm 2/2: Submit finder email and phone to NGO/Admin for verification?')) return
    await reportFound({
      item: foundConfirm.record,
      email: foundConfirm.email,
      phone: foundConfirm.phone,
    })
  }

  const deleteMyRequest = async (id) => {
    if (actionLoading) return
    setActionLoading('Deleting help request...')
    try {
      await apiRequest(`/v1/survivors/${id}`, { method: 'DELETE', token })
      setMsg('Help request deleted successfully.')
      await loadRoleData()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setActionLoading('')
    }
  }

  const payWithWallet = async (e) => {
    e.preventDefault()
    if (actionLoading) return
    setActionLoading('Processing wallet payment...')
    try {
      await apiRequest('/v1/platform/compensation/pay', {
        method: 'POST',
        token,
        body: {
          amount: Number(walletPayForm.amount),
          merchant_name: walletPayForm.merchant_name || null,
          purpose: walletPayForm.purpose || null,
          note: walletPayForm.note || null,
        },
      })
      setMsg('Wallet payment completed successfully.')
      setWalletPayForm({ amount: '', merchant_name: '', purpose: '', note: '' })
      await loadRoleData()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setActionLoading('')
    }
  }

  const requestBankTransfer = async (e) => {
    e.preventDefault()
    if (actionLoading) return
    setActionLoading('Submitting bank transfer request...')
    try {
      await apiRequest('/v1/platform/compensation/withdraw-request', {
        method: 'POST',
        token,
        body: {
          amount: Number(withdrawForm.amount),
          account_holder: withdrawForm.account_holder,
          bank_name: withdrawForm.bank_name,
          account_number: withdrawForm.account_number,
          ifsc: withdrawForm.ifsc,
          note: withdrawForm.note || null,
        },
      })
      setMsg('Bank transfer request submitted. Waiting admin approval.')
      setShowBankTransferModal(false)
      setWithdrawForm({ amount: '', account_holder: '', bank_name: '', account_number: '', ifsc: '', note: '' })
      await loadRoleData()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setActionLoading('')
    }
  }

  const transferP2PBySelect = async (e) => {
    e.preventDefault()
    if (actionLoading) return
    setActionLoading('Transferring to selected account...')
    try {
      await apiRequest('/v1/platform/wallet/transfer', {
        method: 'POST',
        token,
        body: {
          to_user_id: p2pTransferForm.to_user_id,
          amount: Number(p2pTransferForm.amount),
          note: p2pTransferForm.note || null,
        },
      })
      setMsg('Transfer completed successfully.')
      setShowSendSelectionModal(false)
      setP2pUserSearch('')
      setP2pTransferForm((p) => ({ ...p, to_user_id: '', amount: '', note: '' }))
      await loadRoleData()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setActionLoading('')
    }
  }

  const transferP2PByPhone = async (e) => {
    e.preventDefault()
    if (actionLoading) return
    setActionLoading('Transferring by mobile number...')
    try {
      await apiRequest('/v1/platform/wallet/transfer/by-phone', {
        method: 'POST',
        token,
        body: {
          phone: p2pTransferForm.phone,
          amount: Number(p2pTransferForm.amount),
          note: p2pTransferForm.note || null,
        },
      })
      setMsg('Mobile-number transfer completed successfully.')
      setShowSendMobileModal(false)
      setP2pTransferForm((p) => ({ ...p, phone: '', amount: '', note: '', to_user_id: '' }))
      await loadRoleData()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setActionLoading('')
    }
  }

  const topupFromCompensation = async (e) => {
    e.preventDefault()
    if (actionLoading) return
    setActionLoading('Moving compensation to wallet...')
    try {
      await apiRequest('/v1/platform/wallet/topup-from-compensation', {
        method: 'POST',
        token,
        body: {
          amount: Number(topupForm.amount),
          note: topupForm.note || null,
        },
      })
      setMsg('Amount moved to website wallet successfully.')
      setShowTopupModal(false)
      setTopupForm({ amount: '', note: '' })
      await loadRoleData()
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

  const invoiceRows = useMemo(() => {
    const comp = walletTransactions.map((tx) => ({
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
    const p2p = p2pTransactions.map((tx) => ({
      invoiceNo: `INV-P2P-${String(tx.id || '').slice(0, 8).toUpperCase()}`,
      source: 'Website Wallet',
      txType: tx.tx_type || 'transfer',
      status: tx.status || 'completed',
      amount: Number(tx.amount || 0),
      date: tx.processed_at || tx.created_at,
      note: tx.note || '-',
      from: tx.from_user_id || '-',
      to: tx.to_user_id || '-',
      id: tx.id,
    }))
    return [...comp, ...p2p].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
  }, [walletTransactions, p2pTransactions, user?.name, user?.id])
  const compSummary = useMemo(() => {
    const compBalance = Number(walletAccount?.balance || 0)
    const compCredited = Number(walletAccount?.total_credited || 0)
    const compSpent = Number(walletAccount?.total_spent || 0)
    const compWithdrawn = Number(walletAccount?.total_withdrawn || 0)
    const websiteBalance = compBalance
    const websiteSent = Number(p2pWallet?.total_sent || 0)
    const websiteReceived = Number(p2pWallet?.total_received || 0)
    const totalAvailable = compBalance
    const totalSpent = compSpent + websiteSent
    return {
      compBalance,
      compCredited,
      compSpent,
      compWithdrawn,
      websiteBalance,
      websiteSent,
      websiteReceived,
      totalAvailable,
      totalSpent,
    }
  }, [walletAccount, p2pWallet])

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 p-0">
      <div className="w-full">
        <RoleNav />

        <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                <span className="text-blue-900">Sahaaya</span><span className="text-orange-500">Setu</span> Survivor Home
              </h1>
              <p className="text-sm text-slate-600 mt-1">Welcome, {user?.name}. Access only your survivor features here.</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm">
              <p><span className="font-semibold">Role:</span> survivor</p>
              <p><span className="font-semibold">Email:</span> {user?.email}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold border ${
                  activeTab === tab.id
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {lastVoiceCommand ? (
            <p className="mt-2 text-sm text-slate-600">Last voice command: {lastVoiceCommand}</p>
          ) : null}
        </section>

        {activeTab === 'home' ? (
          <section className="mt-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <h2 className="text-xl font-bold text-blue-900">Your Help Request</h2>
            <p className="text-sm text-slate-600 mt-1">Submit your current need and we will route it using the address you enter.</p>
            <form onSubmit={submitHelpRequest} className="mt-3 grid md:grid-cols-2 gap-3">
              <input className="border rounded-lg px-3 py-2" placeholder="Name" value={requestForm.name} onChange={(e) => setRequestForm((p) => ({ ...p, name: e.target.value }))} required />
              <input className="border rounded-lg px-3 py-2" type="number" min="0" max="120" placeholder="Age" value={requestForm.age} onChange={(e) => setRequestForm((p) => ({ ...p, age: e.target.value }))} required />
              <input className="border rounded-lg px-3 py-2" placeholder="Phone" value={requestForm.phone} onChange={(e) => setRequestForm((p) => ({ ...p, phone: e.target.value }))} />
              <select className="border rounded-lg px-3 py-2" value={requestForm.source} onChange={(e) => setRequestForm((p) => ({ ...p, source: e.target.value }))}>
                <option value="manual">manual</option>
                <option value="voice">voice</option>
                <option value="sms">sms</option>
              </select>
              <textarea className="md:col-span-2 border rounded-lg px-3 py-2" placeholder="Describe help needed" value={requestForm.voice_transcript} onChange={(e) => setRequestForm((p) => ({ ...p, voice_transcript: e.target.value }))} />
              <input className="md:col-span-2 border rounded-lg px-3 py-2" placeholder="Exact location / address (required)" value={requestForm.location_text} onChange={(e) => setRequestForm((p) => ({ ...p, location_text: e.target.value }))} required />
              <label className="text-sm flex items-center gap-2">
                <input type="checkbox" checked={requestForm.needs_medical} onChange={(e) => setRequestForm((p) => ({ ...p, needs_medical: e.target.checked }))} />
                Need urgent medical support
              </label>
              <button disabled={Boolean(actionLoading)} className="rounded-lg bg-blue-900 text-white px-4 py-2 disabled:opacity-60">{actionLoading ? 'Please wait...' : 'Submit Help Request'}</button>
            </form>
            {msg ? <p className="text-sm mt-3 text-slate-700">{msg}</p> : null}
          </section>
        ) : null}

        {activeTab === 'requests' ? (
          <section className="mt-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <h2 className="text-xl font-bold text-blue-900">My Requests Tracker</h2>
            <p className="text-sm text-slate-600 mt-1">Track your request status, assigned employee, and progress updates.</p>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded border bg-slate-50 p-2"><p className="text-slate-500">Total</p><p className="text-lg font-bold text-slate-900">{myRequestSummary.total}</p></div>
              <div className="rounded border bg-blue-50 p-2"><p className="text-blue-700">Open</p><p className="text-lg font-bold text-blue-900">{myRequestSummary.open}</p></div>
              <div className="rounded border bg-amber-50 p-2"><p className="text-amber-700">Assigned</p><p className="text-lg font-bold text-amber-900">{myRequestSummary.assigned}</p></div>
              <div className="rounded border bg-cyan-50 p-2"><p className="text-cyan-700">Accepted</p><p className="text-lg font-bold text-cyan-900">{myRequestSummary.accepted}</p></div>
              <div className="rounded border bg-orange-50 p-2"><p className="text-orange-700">In Progress</p><p className="text-lg font-bold text-orange-900">{myRequestSummary.inProgress}</p></div>
              <div className="rounded border bg-emerald-50 p-2"><p className="text-emerald-700">Completed</p><p className="text-lg font-bold text-emerald-900">{myRequestSummary.completed}</p></div>
            </div>
            <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
              <input
                className="rounded-lg border px-3 py-2 md:col-span-2"
                placeholder="Search by need/location/employee/request id..."
                value={myRequestQuery}
                onChange={(e) => setMyRequestQuery(e.target.value)}
              />
              <select className="rounded-lg border px-3 py-2" value={myRequestStatusFilter} onChange={(e) => setMyRequestStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="assigned">Assigned</option>
                <option value="accepted_by_worker">Accepted By Employee</option>
                <option value="rejection_pending_ngo">Rejection Pending NGO</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="mt-3 space-y-2 text-sm max-h-80 overflow-auto pr-1">
              {filteredMyRequests.map((req) => (
                <article key={req.id} className="border rounded-lg p-3 bg-slate-50">
                  <p><span className="font-semibold">Need:</span> {req.voice_transcript || req.name}</p>
                  <p><span className="font-semibold">Status:</span> {req.request_status || 'open'}</p>
                  <p><span className="font-semibold">Assigned NGO:</span> {req.assigned_ngo_name || 'Awaiting NGO address match'}</p>
                  <p><span className="font-semibold">Location:</span> {req.location_text || '-'}</p>
                  <p><span className="font-semibold">Employee:</span> {req.assigned_worker_name || 'Not assigned yet'}</p>
                  <p><span className="font-semibold">Employee Phone:</span> {req.assigned_worker_phone || '-'}</p>
                  <p><span className="font-semibold">Employee Skills:</span> {(req.assigned_worker_skills || []).join(', ') || '-'}</p>
                  <p><span className="font-semibold">Request ID:</span> {req.id}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {req.request_status === 'accepted_by_worker' ? (
                      <button
                        onClick={() => markRequestCompleted(req.id)}
                        className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700"
                      >
                        Mark Completed
                      </button>
                    ) : null}
                    <button onClick={() => deleteMyRequest(req.id)} className="rounded border border-red-300 px-2 py-1 text-xs text-red-700">
                      Delete Request
                    </button>
                  </div>
                </article>
              ))}
              {!loading && filteredMyRequests.length === 0 ? <p className="text-slate-500">No requests match your filter.</p> : null}
            </div>
          </section>
        ) : null}

        {activeTab === 'compensation' ? (
          <section className="mt-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <h2 className="text-xl font-bold text-blue-900">Compensation Wallet</h2>
            <p className="text-sm text-slate-600 mt-1">Use compensation balance for emergency payments and request bank transfer after disaster closure.</p>
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
                <p className="text-xs text-slate-600">
                  Wallet balance represents your compensation funds; website wallet mirrors the same amount.
                </p>
                <div className="grid gap-2 text-xs sm:grid-cols-1">
                  <div className="rounded border bg-blue-50 p-2">
                    <p className="text-blue-700">Wallet Balance (Compensation)</p>
                    <p className="text-lg font-bold text-blue-900">{compSummary.compBalance.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {compPage === 'website_wallet' ? (
              <article className="mt-4 rounded border bg-slate-50 p-3 text-sm max-w-xl">
                <h3 className="font-semibold text-blue-900">My Website Wallet</h3>
                <p className="mt-1"><span className="font-semibold">Balance:</span> {compSummary.websiteBalance.toFixed(2)}</p>
                <p><span className="font-semibold">Total Received:</span> {compSummary.websiteReceived.toFixed(2)}</p>
                <p><span className="font-semibold">Total Sent:</span> {compSummary.websiteSent.toFixed(2)}</p>
                <p className="mt-2 text-xs text-slate-600">Share this mobile number to receive money.</p>
                <input className="mt-1 w-full rounded border px-2 py-2 text-xs" value={p2pSharePhone || '-'} readOnly />
              </article>
            ) : null}

            {compPage === 'transfer' ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 lg:grid-cols-1">
                  <article className="rounded border bg-slate-50 p-3 text-sm">
                    <h3 className="font-semibold text-blue-900">Move Compensation To Website Wallet</h3>
                    <button onClick={() => setShowTopupModal(true)} className="mt-2 w-full rounded-lg bg-indigo-700 text-white px-4 py-2">
                      Open Move To Website Wallet
                    </button>
                  </article>
                  <article className="rounded border bg-slate-50 p-3 text-sm">
                    <h3 className="font-semibold text-blue-900">Request Bank Transfer</h3>
                    <button onClick={() => setShowBankTransferModal(true)} className="mt-2 w-full rounded-lg bg-emerald-700 text-white px-4 py-2">
                      Open Request Bank Transfer
                    </button>
                  </article>
                </div>
              </div>
            ) : null}

            {compPage === 'payments' ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <article className="rounded border bg-slate-50 p-3 text-sm lg:col-span-2">
                  <h3 className="font-semibold text-blue-900">Send Money To Other Users</h3>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <button onClick={() => { setP2pUserSearch(''); setShowSendSelectionModal(true) }} className="rounded-lg bg-blue-900 text-white px-4 py-2">
                      Open Send By Selection
                    </button>
                    <button onClick={() => setShowSendMobileModal(true)} className="rounded-lg bg-emerald-700 text-white px-4 py-2">
                      Open Send By Mobile Number
                    </button>
                  </div>
                </article>
              </div>
            ) : null}

            {compPage === 'history' ? (
              <div className="mt-4 space-y-4">
                <article className="rounded border bg-slate-50 p-3 text-sm">
                  <h3 className="font-semibold text-blue-900">Wallet Transaction History</h3>
                  <div className="mt-2 max-h-72 space-y-2 overflow-auto">
                    {walletTransactions.map((tx) => (
                      <div key={tx.id} className="rounded border bg-white p-2">
                        <p><span className="font-semibold">Type:</span> {tx.tx_type} ({tx.status})</p>
                        <p><span className="font-semibold">Amount:</span> {Number(tx.amount || 0).toFixed(2)}</p>
                        <p><span className="font-semibold">Note:</span> {tx.note || tx.review_note || '-'}</p>
                        <p><span className="font-semibold">Bank:</span> {tx.bank_details?.bank_name || '-'}</p>
                      </div>
                    ))}
                    {walletTransactions.length === 0 ? <p className="text-slate-500">No wallet transactions yet.</p> : null}
                  </div>
                </article>

                <article className="rounded border bg-slate-50 p-3 text-sm">
                  <h3 className="font-semibold text-blue-900">Website Wallet Transfer History</h3>
                  <div className="mt-2 max-h-72 space-y-2 overflow-auto">
                    {p2pTransactions.map((tx) => (
                      <div key={tx.id} className="rounded border bg-white p-2">
                        <p><span className="font-semibold">Type:</span> {tx.tx_type} ({tx.status})</p>
                        <p><span className="font-semibold">Amount:</span> {Number(tx.amount || 0).toFixed(2)}</p>
                        <p><span className="font-semibold">From:</span> {tx.from_user_id || '-'}</p>
                        <p><span className="font-semibold">To:</span> {tx.to_user_id || '-'}</p>
                        <p><span className="font-semibold">Note:</span> {tx.note || '-'}</p>
                      </div>
                    ))}
                    {p2pTransactions.length === 0 ? <p className="text-slate-500">No website-wallet transfers yet.</p> : null}
                  </div>
                </article>
              </div>
            ) : null}

            {compPage === 'invoices' ? (
              <article className="mt-4 rounded border bg-slate-50 p-3 text-sm">
                <h3 className="font-semibold text-blue-900">Transaction Invoices</h3>
                <p className="mt-1 text-xs text-slate-600">Every transaction generates an invoice-style record.</p>
                <div className="mt-2 max-h-[28rem] space-y-2 overflow-auto">
                  {invoiceRows.map((row) => (
                    <div key={`inv-${row.id}`} className="rounded border bg-white p-2">
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
                  {invoiceRows.length === 0 ? <p className="text-slate-500">No invoices generated yet.</p> : null}
                </div>
              </article>
            ) : null}
          </section>
        ) : null}

        {activeTab === 'suraksha' ? (
          <section className="mt-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <h2 className="text-xl font-bold text-blue-900">Suraksha Kendra (All Shelters)</h2>
            <div className="mt-3">
              <button onClick={() => loadRoleData({ notify: true })} className="rounded-lg bg-emerald-700 text-white px-4 py-2">Refresh Shelters</button>
            </div>
            <div className="mt-3 grid md:grid-cols-2 gap-3 text-sm">
              {shelters.map((item) => (
                <article key={item.id} className="border rounded-xl p-3 bg-slate-50">
                  <p className="font-semibold">{item.name}</p>
                  <p>Capacity: {item.capacity ?? 0}</p>
                  <p>Occupied: {item.occupied ?? 0}</p>
                  <p>Available: {item.available ?? Math.max(Number(item.capacity || 0) - Number(item.occupied || 0), 0)}</p>
                  <p>Location: {item.location || 'Not provided'}</p>
                  <p>Contact: {item.contact || 'Not provided'}</p>
                  <p>Type: {item.shelter_type || 'General'}</p>
                </article>
              ))}
              {!loading && shelters.length === 0 ? <p className="text-slate-500">No shelters available.</p> : null}
            </div>
          </section>
        ) : null}

        {activeTab === 'help' ? (
          <section className="mt-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <h2 className="text-xl font-bold text-blue-900">Help Centre (Nearby NGO Contacts)</h2>
            <p className="text-sm text-slate-600 mt-1">Contact available nearby NGOs for immediate assistance.</p>
            <div className="mt-3 grid md:grid-cols-2 gap-3 text-sm">
              {nearbyNgos.map((ngo) => (
                <article key={ngo.id} className="border rounded-xl p-3 bg-slate-50">
                  <p className="font-semibold">{ngo.name}</p>
                  <p>Contact: {ngo.phone || ngo.contact || 'Not provided'}</p>
                  <p>Location: {ngo.location || 'Not provided'}</p>
                  <p>Specialization: {ngo.specialization || 'General support'}</p>
                </article>
              ))}
              {!loading && nearbyNgos.length === 0 ? (
                <p className="text-slate-500">No NGO data available yet. Ask NGO/Admin to add NGO details.</p>
              ) : null}
            </div>
          </section>
        ) : null}

        {activeTab === 'alerts' ? (
          <section className="mt-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <h2 className="text-xl font-bold text-blue-900">Alerts</h2>
            <div className="mt-3 space-y-2 text-sm max-h-72 overflow-auto pr-1">
              {alerts.map((item) => (
                <article key={item.id} className="border rounded-lg p-3">
                  <p className="font-semibold">[{item.severity}] {item.title}</p>
                  <p className="text-slate-700 mt-1">{item.message}</p>
                  <p className="text-xs text-slate-500 mt-1">Channel: {item.channel || 'web'}</p>
                </article>
              ))}
              {!loading && alerts.length === 0 ? <p className="text-slate-500">No alerts available.</p> : null}
            </div>
          </section>
        ) : null}

        {activeTab === 'missing' ? (
          <section className="mt-4 grid md:grid-cols-2 gap-4">
            <article className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-xl font-bold text-blue-900">Find Missing Person</h3>
              <p className="text-sm text-slate-600 mt-1">Search by name or keyword from existing reports.</p>
              <form onSubmit={findMissingPerson} className="mt-3 flex gap-2">
                <input
                  className="flex-1 border rounded-lg px-3 py-2"
                  placeholder="Search name or details"
                  value={missingSearchQuery}
                  onChange={(e) => setMissingSearchQuery(e.target.value)}
                />
                <button disabled={Boolean(actionLoading)} className="rounded-lg bg-blue-900 text-white px-4 py-2 disabled:opacity-60">{actionLoading ? 'Please wait...' : 'Find'}</button>
              </form>
              <div className="mt-3 space-y-2 text-sm max-h-52 overflow-auto pr-1">
                {displayedMissing.map((item) => (
                  <article
                    key={item.id}
                    className="border rounded-lg p-2 bg-slate-50 cursor-pointer hover:border-blue-300"
                    onClick={() => setSelectedMissing(item)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{item.name}</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedMissing(item)
                          }}
                          className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-700"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteMissingPerson(item.id)
                          }}
                          className="rounded border border-red-300 px-2 py-1 text-xs text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p>Last seen: {item.last_seen || 'Not provided'}</p>
                    <p>Notes: {item.notes || 'None'}</p>
                    <p>Status: {item.case_status || 'missing'}</p>
                    <p>Verification: {item.verification_status || 'not_required'}</p>
                  </article>
                ))}
                {displayedMissing.length === 0 ? <p className="text-slate-500">No missing person records found.</p> : null}
              </div>
            </article>

            <article className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-xl font-bold text-blue-900">Report Missing Person</h3>
              <p className="text-sm text-slate-600 mt-1">Submit details so rescue teams can search faster.</p>
              <form onSubmit={reportMissingPerson} className="mt-3 space-y-2">
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Name"
                  value={missingForm.name}
                  onChange={(e) => setMissingForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="border rounded-lg px-3 py-2"
                    type="number"
                    min="0"
                    max="120"
                    placeholder="Age"
                    value={missingForm.age}
                    onChange={(e) => setMissingForm((p) => ({ ...p, age: e.target.value }))}
                  />
                  <input
                    className="border rounded-lg px-3 py-2"
                    placeholder="Last seen location"
                    value={missingForm.last_seen}
                    onChange={(e) => setMissingForm((p) => ({ ...p, last_seen: e.target.value }))}
                  />
                </div>
                <textarea
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Notes / identifying details"
                  value={missingForm.notes}
                  onChange={(e) => setMissingForm((p) => ({ ...p, notes: e.target.value }))}
                />
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Reporter contact"
                  value={missingForm.reporter_contact}
                  onChange={(e) => setMissingForm((p) => ({ ...p, reporter_contact: e.target.value }))}
                />
                <button disabled={Boolean(actionLoading)} className="w-full rounded-lg bg-orange-500 text-white px-4 py-2 disabled:opacity-60">
                  {actionLoading ? 'Please wait...' : 'Submit Report'}
                </button>
              </form>
            </article>

            {missingMsg ? (
              <section className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm">
                {missingMsg}
              </section>
            ) : null}
          </section>
        ) : null}

        {actionLoading ? (
          <section className="fixed right-4 top-32 z-50 max-w-sm rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm shadow-xl">
            {actionLoading}
          </section>
        ) : null}

        {(msg || missingMsg) ? (
          <section className="fixed right-4 top-32 z-50 max-w-sm rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-xl">
            {missingMsg || msg}
          </section>
        ) : null}

        {showSendSelectionModal ? (
          <section className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 p-4 pt-28">
            <article className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-blue-900">Send Money (Select User)</h3>
                <button type="button" onClick={() => setShowSendSelectionModal(false)} className="rounded border px-3 py-1 text-sm">Close</button>
              </div>
              <form onSubmit={transferP2PBySelect} className="mt-3 space-y-2 text-sm">
                <input
                  className="w-full rounded border px-3 py-2"
                  placeholder="Search user by name/role/email/phone..."
                  value={p2pUserSearch}
                  onChange={(e) => setP2pUserSearch(e.target.value)}
                />
                <p className="text-xs text-slate-600">
                  Users shown: {filteredP2PUsers.length} / {p2pDirectory.length}
                </p>
                <div className="max-h-44 overflow-auto rounded border">
                  {filteredP2PUsers.map((entry) => (
                    <button
                      key={entry.user_id}
                      type="button"
                      onClick={() => setP2pTransferForm((p) => ({ ...p, to_user_id: entry.user_id }))}
                      className={`w-full border-b px-3 py-2 text-left text-xs hover:bg-slate-50 ${
                        p2pTransferForm.to_user_id === entry.user_id ? 'bg-blue-50' : 'bg-white'
                      }`}
                    >
                      {entry.name} ({entry.role}) {entry.email ? `- ${entry.email}` : ''} {entry.phone ? `- ${entry.phone}` : ''}
                    </button>
                  ))}
                  {filteredP2PUsers.length === 0 ? <p className="px-3 py-2 text-xs text-slate-500">No matching users.</p> : null}
                </div>
                <p className="text-xs text-slate-700">
                  Selected User ID: {p2pTransferForm.to_user_id || 'None'}
                </p>
                <input type="hidden" value={p2pTransferForm.to_user_id} required readOnly />
                <input className="w-full rounded border px-3 py-2" type="number" min="1" step="0.01" placeholder="Amount" value={p2pTransferForm.amount} onChange={(e) => setP2pTransferForm((p) => ({ ...p, amount: e.target.value }))} required />
                <textarea className="w-full rounded border px-3 py-2" placeholder="Note (optional)" value={p2pTransferForm.note} onChange={(e) => setP2pTransferForm((p) => ({ ...p, note: e.target.value }))} />
                <button disabled={Boolean(actionLoading)} className="w-full rounded-lg bg-blue-900 text-white px-4 py-2 disabled:opacity-60">{actionLoading ? 'Please wait...' : 'Send By Selection'}</button>
              </form>
            </article>
          </section>
        ) : null}

        {showSendMobileModal ? (
          <section className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 p-4 pt-28">
            <article className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-blue-900">Send By Mobile Number</h3>
                <button type="button" onClick={() => setShowSendMobileModal(false)} className="rounded border px-3 py-1 text-sm">Close</button>
              </div>
              <form onSubmit={transferP2PByPhone} className="mt-3 grid gap-2 md:grid-cols-3 text-sm">
                <input className="md:col-span-2 rounded border px-3 py-2" placeholder="Enter receiver mobile number" value={p2pTransferForm.phone} onChange={(e) => setP2pTransferForm((p) => ({ ...p, phone: e.target.value }))} required />
                <input className="rounded border px-3 py-2" type="number" min="1" step="0.01" placeholder="Amount" value={p2pTransferForm.amount} onChange={(e) => setP2pTransferForm((p) => ({ ...p, amount: e.target.value }))} required />
                <textarea className="md:col-span-3 rounded border px-3 py-2" placeholder="Note (optional)" value={p2pTransferForm.note} onChange={(e) => setP2pTransferForm((p) => ({ ...p, note: e.target.value }))} />
                <button disabled={Boolean(actionLoading)} className="md:col-span-3 w-full rounded-lg bg-emerald-700 text-white px-4 py-2 disabled:opacity-60">{actionLoading ? 'Please wait...' : 'Send By Mobile Number'}</button>
              </form>
            </article>
          </section>
        ) : null}

        {showTopupModal ? (
          <section className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 p-4 pt-28">
            <article className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-blue-900">Move Compensation To Website Wallet</h3>
                <button type="button" onClick={() => setShowTopupModal(false)} className="rounded border px-3 py-1 text-sm">Close</button>
              </div>
              <form onSubmit={topupFromCompensation} className="mt-3 space-y-2 text-sm">
                <input className="w-full rounded border px-3 py-2" type="number" min="1" step="0.01" placeholder="Amount" value={topupForm.amount} onChange={(e) => setTopupForm((p) => ({ ...p, amount: e.target.value }))} required />
                <textarea className="w-full rounded border px-3 py-2" placeholder="Note (optional)" value={topupForm.note} onChange={(e) => setTopupForm((p) => ({ ...p, note: e.target.value }))} />
                <button disabled={Boolean(actionLoading)} className="w-full rounded-lg bg-indigo-700 text-white px-4 py-2 disabled:opacity-60">{actionLoading ? 'Please wait...' : 'Move To Website Wallet'}</button>
              </form>
            </article>
          </section>
        ) : null}

        {showBankTransferModal ? (
          <section className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 p-4 pt-28">
            <article className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-blue-900">Request Bank Transfer</h3>
                <button type="button" onClick={() => setShowBankTransferModal(false)} className="rounded border px-3 py-1 text-sm">Close</button>
              </div>
              <form onSubmit={requestBankTransfer} className="mt-3 space-y-2 text-sm">
                <input className="w-full rounded border px-3 py-2" type="number" min="1" step="0.01" placeholder="Amount" value={withdrawForm.amount} onChange={(e) => setWithdrawForm((p) => ({ ...p, amount: e.target.value }))} required />
                <input className="w-full rounded border px-3 py-2" placeholder="Account holder name" value={withdrawForm.account_holder} onChange={(e) => setWithdrawForm((p) => ({ ...p, account_holder: e.target.value }))} required />
                <input className="w-full rounded border px-3 py-2" placeholder="Bank name" value={withdrawForm.bank_name} onChange={(e) => setWithdrawForm((p) => ({ ...p, bank_name: e.target.value }))} required />
                <input className="w-full rounded border px-3 py-2" placeholder="Account number" value={withdrawForm.account_number} onChange={(e) => setWithdrawForm((p) => ({ ...p, account_number: e.target.value }))} required />
                <input className="w-full rounded border px-3 py-2" placeholder="IFSC" value={withdrawForm.ifsc} onChange={(e) => setWithdrawForm((p) => ({ ...p, ifsc: e.target.value }))} required />
                <textarea className="w-full rounded border px-3 py-2" placeholder="Note (optional)" value={withdrawForm.note} onChange={(e) => setWithdrawForm((p) => ({ ...p, note: e.target.value }))} />
                <button disabled={Boolean(actionLoading)} className="w-full rounded-lg bg-emerald-700 text-white px-4 py-2 disabled:opacity-60">{actionLoading ? 'Please wait...' : 'Request Bank Transfer'}</button>
              </form>
            </article>
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
                <p><span className="font-semibold">Finder Email:</span> {selectedMissing.found_reporter_email || '-'}</p>
                <p><span className="font-semibold">Record ID:</span> {selectedMissing.id || '-'}</p>
                <p><span className="font-semibold">Created At:</span> {selectedMissing.created_at || '-'}</p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => openFoundConfirm(selectedMissing)}
                    disabled={Boolean(actionLoading) || selectedMissing.case_status === 'found_verified' || selectedMissing.case_status === 'found_pending_verification'}
                    className="rounded border border-emerald-300 px-3 py-1.5 text-xs text-emerald-700 disabled:opacity-60"
                  >
                    Mark As Found (Send for NGO/Admin Verification)
                  </button>
                </div>
              </div>
            </article>
          </section>
        ) : null}
        {foundConfirm.open ? (
          <section className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-900/70 p-4 pt-32">
            <article className="w-full max-w-sm max-h-[calc(100vh-9rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-2xl break-words">
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-lg font-bold text-blue-900">Found Confirmation</h4>
                <button
                  type="button"
                  onClick={() => setFoundConfirm({ open: false, record: null, email: '', phone: '' })}
                  className="rounded border px-3 py-1 text-sm"
                >
                  Close
                </button>
              </div>
              <p className="mt-2 text-sm text-slate-600">Enter finder details for NGO/Admin verification.</p>
              <form onSubmit={submitFoundConfirm} className="mt-3 space-y-2 text-sm">
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  type="email"
                  placeholder="Finder email"
                  value={foundConfirm.email}
                  onChange={(e) => setFoundConfirm((p) => ({ ...p, email: e.target.value }))}
                  required
                />
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Finder phone number"
                  value={foundConfirm.phone}
                  onChange={(e) => setFoundConfirm((p) => ({ ...p, phone: e.target.value }))}
                  required
                />
                <button className="w-full rounded-lg bg-emerald-700 text-white px-4 py-2">
                  Continue (2-Step Confirm)
                </button>
              </form>
            </article>
          </section>
        ) : null}
        <VoiceAssistant onCommand={handleVoiceCommand} />
      </div>
      <AssistantHub />
    </main>
  )
}
