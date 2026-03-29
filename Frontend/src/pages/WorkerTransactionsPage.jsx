import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom'
import RoleNav from '../components/RoleNav'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/api'

const allowedTabs = ['overview', 'wallet', 'payments', 'history', 'invoices']

export default function WorkerTransactionsPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const { tab } = useParams()
  const currentTab = allowedTabs.includes(tab) ? tab : 'overview'
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionTaskId, setActionTaskId] = useState('')
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
  const [showWorkerSendSelectionModal, setShowWorkerSendSelectionModal] = useState(false)
  const [showWorkerSendMobileModal, setShowWorkerSendMobileModal] = useState(false)
  const [workerWalletUserSearch, setWorkerWalletUserSearch] = useState('')

  useEffect(() => {
    if (!allowedTabs.includes(tab)) {
      navigate('/worker/transactions/overview', { replace: true })
    }
  }, [tab, navigate])

  const load = async () => {
    setLoading(true)
    try {
      const [walletMeData, walletDirectoryData, walletTxData] = await Promise.all([
        apiRequest('/v1/platform/wallet/me', { token }),
        apiRequest('/v1/platform/wallet/directory', { token }),
        apiRequest('/v1/platform/wallet/transactions', { token }),
      ])
      setWalletMe(walletMeData?.account || null)
      setWalletSharePhone(walletMeData?.share_phone || '')
      setWalletDirectory(walletDirectoryData || [])
      setWalletTransfers(walletTxData || [])
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

  const filteredWorkerWalletUsers = useMemo(() => {
    const queryText = workerWalletUserSearch.trim().toLowerCase()
    if (!queryText) return walletDirectory
    return walletDirectory.filter((entry) => (
      String(entry.name || '').toLowerCase().includes(queryText) ||
      String(entry.role || '').toLowerCase().includes(queryText) ||
      String(entry.email || '').toLowerCase().includes(queryText) ||
      String(entry.phone || '').toLowerCase().includes(queryText)
    ))
  }, [walletDirectory, workerWalletUserSearch])

  const workerWalletInvoices = useMemo(() => {
    return walletTransfers
      .map((tx) => ({
        invoiceNo: `INV-WORK-${String(tx.id || '').slice(0, 8).toUpperCase()}`,
        txType: tx.tx_type || 'transfer',
        status: tx.status || 'completed',
        amount: Number(tx.amount || 0),
        from: tx.from_user_id || '-',
        to: tx.to_user_id || '-',
        note: tx.note || '-',
        date: tx.created_at,
        id: tx.id,
      }))
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
  }, [walletTransfers])

  const formatDate = (raw) => {
    if (!raw) return 'Unknown'
    const dt = new Date(raw)
    if (Number.isNaN(dt.getTime())) return String(raw)
    return dt.toLocaleString()
  }

  const transferBySelection = async (e) => {
    e.preventDefault()
    if (actionTaskId) return
    setActionTaskId('wallet-send-select')
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
      setShowWorkerSendSelectionModal(false)
      setWorkerWalletUserSearch('')
      setWalletTransferForm((p) => ({ ...p, to_user_id: '', amount: '', note: '' }))
      await load()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setActionTaskId('')
    }
  }

  const transferByPhone = async (e) => {
    e.preventDefault()
    if (actionTaskId) return
    setActionTaskId('wallet-send-phone')
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
      setShowWorkerSendMobileModal(false)
      setWalletTransferForm((p) => ({ ...p, phone: '', amount: '', note: '', to_user_id: '' }))
      await load()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setActionTaskId('')
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-0">
      <div className="w-full">
        <RoleNav />
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-blue-900">Website Wallet Transfer</h1>
              <p className="text-sm text-slate-600">Manage wallet summary, payments, history, and invoices.</p>
            </div>
            <div className="flex gap-2">
              <Link to="/worker" className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Back to Employee</Link>
              <button
                onClick={load}
                disabled={loading || Boolean(actionTaskId)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-60"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'wallet', label: 'Website Wallet' },
              { id: 'payments', label: 'Payments' },
              { id: 'history', label: 'History' },
              { id: 'invoices', label: 'Invoices' },
            ].map((item) => (
              <NavLink
                key={item.id}
                to={`/worker/transactions/${item.id}`}
                className={({ isActive }) => `rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-orange-500 text-white' : 'bg-blue-900 text-white'}`}
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          {currentTab === 'overview' ? (
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
              <div className="rounded border bg-blue-50 p-2"><p className="text-blue-700">Wallet Balance</p><p className="text-lg font-bold text-blue-900">{Number(walletMe?.balance || 0).toFixed(2)}</p></div>
              <div className="rounded border bg-emerald-50 p-2"><p className="text-emerald-700">Received</p><p className="text-lg font-bold text-emerald-900">{Number(walletMe?.total_received || 0).toFixed(2)}</p></div>
              <div className="rounded border bg-amber-50 p-2"><p className="text-amber-700">Sent</p><p className="text-lg font-bold text-amber-900">{Number(walletMe?.total_sent || 0).toFixed(2)}</p></div>
              <div className="rounded border bg-indigo-50 p-2"><p className="text-indigo-700">Transactions</p><p className="text-lg font-bold text-indigo-900">{walletTransfers.length}</p></div>
            </div>
          ) : null}

          {currentTab === 'wallet' ? (
            <article className="mt-3 max-w-xl rounded border bg-white p-3">
              <h3 className="font-semibold text-blue-900">My Website Wallet</h3>
              <p className="mt-1"><span className="font-semibold">Balance:</span> {Number(walletMe?.balance || 0).toFixed(2)}</p>
              <p><span className="font-semibold">Total Received:</span> {Number(walletMe?.total_received || 0).toFixed(2)}</p>
              <p><span className="font-semibold">Total Sent:</span> {Number(walletMe?.total_sent || 0).toFixed(2)}</p>
              <p className="mt-2 text-xs text-slate-600">Share your mobile number to receive money.</p>
              <input className="mt-1 w-full rounded border px-2 py-2 text-xs" value={walletSharePhone || '-'} readOnly />
            </article>
          ) : null}

          {currentTab === 'payments' ? (
            <article className="mt-3 rounded border bg-white p-3">
              <h3 className="font-semibold text-blue-900">Send Money To Other Users</h3>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <button
                  onClick={() => { setWorkerWalletUserSearch(''); setShowWorkerSendSelectionModal(true) }}
                  className="rounded-lg bg-blue-900 px-4 py-2 text-white"
                >
                  Open Send By Selection
                </button>
                <button
                  onClick={() => setShowWorkerSendMobileModal(true)}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-white"
                >
                  Open Send By Mobile Number
                </button>
              </div>
            </article>
          ) : null}

          {currentTab === 'history' ? (
            <article className="mt-3 rounded border bg-white p-3">
              <h3 className="font-semibold text-blue-900">Website Wallet Transfer History</h3>
              <div className="mt-2 max-h-56 space-y-2 overflow-auto text-xs">
                {walletTransfers.map((tx) => (
                  <div key={tx.id} className="rounded border bg-slate-50 p-2">
                    <p className="font-semibold">{tx.tx_type} ({tx.status})</p>
                    <p>Amount: {Number(tx.amount || 0).toFixed(2)}</p>
                    <p>From: {tx.from_user_id || '-'}</p>
                    <p>To: {tx.to_user_id || '-'}</p>
                    <p>Note: {tx.note || '-'}</p>
                  </div>
                ))}
                {walletTransfers.length === 0 ? <p className="text-slate-500">No website-wallet transfers yet.</p> : null}
              </div>
            </article>
          ) : null}

          {currentTab === 'invoices' ? (
            <article className="mt-3 rounded border bg-white p-3">
              <h3 className="font-semibold text-blue-900">Transaction Invoices</h3>
              <div className="mt-2 max-h-56 space-y-2 overflow-auto text-xs">
                {workerWalletInvoices.map((row) => (
                  <div key={`inv-${row.id}`} className="rounded border bg-slate-50 p-2">
                    <p><span className="font-semibold">Invoice No:</span> {row.invoiceNo}</p>
                    <p><span className="font-semibold">Date:</span> {formatDate(row.date)}</p>
                    <p><span className="font-semibold">Type:</span> {row.txType}</p>
                    <p><span className="font-semibold">Status:</span> {row.status}</p>
                    <p><span className="font-semibold">Amount:</span> {row.amount.toFixed(2)}</p>
                    <p><span className="font-semibold">From:</span> {row.from}</p>
                    <p><span className="font-semibold">To:</span> {row.to}</p>
                    <p><span className="font-semibold">Note:</span> {row.note}</p>
                  </div>
                ))}
                {workerWalletInvoices.length === 0 ? <p className="text-slate-500">No invoices yet.</p> : null}
              </div>
            </article>
          ) : null}

          {msg ? <p className="mt-3 text-sm text-slate-700">{msg}</p> : null}
        </section>

        {showWorkerSendSelectionModal ? (
          <section className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 p-4 pt-28">
            <article className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-blue-900">Send Money (Select User)</h3>
                <button type="button" onClick={() => setShowWorkerSendSelectionModal(false)} className="rounded border px-3 py-1 text-sm">Close</button>
              </div>
              <form onSubmit={transferBySelection} className="mt-3 space-y-2 text-sm">
                <input
                  className="w-full rounded border px-3 py-2"
                  placeholder="Search user by name/role/email/phone..."
                  value={workerWalletUserSearch}
                  onChange={(e) => setWorkerWalletUserSearch(e.target.value)}
                />
                <p className="text-xs text-slate-600">
                  Users shown: {filteredWorkerWalletUsers.length} / {walletDirectory.length}
                </p>
                <div className="max-h-44 overflow-auto rounded border">
                  {filteredWorkerWalletUsers.map((entry) => (
                    <button
                      key={entry.user_id}
                      type="button"
                      onClick={() => setWalletTransferForm((p) => ({ ...p, to_user_id: entry.user_id }))}
                      className={`w-full border-b px-3 py-2 text-left text-xs hover:bg-slate-50 ${
                        walletTransferForm.to_user_id === entry.user_id ? 'bg-blue-50' : 'bg-white'
                      }`}
                    >
                      {entry.name} ({entry.role}) {entry.email ? `- ${entry.email}` : ''} {entry.phone ? `- ${entry.phone}` : ''}
                    </button>
                  ))}
                  {filteredWorkerWalletUsers.length === 0 ? <p className="px-3 py-2 text-xs text-slate-500">No matching users.</p> : null}
                </div>
                <p className="text-xs text-slate-700">
                  Selected User ID: {walletTransferForm.to_user_id || 'None'}
                </p>
                <input type="hidden" value={walletTransferForm.to_user_id} required readOnly />
                <input className="w-full rounded border px-3 py-2" type="number" min="1" step="0.01" placeholder="Amount" value={walletTransferForm.amount} onChange={(e) => setWalletTransferForm((p) => ({ ...p, amount: e.target.value }))} required />
                <textarea className="w-full rounded border px-3 py-2" placeholder="Note (optional)" value={walletTransferForm.note} onChange={(e) => setWalletTransferForm((p) => ({ ...p, note: e.target.value }))} />
                <button disabled={Boolean(actionTaskId)} className="w-full rounded-lg bg-blue-900 px-4 py-2 text-white disabled:opacity-60">{actionTaskId ? 'Please wait...' : 'Send By Selection'}</button>
              </form>
            </article>
          </section>
        ) : null}

        {showWorkerSendMobileModal ? (
          <section className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 p-4 pt-28">
            <article className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-blue-900">Send By Mobile Number</h3>
                <button type="button" onClick={() => setShowWorkerSendMobileModal(false)} className="rounded border px-3 py-1 text-sm">Close</button>
              </div>
              <form onSubmit={transferByPhone} className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                <input className="rounded border px-3 py-2 md:col-span-2" placeholder="Enter receiver mobile number" value={walletTransferForm.phone} onChange={(e) => setWalletTransferForm((p) => ({ ...p, phone: e.target.value }))} required />
                <input className="rounded border px-3 py-2" type="number" min="1" step="0.01" placeholder="Amount" value={walletTransferForm.amount} onChange={(e) => setWalletTransferForm((p) => ({ ...p, amount: e.target.value }))} required />
                <textarea className="rounded border px-3 py-2 md:col-span-3" placeholder="Note (optional)" value={walletTransferForm.note} onChange={(e) => setWalletTransferForm((p) => ({ ...p, note: e.target.value }))} />
                <button disabled={Boolean(actionTaskId)} className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-white disabled:opacity-60 md:col-span-3">{actionTaskId ? 'Please wait...' : 'Send By Mobile Number'}</button>
              </form>
            </article>
          </section>
        ) : null}
      </div>
    </main>
  )
}
