import { useEffect, useMemo, useState } from 'react'
import RoleNav from '../components/RoleNav'
import { useAuth } from '../context/AuthContext'
import { API_BASE, apiRequest } from '../lib/api'

const tools = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'ngos', label: 'NGOs' },
  { id: 'workers', label: 'NGO Employees' },
  { id: 'compensation', label: 'Compensation' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'donations', label: 'Donations' },
  { id: 'history', label: 'History' },
  { id: 'assign', label: 'Assign Tasks' },
]

const roleLabel = (role) => (role === 'worker' ? 'employee' : role)

export default function AdminPage() {
  const { token, user } = useAuth()
  const [activeTool, setActiveTool] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const [summary, setSummary] = useState({})
  const [users, setUsers] = useState([])
  const [ngos, setNgos] = useState([])
  const [workers, setWorkers] = useState([])
  const [donations, setDonations] = useState([])
  const [tasks, setTasks] = useState([])
  const [survivors, setSurvivors] = useState([])
  const [missingPersons, setMissingPersons] = useState([])
  const [compAccounts, setCompAccounts] = useState([])
  const [compTransactions, setCompTransactions] = useState([])
  const [adminWallet, setAdminWallet] = useState(null)
  const [walletDirectory, setWalletDirectory] = useState([])
  const [walletTransactions, setWalletTransactions] = useState([])
  const [adminWalletUserSearch, setAdminWalletUserSearch] = useState('')
  const [donationWorkerSelection, setDonationWorkerSelection] = useState({})
  const [adminTransferForm, setAdminTransferForm] = useState({
    to_user_id: '',
    phone: '',
    amount: '',
    note: '',
  })
  const [homeSettings, setHomeSettings] = useState({
    alert_text: '',
    hero_text: '',
    image_path: '',
  })
  const [homeForm, setHomeForm] = useState({
    alert_text: '',
    hero_text: '',
  })
  const [homeImageFile, setHomeImageFile] = useState(null)
  const [homeUpdating, setHomeUpdating] = useState(false)
  const [homeMsg, setHomeMsg] = useState('')

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    owner_ngo_user_id: '',
    assigned_worker_id: '',
  })
  const [userQuery, setUserQuery] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('all')
  const [ngoQuery, setNgoQuery] = useState('')
  const [ngoWorkFilter, setNgoWorkFilter] = useState('all')
  const [workerQuery, setWorkerQuery] = useState('')
  const [workerAvailabilityFilter, setWorkerAvailabilityFilter] = useState('all')
  const [compGrantForm, setCompGrantForm] = useState({
    survivor_user_id: '',
    amount: '',
    note: '',
    disaster_ref: '',
  })
  const [compTool, setCompTool] = useState('overview')
  const [compGrantSurvivorQuery, setCompGrantSurvivorQuery] = useState('')
  const [compGrantBalanceFilter, setCompGrantBalanceFilter] = useState('all')
  const [compGrantModalOpen, setCompGrantModalOpen] = useState(false)
  const [compBulkModalOpen, setCompBulkModalOpen] = useState(false)
  const [compBulkSubmitting, setCompBulkSubmitting] = useState(false)
  const [compBulkForm, setCompBulkForm] = useState({
    amount: '',
    note: '',
    disaster_ref: '',
  })
  const [compAccountQuery, setCompAccountQuery] = useState('')
  const [compAccountBalanceFilter, setCompAccountBalanceFilter] = useState('all')
  const [compTxQuery, setCompTxQuery] = useState('')
  const [compTxStatusFilter, setCompTxStatusFilter] = useState('all')
  const loadHomeSettings = () => {
    apiRequest('/v1/home-settings')
      .then((data) => {
        setHomeSettings(data)
        setHomeForm({ alert_text: data.alert_text, hero_text: data.hero_text })
      })
      .catch((err) => setHomeMsg(err.message))
  }

  const load = async () => {
    setLoading(true)
    setMsg('')
    try {
      const [summaryData, usersData, ngoData, workerData, donationData, taskData, survivorData, missingData, compAccountData, compTxData, walletMeData, walletDirectoryData, walletTxData] = await Promise.all([
        apiRequest('/v1/platform/summary', { token }),
        apiRequest('/v1/auth/users', { token }),
        apiRequest('/v1/platform/ngos', { token }),
        apiRequest('/v1/platform/workers', { token }),
        apiRequest('/v1/platform/donations', { token }),
        apiRequest('/v1/platform/tasks', { token }),
        apiRequest('/v1/survivors', { token }),
        apiRequest('/v1/platform/missing-persons', { token }),
        apiRequest('/v1/platform/compensation/accounts', { token }),
        apiRequest('/v1/platform/compensation/transactions', { token }),
        apiRequest('/v1/platform/wallet/me', { token }),
        apiRequest('/v1/platform/wallet/directory', { token }),
        apiRequest('/v1/platform/wallet/transactions', { token }),
      ])
      setSummary(summaryData || {})
      setUsers(usersData?.users || [])
      setNgos(ngoData || [])
      setWorkers(workerData || [])
      setDonations(donationData || [])
      setTasks(taskData || [])
      setSurvivors(survivorData || [])
      setMissingPersons(missingData || [])
      setCompAccounts(compAccountData || [])
      setCompTransactions(compTxData || [])
      setAdminWallet(walletMeData?.account || null)
      setWalletDirectory(walletDirectoryData || [])
      setWalletTransactions(walletTxData || [])
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

  const ngoUsers = useMemo(() => users.filter((u) => u.role === 'ngo'), [users])
  const donorUsers = useMemo(() => users.filter((u) => u.role === 'donor'), [users])
  const userById = useMemo(() => {
    const map = new Map()
    users.forEach((u) => map.set(u.id, u))
    return map
  }, [users])

  const ngoProfileByOwner = useMemo(() => {
    const map = new Map()
    ngos.forEach((n) => {
      if (n.owner_user_id) map.set(n.owner_user_id, n)
    })
    return map
  }, [ngos])

  const workersForSelectedNgo = useMemo(
    () => workers.filter((w) => w.owner_ngo_user_id === taskForm.owner_ngo_user_id),
    [workers, taskForm.owner_ngo_user_id],
  )

  const ngoWorkRows = useMemo(
    () =>
      ngoUsers.map((u) => {
        const ngoTasks = tasks.filter((t) => t.owner_ngo_user_id === u.id)
        const ngoSurvivorActions = survivors.filter((s) => s.assigned_by_ngo_user_id === u.id)
        const completedTasks = ngoTasks.filter((t) => t.status === 'completed').length
        const inProgressTasks = ngoTasks.filter((t) => t.status === 'in_progress').length
        return {
          ...u,
          ngoProfile: ngoProfileByOwner.get(u.id),
          totalTasks: ngoTasks.length,
          completedTasks,
          inProgressTasks,
          survivorAssignments: ngoSurvivorActions.length,
        }
      }),
    [ngoUsers, tasks, survivors, ngoProfileByOwner],
  )

  const workerWorkRows = useMemo(
    () =>
      workers.map((w) => {
        const workerTaskCount = tasks.filter((t) => t.assigned_worker_id === (w.linked_user_id || w.id)).length
        const workerDone = tasks.filter((t) => t.assigned_worker_id === (w.linked_user_id || w.id) && t.status === 'completed').length
        const survivorCount = survivors.filter((s) => s.assigned_worker_id === (w.linked_user_id || w.id)).length
        return {
          ...w,
          workerTaskCount,
          workerDone,
          survivorCount,
          registeredEmail: w.linked_user_id ? userById.get(w.linked_user_id)?.email || null : null,
        }
      }),
    [workers, tasks, survivors, userById],
  )

  const donorRows = useMemo(
    () =>
      donorUsers.map((u) => {
        const accDonations = donations.filter((d) => String(d.donor_name || '').trim().toLowerCase() === String(u.name || '').trim().toLowerCase())
        return {
          ...u,
          donationCount: accDonations.length,
          recentDonation: accDonations[0] || null,
        }
      }),
    [donorUsers, donations],
  )
  const survivorUsers = useMemo(() => users.filter((u) => u.role === 'survivor'), [users])
  const survivorAccountOptions = useMemo(() => {
    const map = new Map()

    survivorUsers.forEach((u) => {
      map.set(u.id, { id: u.id, name: u.name, email: u.email })
    })

    survivors.forEach((s) => {
      const uid = s.created_by_user_id
      if (!uid) return
      if (map.has(uid)) return
      map.set(uid, {
        id: uid,
        name: s.name || 'Survivor User',
        email: userById.get(uid)?.email || null,
      })
    })

    compAccounts.forEach((acc) => {
      const uid = acc.survivor_user_id
      if (!uid) return
      if (map.has(uid)) return
      const linked = userById.get(uid)
      map.set(uid, {
        id: uid,
        name: linked?.name || 'Survivor User',
        email: linked?.email || null,
      })
    })

    return Array.from(map.values()).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
  }, [survivorUsers, survivors, compAccounts, userById])

  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase()
    return users.filter((u) => {
      if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false
      if (!query) return true
      return (
        String(u.name || '').toLowerCase().includes(query) ||
        String(u.email || '').toLowerCase().includes(query) ||
        String(u.role || '').toLowerCase().includes(query)
      )
    })
  }, [users, userQuery, userRoleFilter])

  const filteredNgoWorkRows = useMemo(() => {
    const query = ngoQuery.trim().toLowerCase()
    return ngoWorkRows.filter((row) => {
      if (ngoWorkFilter === 'has_completed' && row.completedTasks <= 0) return false
      if (ngoWorkFilter === 'in_progress' && row.inProgressTasks <= 0) return false
      if (ngoWorkFilter === 'no_tasks' && row.totalTasks > 0) return false
      if (!query) return true
      return (
        String(row.name || '').toLowerCase().includes(query) ||
        String(row.email || '').toLowerCase().includes(query) ||
        String(row.ngoProfile?.name || '').toLowerCase().includes(query) ||
        String(row.ngoProfile?.location || '').toLowerCase().includes(query)
      )
    })
  }, [ngoWorkRows, ngoQuery, ngoWorkFilter])

  const filteredWorkerWorkRows = useMemo(() => {
    const query = workerQuery.trim().toLowerCase()
    return workerWorkRows.filter((w) => {
      if (workerAvailabilityFilter !== 'all' && String(w.availability_status || '') !== workerAvailabilityFilter) return false
      if (!query) return true
      return (
        String(w.name || '').toLowerCase().includes(query) ||
        String(w.phone || '').toLowerCase().includes(query) ||
        String(w.registeredEmail || '').toLowerCase().includes(query) ||
        String(w.ngo_name || '').toLowerCase().includes(query)
      )
    })
  }, [workerWorkRows, workerQuery, workerAvailabilityFilter])
  const filteredCompAccounts = useMemo(() => {
    const query = compAccountQuery.trim().toLowerCase()
    return compAccounts.filter((acc) => {
      const user = userById.get(acc.survivor_user_id)
      const balance = Number(acc.balance || 0)
      if (compAccountBalanceFilter === 'has_balance' && balance <= 0) return false
      if (compAccountBalanceFilter === 'zero_balance' && balance > 0) return false
      if (!query) return true
      return (
        String(acc.survivor_user_id || '').toLowerCase().includes(query) ||
        String(user?.name || '').toLowerCase().includes(query) ||
        String(user?.email || '').toLowerCase().includes(query)
      )
    })
  }, [compAccounts, compAccountQuery, compAccountBalanceFilter, userById])
  const filteredCompGrantOptions = useMemo(() => {
    const query = compGrantSurvivorQuery.trim().toLowerCase()
    return survivorAccountOptions.filter((u) => {
      const account = compAccounts.find((acc) => acc.survivor_user_id === u.id)
      const balance = Number(account?.balance || 0)
      if (compGrantBalanceFilter === 'has_balance' && balance <= 0) return false
      if (compGrantBalanceFilter === 'zero_balance' && balance > 0) return false
      if (!query) return true
      return (
        String(u.name || '').toLowerCase().includes(query) ||
        String(u.email || '').toLowerCase().includes(query) ||
        String(u.id || '').toLowerCase().includes(query)
      )
    })
  }, [survivorAccountOptions, compAccounts, compGrantSurvivorQuery, compGrantBalanceFilter])
  const pendingWithdrawals = useMemo(
    () => compTransactions.filter((tx) => tx.tx_type === 'bank_withdrawal' && tx.status === 'pending'),
    [compTransactions],
  )
  const filteredCompTransactions = useMemo(() => {
    const query = compTxQuery.trim().toLowerCase()
    return compTransactions.filter((tx) => {
      if (tx.status === 'pending') return false
      if (tx.status === 'approved') return false
      if (compTxStatusFilter !== 'all' && tx.status !== compTxStatusFilter) return false
      if (!query) return true
      const survivorUser = userById.get(tx.survivor_user_id)
      return (
        String(tx.tx_type || '').toLowerCase().includes(query) ||
        String(tx.status || '').toLowerCase().includes(query) ||
        String(tx.survivor_user_id || '').toLowerCase().includes(query) ||
        String(survivorUser?.name || '').toLowerCase().includes(query) ||
        String(survivorUser?.email || '').toLowerCase().includes(query) ||
        String(tx.note || tx.review_note || '').toLowerCase().includes(query)
      )
    })
  }, [compTransactions, compTxStatusFilter, compTxQuery, userById])
  const filteredWalletUsers = useMemo(() => {
    const query = adminWalletUserSearch.trim().toLowerCase()
    return walletDirectory.filter((entry) => {
      if (user?.id && entry.user_id === user.id) return false
      if (!query) return true
      return (
        String(entry.name || '').toLowerCase().includes(query) ||
        String(entry.role || '').toLowerCase().includes(query) ||
        String(entry.email || '').toLowerCase().includes(query) ||
        String(entry.phone || '').toLowerCase().includes(query)
      )
    })
  }, [walletDirectory, adminWalletUserSearch, user?.id])
  const compensationSummary = useMemo(() => {
    let totalCredited = 0
    let totalSpent = 0
    let totalWithdrawn = 0
    let totalBalance = 0
    compAccounts.forEach((acc) => {
      totalCredited += Number(acc.total_credited || 0)
      totalSpent += Number(acc.total_spent || 0)
      totalWithdrawn += Number(acc.total_withdrawn || 0)
      totalBalance += Number(acc.balance || 0)
    })
    const pendingAmount = pendingWithdrawals.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
    return {
      accounts: compAccounts.length,
      txCount: compTransactions.length,
      totalCredited,
      totalSpent,
      totalWithdrawn,
      totalBalance,
      pendingWithdrawals: pendingWithdrawals.length,
      pendingAmount,
    }
  }, [compAccounts, compTransactions, pendingWithdrawals])
  const selectedGrantSurvivor = useMemo(
    () => survivorAccountOptions.find((u) => u.id === compGrantForm.survivor_user_id) || null,
    [survivorAccountOptions, compGrantForm.survivor_user_id],
  )

  const workerProfileByLinkedUser = useMemo(() => {
    const map = new Map()
    workers.forEach((w) => {
      if (w.linked_user_id) map.set(w.linked_user_id, w)
    })
    return map
  }, [workers])
  const workerPickupOptions = useMemo(
    () =>
      workers.map((w) => ({
        userId: w.linked_user_id || w.id,
        label: `${w.name || 'Employee'} (${w.availability_status || 'Unknown'})`,
      })),
    [workers],
  )

  const donationStatusLabel = {
    submitted: 'Submitted',
    worker_assigned: 'Employee Assigned',
    picked_up: 'Picked Up',
    distributed: 'Distributed',
    money_transferred: 'Money Credited',
  }

  const formatWhen = (raw) => {
    if (!raw) return 'Unknown'
    const dt = new Date(raw)
    if (Number.isNaN(dt.getTime())) return String(raw)
    return dt.toLocaleString()
  }

  const userHistoryRows = useMemo(
    () =>
      users.map((u) => {
        const profile = workerProfileByLinkedUser.get(u.id)
        const workerAssignee = profile?.linked_user_id || profile?.id || u.id
        const ownedTasks = tasks.filter((t) => t.owner_ngo_user_id === u.id)
        const assignedTasks = tasks.filter((t) => t.assigned_worker_id === workerAssignee)
        const createdSurvivorRequests = survivors.filter((s) => s.created_by_user_id === u.id)
        const ngoSurvivorAssignments = survivors.filter((s) => s.assigned_by_ngo_user_id === u.id)
        const workerSurvivorAssignments = survivors.filter((s) => s.assigned_worker_id === workerAssignee)
        const userMissingReports = missingPersons.filter((m) => m.found_reported_by_user_id === u.id)
        const userDonations = donations.filter((d) => String(d.donor_name || '').trim().toLowerCase() === String(u.name || '').trim().toLowerCase())
        const completedOwned = ownedTasks.filter((t) => t.status === 'completed').length
        const completedAssigned = assignedTasks.filter((t) => t.status === 'completed').length
        const inProgressAssigned = assignedTasks.filter((t) => t.status === 'in_progress').length

        const events = [
          ...ownedTasks.map((t) => ({
            when: t.created_at,
            label: `Created NGO task: ${t.title || 'Untitled'} (${t.status || 'open'})`,
          })),
          ...assignedTasks.map((t) => ({
            when: t.created_at,
            label: `Employee task assigned: ${t.title || 'Untitled'} (${t.status || 'open'})`,
          })),
          ...createdSurvivorRequests.map((s) => ({
            when: s.created_at,
            label: `Created survivor request: ${s.name || 'Unknown'} (${s.request_status || 'open'})`,
          })),
          ...ngoSurvivorAssignments.map((s) => ({
            when: s.created_at,
            label: `NGO assignment action: ${s.name || 'Unknown'} -> ${s.assigned_worker_name || 'Unassigned'}`,
          })),
          ...workerSurvivorAssignments.map((s) => ({
            when: s.created_at,
            label: `Employee handled survivor request: ${s.name || 'Unknown'} (${s.request_status || 'open'})`,
          })),
          ...userDonations.map((d) => ({
            when: d.created_at,
            label: `Donation added: ${d.item_type || 'item'} (${d.quantity || '-'})`,
          })),
          ...userMissingReports.map((m) => ({
            when: m.created_at,
            label: `Missing found report submitted: ${m.name || 'Unknown'} (${m.case_status || 'missing'})`,
          })),
        ]
          .sort((a, b) => new Date(b.when || 0).getTime() - new Date(a.when || 0).getTime())
          .slice(0, 6)

        return {
          ...u,
          completedOwned,
          ownedTotal: ownedTasks.length,
          assignedTotal: assignedTasks.length,
          completedAssigned,
          inProgressAssigned,
          survivorCreated: createdSurvivorRequests.length,
          survivorAssignedByNgo: ngoSurvivorAssignments.length,
          survivorHandledByWorker: workerSurvivorAssignments.length,
          donationCount: userDonations.length,
          missingReportCount: userMissingReports.length,
          recentEvents: events,
        }
      }),
    [users, workerProfileByLinkedUser, tasks, survivors, donations, missingPersons],
  )

  const createTask = async (e) => {
    e.preventDefault()
    try {
      const ngoProfile = ngoProfileByOwner.get(taskForm.owner_ngo_user_id)
      await apiRequest('/v1/platform/tasks', {
        method: 'POST',
        token,
        body: {
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority,
          owner_ngo_user_id: taskForm.owner_ngo_user_id,
          ngo_id: ngoProfile?.id || null,
          ngo_name: ngoProfile?.name || null,
          assigned_worker_id: taskForm.assigned_worker_id || null,
        },
      })
      setMsg('Task assigned successfully.')
      setTaskForm((p) => ({ ...p, title: '', description: '', assigned_worker_id: '' }))
      await load()
    } catch (err) {
      setMsg(err.message)
    }
  }
  const grantCompensation = async (e) => {
    e.preventDefault()
    try {
      const amount = Number(compGrantForm.amount)
      await apiRequest('/v1/platform/compensation/grant', {
        method: 'POST',
        token,
        body: {
          survivor_user_id: compGrantForm.survivor_user_id,
          amount,
          note: compGrantForm.note || null,
          disaster_ref: compGrantForm.disaster_ref || null,
        },
      })
      setMsg('Compensation granted successfully.')
      setCompGrantModalOpen(false)
      setCompGrantForm({ survivor_user_id: '', amount: '', note: '', disaster_ref: '' })
      await load()
    } catch (err) {
      setMsg(err.message)
    }
  }

  const openGrantModal = (survivorUserId) => {
    setCompGrantForm((p) => ({ ...p, survivor_user_id: survivorUserId }))
    setCompGrantModalOpen(true)
  }

  const grantCompensationToAll = async (e) => {
    e.preventDefault()
    const amount = Number(compBulkForm.amount)
    if (!amount || amount <= 0) {
      setMsg('Enter a valid amount for bulk transfer.')
      return
    }

    const survivorIds = Array.from(new Set(survivorAccountOptions.map((u) => u.id).filter(Boolean)))
    if (survivorIds.length === 0) {
      setMsg('No survivor accounts found for bulk transfer.')
      return
    }

    setCompBulkSubmitting(true)
    try {
      for (const survivorUserId of survivorIds) {
        await apiRequest('/v1/platform/compensation/grant', {
          method: 'POST',
          token,
          body: {
            survivor_user_id: survivorUserId,
            amount,
            note: compBulkForm.note || null,
            disaster_ref: compBulkForm.disaster_ref || null,
          },
        })
      }
      setMsg(`Bulk transfer completed. ${survivorIds.length} survivors credited.`)
      setCompBulkModalOpen(false)
      setCompBulkForm({ amount: '', note: '', disaster_ref: '' })
      await load()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setCompBulkSubmitting(false)
    }
  }

  const reviewWithdrawal = async (txId, decision) => {
    try {
      await apiRequest(`/v1/platform/compensation/transactions/${txId}/review`, {
        method: 'PATCH',
        token,
        body: { decision },
      })
      setMsg(decision === 'approve' ? 'Withdrawal request approved.' : 'Withdrawal request rejected.')
      await load()
    } catch (err) {
      setMsg(err.message)
    }
  }

  const transferFromAdminBySelection = async (e) => {
    e.preventDefault()
    try {
      await apiRequest('/v1/platform/wallet/transfer', {
        method: 'POST',
        token,
        body: {
          to_user_id: adminTransferForm.to_user_id,
          amount: Number(adminTransferForm.amount),
          note: adminTransferForm.note || null,
        },
      })
      setMsg('Admin transfer completed.')
      setAdminTransferForm((p) => ({ ...p, to_user_id: '', amount: '', note: '' }))
      await load()
    } catch (err) {
      setMsg(err.message)
    }
  }

  const transferFromAdminByPhone = async (e) => {
    e.preventDefault()
    try {
      await apiRequest('/v1/platform/wallet/transfer/by-phone', {
        method: 'POST',
        token,
        body: {
          phone: adminTransferForm.phone,
          amount: Number(adminTransferForm.amount),
          note: adminTransferForm.note || null,
        },
      })
      setMsg('Admin mobile-number transfer completed.')
      setAdminTransferForm((p) => ({ ...p, phone: '', amount: '', note: '', to_user_id: '' }))
      await load()
    } catch (err) {
      setMsg(err.message)
    }
  }

  const assignDonationWorker = async (donationId) => {
    const workerUserId = donationWorkerSelection[donationId]
    if (!workerUserId) {
      setMsg('Select an employee first.')
      return
    }
    try {
      await apiRequest(`/v1/platform/donations/${donationId}/assign-worker`, {
        method: 'PATCH',
        token,
        body: { worker_user_id: workerUserId },
      })
      setMsg('Employee assigned for pickup.')
      await load()
    } catch (err) {
      setMsg(err.message)
    }
  }

  const markDonationPickedUp = async (donationId) => {
    try {
      await apiRequest(`/v1/platform/donations/${donationId}/mark-picked-up`, {
        method: 'PATCH',
        token,
        body: {},
      })
      setMsg('Donation marked as picked up.')
      await load()
    } catch (err) {
      setMsg(err.message)
    }
  }

  const markDonationDistributed = async (donationId) => {
    try {
      await apiRequest(`/v1/platform/donations/${donationId}/mark-distributed`, {
        method: 'PATCH',
        token,
        body: {},
      })
      setMsg('Donation marked as distributed.')
      await load()
    } catch (err) {
      setMsg(err.message)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-0">
      <div className="w-full">
        <RoleNav />

        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-blue-900">Admin Control Tools</h1>
              <p className="text-sm text-slate-600">Switch tools to manage platform users, operations, and task assignments.</p>
            </div>
            <button onClick={load} className="rounded border px-3 py-2 text-sm" disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`rounded-lg px-3 py-2 text-sm ${activeTool === tool.id ? 'bg-orange-500 text-white' : 'bg-blue-900 text-white'}`}
              >
                {tool.label}
              </button>
            ))}
          </div>
        </section>

        {activeTool === 'overview' ? (
          <section className="mt-4 rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-blue-900">Platform Overview</h2>
            <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(summary).map(([k, v]) => (
                <div key={k} className="rounded border bg-slate-50 p-2">
                  <p className="text-slate-500">{k}</p>
                  <p className="font-bold">{String(v)}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {activeTool === 'users' ? (
          <section className="mt-4 rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-blue-900">All Users</h2>
            <div className="mt-2 grid gap-2 text-sm md:grid-cols-3">
              <input
                className="rounded border px-3 py-2 md:col-span-2"
                placeholder="Search by name, email, role..."
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
              />
              <select className="rounded border px-3 py-2" value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)}>
                <option value="all">All Roles</option>
                <option value="admin">admin</option>
                <option value="survivor">survivor</option>
                <option value="ngo">ngo</option>
                <option value="worker">employee</option>
                <option value="donor">donor</option>
              </select>
            </div>
            <div className="mt-2 max-h-[30rem] overflow-auto text-sm">
              {filteredUsers.map((u) => (
                <article key={u.id} className="mb-2 rounded border bg-slate-50 p-2">
                  <p><span className="font-semibold">Name:</span> {u.name}</p>
                  <p><span className="font-semibold">Email:</span> {u.email}</p>
                  <p><span className="font-semibold">Role:</span> {roleLabel(u.role)}</p>
                  <p><span className="font-semibold">Created By:</span> {u.created_by || '-'}</p>
                </article>
              ))}
              {filteredUsers.length === 0 ? <p className="text-slate-500">No users match this filter.</p> : null}
            </div>
          </section>
        ) : null}

        {activeTool === 'ngos' ? (
          <section className="mt-4 rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-blue-900">NGO Accounts + Work Done</h2>
            <div className="mt-2 grid gap-2 text-sm md:grid-cols-3">
              <input
                className="rounded border px-3 py-2 md:col-span-2"
                placeholder="Search NGO user/profile/location..."
                value={ngoQuery}
                onChange={(e) => setNgoQuery(e.target.value)}
              />
              <select className="rounded border px-3 py-2" value={ngoWorkFilter} onChange={(e) => setNgoWorkFilter(e.target.value)}>
                <option value="all">All NGOs</option>
                <option value="has_completed">Has Completed Tasks</option>
                <option value="in_progress">Has In Progress Tasks</option>
                <option value="no_tasks">No Tasks</option>
              </select>
            </div>
            <div className="mt-2 max-h-[30rem] overflow-auto text-sm">
              {filteredNgoWorkRows.map((row) => (
                <article key={row.id} className="mb-2 rounded border bg-slate-50 p-2">
                  <p><span className="font-semibold">NGO User:</span> {row.name} ({row.email})</p>
                  <p><span className="font-semibold">NGO Profile:</span> {row.ngoProfile?.name || '-'} / {row.ngoProfile?.location || '-'}</p>
                  <p><span className="font-semibold">Tasks:</span> total {row.totalTasks}, in progress {row.inProgressTasks}, completed {row.completedTasks}</p>
                  <p><span className="font-semibold">Survivor Assignments Done:</span> {row.survivorAssignments}</p>
                </article>
              ))}
              {filteredNgoWorkRows.length === 0 ? <p className="text-slate-500">No NGOs match this filter.</p> : null}
            </div>
          </section>
        ) : null}

        {activeTool === 'workers' ? (
          <section className="mt-4 rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-blue-900">NGO Employee Details + Work Done</h2>
            <div className="mt-2 grid gap-2 text-sm md:grid-cols-3">
              <input
                className="rounded border px-3 py-2 md:col-span-2"
                placeholder="Search employee name/phone/email/NGO..."
                value={workerQuery}
                onChange={(e) => setWorkerQuery(e.target.value)}
              />
              <select className="rounded border px-3 py-2" value={workerAvailabilityFilter} onChange={(e) => setWorkerAvailabilityFilter(e.target.value)}>
                <option value="all">All Availability</option>
                <option value="Available">Available</option>
                <option value="On-Task">On-Task</option>
                <option value="Unavailable">Unavailable</option>
              </select>
            </div>
            <div className="mt-2 max-h-[30rem] overflow-auto text-sm">
              {filteredWorkerWorkRows.map((w) => (
                <article key={w.id} className="mb-2 rounded border bg-slate-50 p-2">
                  <p><span className="font-semibold">Employee:</span> {w.name}</p>
                  <p><span className="font-semibold">Registered Email:</span> {w.registeredEmail || '-'}</p>
                  <p><span className="font-semibold">Phone:</span> {w.phone || '-'}</p>
                  <p><span className="font-semibold">NGO:</span> {w.ngo_name || '-'} (owner: {w.owner_ngo_user_id || '-'})</p>
                  <p><span className="font-semibold">Availability:</span> {w.availability_status || '-'}</p>
                  <p><span className="font-semibold">Tasks Done:</span> completed {w.workerDone} / assigned {w.workerTaskCount}</p>
                  <p><span className="font-semibold">Survivor Requests Handled:</span> {w.survivorCount}</p>
                </article>
              ))}
              {filteredWorkerWorkRows.length === 0 ? <p className="text-slate-500">No employees match this filter.</p> : null}
            </div>
          </section>
        ) : null}

        {activeTool === 'compensation' ? (
          <section className="mt-4 rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-blue-900">Survivor Compensation Wallet</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'grant', label: 'Grant' },
                { id: 'accounts', label: 'Accounts' },
                { id: 'withdrawals', label: 'Withdrawals' },
                { id: 'transactions', label: 'Transactions' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCompTool(tab.id)}
                  className={`rounded px-3 py-1.5 text-xs ${compTool === tab.id ? 'bg-orange-500 text-white' : 'bg-blue-900 text-white'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {compTool === 'overview' ? (
              <article className="mt-4 rounded border bg-slate-50 p-3 text-sm">
                <h3 className="font-semibold text-blue-900">Compensation Totals</h3>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded border bg-white p-2"><p className="text-slate-500">Total Accounts</p><p className="font-bold">{compensationSummary.accounts}</p></div>
                  <div className="rounded border bg-white p-2"><p className="text-slate-500">Total Transactions</p><p className="font-bold">{compensationSummary.txCount}</p></div>
                  <div className="rounded border bg-white p-2"><p className="text-slate-500">Total Credited</p><p className="font-bold">{compensationSummary.totalCredited.toFixed(2)}</p></div>
                  <div className="rounded border bg-white p-2"><p className="text-slate-500">Total Spent</p><p className="font-bold">{compensationSummary.totalSpent.toFixed(2)}</p></div>
                </div>
              </article>
            ) : null}

            {compTool === 'grant' ? (
              <article className="mt-4 rounded border bg-slate-50 p-3 text-sm">
                <h3 className="font-semibold text-blue-900">Grant Compensation</h3>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <input
                    className="rounded border px-3 py-2"
                    placeholder="Search survivor by name/email/user id..."
                    value={compGrantSurvivorQuery}
                    onChange={(e) => setCompGrantSurvivorQuery(e.target.value)}
                  />
                  <select className="rounded border px-3 py-2" value={compGrantBalanceFilter} onChange={(e) => setCompGrantBalanceFilter(e.target.value)}>
                    <option value="all">All Survivors</option>
                    <option value="zero_balance">Zero Wallet Balance</option>
                    <option value="has_balance">Has Wallet Balance</option>
                  </select>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded border bg-white p-2">
                  <p className="text-xs text-slate-600">
                    Bulk transfer will credit the same amount to all survivor accounts ({survivorAccountOptions.length}).
                  </p>
                  <button
                    onClick={() => setCompBulkModalOpen(true)}
                    className="rounded bg-orange-500 px-3 py-1.5 text-xs text-white"
                    disabled={survivorAccountOptions.length === 0}
                  >
                    Pay All Survivors
                  </button>
                </div>
                <div className="mt-2 max-h-[26rem] space-y-2 overflow-auto">
                  {filteredCompGrantOptions.map((u) => {
                    const account = compAccounts.find((acc) => acc.survivor_user_id === u.id)
                    return (
                      <div key={u.id} className="rounded border bg-white p-2">
                        <p><span className="font-semibold">Survivor:</span> {u.name || '-'} ({u.email || u.id})</p>
                        <p><span className="font-semibold">Wallet Balance:</span> {Number(account?.balance || 0).toFixed(2)}</p>
                        <div className="mt-2">
                          <button onClick={() => openGrantModal(u.id)} className="rounded bg-blue-900 px-3 py-1.5 text-xs text-white">
                            Add Compensation
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  {filteredCompGrantOptions.length === 0 ? <p className="text-slate-500">No survivors match this filter.</p> : null}
                </div>
              </article>
            ) : null}

            {compTool === 'accounts' ? (
              <article className="mt-4 rounded border bg-slate-50 p-3 text-sm">
                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    className="rounded border px-3 py-2"
                    placeholder="Search survivor name/email/user id..."
                    value={compAccountQuery}
                    onChange={(e) => setCompAccountQuery(e.target.value)}
                  />
                  <select className="rounded border px-3 py-2" value={compAccountBalanceFilter} onChange={(e) => setCompAccountBalanceFilter(e.target.value)}>
                    <option value="all">All Accounts</option>
                    <option value="zero_balance">Zero Balance</option>
                    <option value="has_balance">Has Balance</option>
                  </select>
                </div>
                <div className="mt-2 max-h-[26rem] space-y-2 overflow-auto">
                  {filteredCompAccounts.map((acc) => {
                    const survivorUser = userById.get(acc.survivor_user_id)
                    return (
                      <div key={acc.id} className="rounded border bg-white p-2">
                        <p><span className="font-semibold">Survivor:</span> {survivorUser?.name || '-'} ({survivorUser?.email || '-'})</p>
                        <p><span className="font-semibold">Wallet Balance:</span> {Number(acc.balance || 0).toFixed(2)}</p>
                        <p><span className="font-semibold">Credited:</span> {Number(acc.total_credited || 0).toFixed(2)} | <span className="font-semibold">Spent:</span> {Number(acc.total_spent || 0).toFixed(2)} | <span className="font-semibold">Withdrawn:</span> {Number(acc.total_withdrawn || 0).toFixed(2)}</p>
                      </div>
                    )
                  })}
                  {filteredCompAccounts.length === 0 ? <p className="text-slate-500">No compensation accounts found.</p> : null}
                </div>
              </article>
            ) : null}

            {compTool === 'withdrawals' ? (
              <article className="mt-4 rounded border bg-slate-50 p-3 text-sm">
                <h3 className="font-semibold text-blue-900">Pending Bank Withdraw Requests</h3>
                <div className="mt-2 max-h-[26rem] space-y-2 overflow-auto">
                  {pendingWithdrawals.map((tx) => {
                    const survivorUser = userById.get(tx.survivor_user_id)
                    return (
                      <div key={tx.id} className="rounded border bg-white p-2">
                        <p><span className="font-semibold">Survivor:</span> {survivorUser?.name || '-'} ({survivorUser?.email || '-'})</p>
                        <p><span className="font-semibold">Amount:</span> {Number(tx.amount || 0).toFixed(2)}</p>
                        <p><span className="font-semibold">Bank:</span> {tx.bank_details?.bank_name || '-'}</p>
                        <p><span className="font-semibold">A/C:</span> {tx.bank_details?.account_number || '-'}</p>
                        <p><span className="font-semibold">IFSC:</span> {tx.bank_details?.ifsc || '-'}</p>
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => reviewWithdrawal(tx.id, 'approve')} className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700">Approve</button>
                          <button onClick={() => reviewWithdrawal(tx.id, 'reject')} className="rounded border border-red-300 px-2 py-1 text-xs text-red-700">Reject</button>
                        </div>
                      </div>
                    )
                  })}
                  {pendingWithdrawals.length === 0 ? <p className="text-slate-500">No pending bank withdrawal requests.</p> : null}
                </div>
              </article>
            ) : null}

            {compTool === 'transactions' ? (
              <article className="mt-4 rounded border bg-slate-50 p-3 text-sm">
                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    className="rounded border px-3 py-2"
                    placeholder="Search by type/status/survivor/note..."
                    value={compTxQuery}
                    onChange={(e) => setCompTxQuery(e.target.value)}
                  />
                  <select className="rounded border px-3 py-2" value={compTxStatusFilter} onChange={(e) => setCompTxStatusFilter(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="completed">completed</option>
                    <option value="rejected">rejected</option>
                  </select>
                </div>
                <div className="mt-2 max-h-[26rem] space-y-2 overflow-auto">
                  {filteredCompTransactions.map((tx) => {
                    const survivorUser = userById.get(tx.survivor_user_id)
                    return (
                      <div key={tx.id} className="rounded border bg-white p-2">
                        <p><span className="font-semibold">Type:</span> {tx.tx_type} ({tx.status})</p>
                        <p><span className="font-semibold">Survivor:</span> {survivorUser?.name || tx.survivor_user_id}</p>
                        <p><span className="font-semibold">Amount:</span> {Number(tx.amount || 0).toFixed(2)}</p>
                        <p><span className="font-semibold">Note:</span> {tx.note || tx.review_note || '-'}</p>
                      </div>
                    )
                  })}
                  {filteredCompTransactions.length === 0 ? <p className="text-slate-500">No compensation transactions found.</p> : null}
                </div>
              </article>
            ) : null}
          </section>
        ) : null}

        {activeTool === 'transactions' ? (
          <section className="mt-4 rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-blue-900">Admin Transactions</h2>
            <p className="mt-1 text-sm text-slate-600">Initial admin wallet balance is set to 10,00,000. Transfers are deducted from this balance.</p>
            <div className="mt-3 grid gap-3 text-sm lg:grid-cols-3">
              <article className="rounded border bg-slate-50 p-3">
                <p className="text-slate-500">Admin Balance</p>
                <p className="mt-1 text-2xl font-bold text-blue-900">{Number(adminWallet?.balance || 0).toFixed(2)}</p>
                <p className="mt-1 text-xs text-slate-600">Received: {Number(adminWallet?.total_received || 0).toFixed(2)} | Sent: {Number(adminWallet?.total_sent || 0).toFixed(2)}</p>
              </article>
              <article className="rounded border bg-slate-50 p-3">
                <p className="font-semibold">Send by selection</p>
                <form onSubmit={transferFromAdminBySelection} className="mt-2 space-y-2">
                  <input
                    className="w-full rounded border px-2 py-2"
                    placeholder="Search user by name/role/email/phone..."
                    value={adminWalletUserSearch}
                    onChange={(e) => setAdminWalletUserSearch(e.target.value)}
                  />
                  <select className="w-full rounded border px-2 py-2" value={adminTransferForm.to_user_id} onChange={(e) => setAdminTransferForm((p) => ({ ...p, to_user_id: e.target.value }))} required>
                    <option value="">Select receiver</option>
                    {filteredWalletUsers.map((entry) => (
                      <option key={entry.user_id} value={entry.user_id}>
                        {entry.name} ({entry.role}) {entry.phone ? `- ${entry.phone}` : ''}
                      </option>
                    ))}
                  </select>
                  <input className="w-full rounded border px-2 py-2" type="number" min="1" step="0.01" placeholder="Amount" value={adminTransferForm.amount} onChange={(e) => setAdminTransferForm((p) => ({ ...p, amount: e.target.value }))} required />
                  <textarea className="w-full rounded border px-2 py-2" placeholder="Note" value={adminTransferForm.note} onChange={(e) => setAdminTransferForm((p) => ({ ...p, note: e.target.value }))} />
                  <button className="w-full rounded border border-blue-300 px-2 py-2 text-xs text-blue-700">Send</button>
                </form>
              </article>
              <article className="rounded border bg-slate-50 p-3">
                <p className="font-semibold">Send by mobile number</p>
                <form onSubmit={transferFromAdminByPhone} className="mt-2 space-y-2">
                  <input className="w-full rounded border px-2 py-2" placeholder="Receiver mobile number" value={adminTransferForm.phone} onChange={(e) => setAdminTransferForm((p) => ({ ...p, phone: e.target.value }))} required />
                  <input className="w-full rounded border px-2 py-2" type="number" min="1" step="0.01" placeholder="Amount" value={adminTransferForm.amount} onChange={(e) => setAdminTransferForm((p) => ({ ...p, amount: e.target.value }))} required />
                  <textarea className="w-full rounded border px-2 py-2" placeholder="Note" value={adminTransferForm.note} onChange={(e) => setAdminTransferForm((p) => ({ ...p, note: e.target.value }))} />
                  <button className="w-full rounded border border-emerald-300 px-2 py-2 text-xs text-emerald-700">Send by Mobile</button>
                </form>
              </article>
            </div>
            <article className="mt-3 rounded border bg-slate-50 p-3 text-sm">
              <h3 className="font-semibold text-blue-900">Admin Wallet Transaction History</h3>
              <div className="mt-2 max-h-64 space-y-2 overflow-auto text-xs">
                {walletTransactions.map((tx) => (
                  <div key={tx.id} className="rounded border bg-white p-2">
                    <p className="font-semibold">{tx.tx_type} ({tx.status})</p>
                    <p>Amount: {Number(tx.amount || 0).toFixed(2)}</p>
                    <p>From: {tx.from_user_id || '-'}</p>
                    <p>To: {tx.to_user_id || '-'}</p>
                    <p>Note: {tx.note || '-'}</p>
                  </div>
                ))}
                {walletTransactions.length === 0 ? <p className="text-slate-500">No admin wallet transactions yet.</p> : null}
              </div>
            </article>
          </section>
        ) : null}

        {activeTool === 'donations' ? (
          <section className="mt-4 rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-blue-900">Donation Accounts + Detailed Donations</h2>
            <div className="mt-2 grid gap-4 md:grid-cols-2">
              <article className="rounded border bg-slate-50 p-2 text-sm">
                <h3 className="font-semibold">Donor Accounts</h3>
                <div className="mt-2 max-h-80 overflow-auto">
                  {donorRows.map((d) => (
                    <div key={d.id} className="mb-2 rounded border bg-white p-2">
                      <p><span className="font-semibold">Name:</span> {d.name}</p>
                      <p><span className="font-semibold">Email:</span> {d.email}</p>
                      <p><span className="font-semibold">Donations Count:</span> {d.donationCount}</p>
                      <p><span className="font-semibold">Recent Donation:</span> {d.recentDonation?.item_type || '-'} ({d.recentDonation?.quantity || '-'})</p>
                    </div>
                  ))}
                  {donorRows.length === 0 ? <p className="text-slate-500">No donor accounts found.</p> : null}
                </div>
              </article>
              <article className="rounded border bg-slate-50 p-2 text-sm">
                <h3 className="font-semibold">All Donation Records</h3>
                <div className="mt-2 max-h-80 overflow-auto">
                  {donations.map((d) => (
                    <div key={d.id} className="mb-2 rounded border bg-white p-2">
                      <p><span className="font-semibold">Donor:</span> {d.donor_name}</p>
                      <p><span className="font-semibold">Phone:</span> {d.donor_phone || '-'}</p>
                      <p><span className="font-semibold">Type:</span> {d.item_type === 'other' ? d.custom_item || 'other' : d.item_type || '-'}</p>
                      {d.item_type === 'money' ? (
                        <p><span className="font-semibold">Amount:</span> {Number(d.amount || 0).toFixed(2)}</p>
                      ) : (
                        <p><span className="font-semibold">Quantity:</span> {d.quantity || '-'}</p>
                      )}
                      <p><span className="font-semibold">Status:</span> {donationStatusLabel[d.status] || d.status || 'Submitted'}</p>
                      <p><span className="font-semibold">Incident:</span> {d.incident_ref || '-'}</p>
                      <p><span className="font-semibold">Assigned Employee:</span> {d.assigned_worker_name || '-'}</p>
                      <p><span className="font-semibold">Notes:</span> {d.notes || '-'}</p>
                      {d.item_type !== 'money' && d.status !== 'distributed' ? (
                        <div className="mt-2 space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <select
                              className="rounded border px-2 py-1 text-xs"
                              value={donationWorkerSelection[d.id] || ''}
                              onChange={(e) => setDonationWorkerSelection((p) => ({ ...p, [d.id]: e.target.value }))}
                            >
                              <option value="">Select employee</option>
                              {workerPickupOptions.map((w) => (
                                <option key={`${d.id}-${w.userId}`} value={w.userId}>{w.label}</option>
                              ))}
                            </select>
                            <button
                              className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-700"
                              onClick={() => assignDonationWorker(d.id)}
                              type="button"
                            >
                              Assign Employee
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="rounded border border-amber-300 px-2 py-1 text-xs text-amber-700"
                              onClick={() => markDonationPickedUp(d.id)}
                              type="button"
                              disabled={!['worker_assigned', 'picked_up'].includes(d.status)}
                            >
                              Confirm Pickup
                            </button>
                            <button
                              className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700"
                              onClick={() => markDonationDistributed(d.id)}
                              type="button"
                              disabled={!['picked_up', 'distributed'].includes(d.status)}
                            >
                              Confirm Distribution
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {donations.length === 0 ? <p className="text-slate-500">No donations found.</p> : null}
                </div>
              </article>
            </div>
          </section>
        ) : null}

        {activeTool === 'history' ? (
          <section className="mt-4 rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-blue-900">User History (Completed Work + Activity)</h2>
            <div className="mt-2 max-h-[36rem] space-y-2 overflow-auto text-sm">
              {userHistoryRows.map((row) => (
                <article key={row.id} className="rounded border bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{row.name} ({roleLabel(row.role)})</p>
                    <p className="text-xs text-slate-600">{row.email}</p>
                  </div>
                  <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3 lg:grid-cols-5">
                    <p><span className="font-semibold">Owned Tasks:</span> {row.ownedTotal}</p>
                    <p><span className="font-semibold">Completed (Owned):</span> {row.completedOwned}</p>
                    <p><span className="font-semibold">Assigned Tasks:</span> {row.assignedTotal}</p>
                    <p><span className="font-semibold">Completed (Assigned):</span> {row.completedAssigned}</p>
                    <p><span className="font-semibold">In Progress:</span> {row.inProgressAssigned}</p>
                    <p><span className="font-semibold">Survivor Created:</span> {row.survivorCreated}</p>
                    <p><span className="font-semibold">Survivor Assigned (NGO):</span> {row.survivorAssignedByNgo}</p>
                    <p><span className="font-semibold">Survivor Handled (Employee):</span> {row.survivorHandledByWorker}</p>
                    <p><span className="font-semibold">Donations:</span> {row.donationCount}</p>
                    <p><span className="font-semibold">Missing Reports:</span> {row.missingReportCount}</p>
                  </div>
                  <div className="mt-2 rounded border bg-white p-2">
                    <p className="font-semibold text-slate-800">Recent Activity</p>
                    {row.recentEvents.map((event, idx) => (
                      <div key={`${row.id}-evt-${idx}`} className="mt-1 text-xs text-slate-700">
                        <p>{event.label}</p>
                        <p className="text-slate-500">{formatWhen(event.when)}</p>
                      </div>
                    ))}
                    {row.recentEvents.length === 0 ? <p className="mt-1 text-xs text-slate-500">No activity logged for this user yet.</p> : null}
                  </div>
                </article>
              ))}
              {userHistoryRows.length === 0 ? <p className="text-slate-500">No users found.</p> : null}
            </div>
          </section>
        ) : null}

        {activeTool === 'assign' ? (
          <section className="mt-4 rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-blue-900">Assign Task to NGO / NGO Employee</h2>
            <form onSubmit={createTask} className="mt-2 grid gap-2 text-sm md:grid-cols-2">
              <input
                className="md:col-span-2 rounded border px-3 py-2"
                placeholder="Task title"
                value={taskForm.title}
                onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
                required
              />
              <textarea
                className="md:col-span-2 rounded border px-3 py-2"
                placeholder="Task description"
                value={taskForm.description}
                onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))}
              />
              <select className="rounded border px-3 py-2" value={taskForm.priority} onChange={(e) => setTaskForm((p) => ({ ...p, priority: e.target.value }))}>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="critical">critical</option>
              </select>
              <select
                className="rounded border px-3 py-2"
                value={taskForm.owner_ngo_user_id}
                onChange={(e) => setTaskForm((p) => ({ ...p, owner_ngo_user_id: e.target.value, assigned_worker_id: '' }))}
                required
              >
                <option value="">Select NGO account</option>
                {ngoUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
              <select
                className="md:col-span-2 rounded border px-3 py-2"
                value={taskForm.assigned_worker_id}
                onChange={(e) => setTaskForm((p) => ({ ...p, assigned_worker_id: e.target.value }))}
              >
                <option value="">Assign to NGO only (no employee selected)</option>
                {workersForSelectedNgo.map((w) => (
                  <option key={w.id} value={w.linked_user_id || w.id}>
                    {w.name} - {w.availability_status || 'Unknown'}
                  </option>
                ))}
              </select>
              <button className="md:col-span-2 rounded bg-blue-900 px-4 py-2 text-white">Create Task Assignment</button>
            </form>
          </section>
        ) : null}

        {compGrantModalOpen ? (
          <section className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 p-4 pt-24">
            <article className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-blue-900">Add Compensation Transaction</h3>
                <button
                  onClick={() => setCompGrantModalOpen(false)}
                  className="rounded border px-3 py-1 text-sm"
                >
                  Close
                </button>
              </div>
              <div className="mt-2 rounded border bg-slate-50 p-2 text-sm">
                <p><span className="font-semibold">Survivor:</span> {selectedGrantSurvivor?.name || '-'}</p>
                <p><span className="font-semibold">Email:</span> {selectedGrantSurvivor?.email || '-'}</p>
                <p><span className="font-semibold">User ID:</span> {compGrantForm.survivor_user_id || '-'}</p>
                <p><span className="font-semibold">Transaction Type:</span> grant</p>
              </div>
              <form onSubmit={grantCompensation} className="mt-3 space-y-2 text-sm">
                <input
                  className="w-full rounded border px-3 py-2"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Amount"
                  value={compGrantForm.amount}
                  onChange={(e) => setCompGrantForm((p) => ({ ...p, amount: e.target.value }))}
                  required
                />
                <input
                  className="w-full rounded border px-3 py-2"
                  placeholder="Disaster Ref (optional)"
                  value={compGrantForm.disaster_ref}
                  onChange={(e) => setCompGrantForm((p) => ({ ...p, disaster_ref: e.target.value }))}
                />
                <textarea
                  className="w-full rounded border px-3 py-2"
                  placeholder="Transaction Note (optional)"
                  value={compGrantForm.note}
                  onChange={(e) => setCompGrantForm((p) => ({ ...p, note: e.target.value }))}
                />
                <button className="w-full rounded bg-blue-900 px-4 py-2 text-white">
                  Confirm Amount Transfer
                </button>
              </form>
            </article>
          </section>
        ) : null}

        {compBulkModalOpen ? (
          <section className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 p-4 pt-24">
            <article className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-blue-900">Bulk Compensation Transfer</h3>
                <button
                  onClick={() => !compBulkSubmitting && setCompBulkModalOpen(false)}
                  className="rounded border px-3 py-1 text-sm"
                  disabled={compBulkSubmitting}
                >
                  Close
                </button>
              </div>
              <div className="mt-2 rounded border bg-slate-50 p-2 text-sm">
                <p><span className="font-semibold">Recipients:</span> All survivor accounts ({survivorAccountOptions.length})</p>
                <p><span className="font-semibold">Transaction Type:</span> grant</p>
                <p className="text-xs text-slate-600">This is one admin action that credits every survivor account.</p>
              </div>
              <form onSubmit={grantCompensationToAll} className="mt-3 space-y-2 text-sm">
                <input
                  className="w-full rounded border px-3 py-2"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Amount for each survivor"
                  value={compBulkForm.amount}
                  onChange={(e) => setCompBulkForm((p) => ({ ...p, amount: e.target.value }))}
                  required
                />
                <input
                  className="w-full rounded border px-3 py-2"
                  placeholder="Disaster Ref (optional)"
                  value={compBulkForm.disaster_ref}
                  onChange={(e) => setCompBulkForm((p) => ({ ...p, disaster_ref: e.target.value }))}
                />
                <textarea
                  className="w-full rounded border px-3 py-2"
                  placeholder="Transaction Note (optional)"
                  value={compBulkForm.note}
                  onChange={(e) => setCompBulkForm((p) => ({ ...p, note: e.target.value }))}
                />
                <button
                  className="w-full rounded bg-orange-500 px-4 py-2 text-white disabled:opacity-60"
                  disabled={compBulkSubmitting}
                >
                  {compBulkSubmitting ? 'Processing...' : 'Confirm Pay All'}
                </button>
              </form>
            </article>
          </section>
        ) : null}

        {msg ? (
          <section className="fixed right-4 top-32 z-50 max-w-sm rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-xl">
            {msg}
          </section>
        ) : null}
      </div>
    </main>
  )
}
