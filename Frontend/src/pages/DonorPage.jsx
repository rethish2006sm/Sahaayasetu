import { useEffect, useState } from 'react'
import RoleNav from '../components/RoleNav'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/api'

const donationTypes = [
  { value: 'clothes', label: 'Clothes' },
  { value: 'food', label: 'Food' },
  { value: 'shelter', label: 'Shelter' },
  { value: 'money', label: 'Money' },
  { value: 'medicines', label: 'Medicines' },
  { value: 'other', label: 'Other (You describe)' },
]

const statusStyles = {
  submitted: 'bg-slate-100 text-slate-700',
  worker_assigned: 'bg-blue-100 text-blue-800',
  picked_up: 'bg-amber-100 text-amber-800',
  distributed: 'bg-emerald-100 text-emerald-800',
  money_transferred: 'bg-emerald-100 text-emerald-800',
}

const statusLabel = {
  submitted: 'Submitted',
  worker_assigned: 'Employee Assigned',
  picked_up: 'Picked Up',
  distributed: 'Distributed',
  money_transferred: 'Credited to Admin',
}

export default function DonorPage() {
  const { token } = useAuth()
  const [form, setForm] = useState({
    donor_name: '',
    donor_phone: '',
    item_type: 'clothes',
    quantity: 1,
    amount: '',
    incident_ref: '',
    custom_item: '',
    notes: '',
  })
  const [donations, setDonations] = useState([])
  const [tasks, setTasks] = useState([])
  const [msg, setMsg] = useState('')

  const load = async () => {
    const [d, t] = await Promise.all([
      apiRequest('/v1/platform/donations', { token }),
      apiRequest('/v1/platform/tasks', { token }),
    ])
    setDonations(d)
    setTasks(t)
  }

  useEffect(() => { load().catch((e) => setMsg(e.message)) }, [])

  const submit = async (e) => {
    e.preventDefault()
    try {
      const isMoney = form.item_type === 'money'
      await apiRequest('/v1/platform/donations', {
        method: 'POST',
        token,
        body: {
          donor_name: form.donor_name,
          donor_phone: form.donor_phone || null,
          item_type: form.item_type,
          custom_item: form.item_type === 'other' ? form.custom_item || null : null,
          quantity: Number(form.quantity),
          amount: isMoney ? Number(form.amount) : null,
          incident_ref: form.incident_ref || null,
          notes: form.notes || null,
        },
      })
      setForm({
        donor_name: '',
        donor_phone: '',
        item_type: 'clothes',
        quantity: 1,
        amount: '',
        incident_ref: '',
        custom_item: '',
        notes: '',
      })
      setMsg(isMoney ? 'Donation credited to admin wallet.' : 'Donation submitted for verification and pickup.')
      await load()
    } catch (err) { setMsg(err.message) }
  }

  const highPriorityTasks = tasks.filter((t) => ['high', 'critical'].includes(String(t.priority || '').toLowerCase()))

  return (
    <main className="min-h-screen bg-slate-100 p-0">
      <div className="w-full">
        <RoleNav />
        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border bg-white p-4 md:col-span-2">
            <h1 className="text-2xl font-black text-blue-900">Donor Desk</h1>
            <p className="mt-1 text-sm text-slate-600">Money donations are instantly credited to admin balance. Item donations are verified, assigned to an employee, then distributed.</p>
            <form onSubmit={submit} className="mt-4 space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <input className="w-full rounded border px-3 py-2" placeholder="Donor Name" value={form.donor_name} onChange={(e) => setForm((p) => ({ ...p, donor_name: e.target.value }))} required />
                <input className="w-full rounded border px-3 py-2" placeholder="Phone Number" value={form.donor_phone} onChange={(e) => setForm((p) => ({ ...p, donor_phone: e.target.value }))} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <select className="w-full rounded border px-3 py-2" value={form.item_type} onChange={(e) => setForm((p) => ({ ...p, item_type: e.target.value }))}>
                  {donationTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
                <select className="w-full rounded border px-3 py-2" value={form.incident_ref} onChange={(e) => setForm((p) => ({ ...p, incident_ref: e.target.value }))}>
                  <option value="">Select Incident / Task (optional)</option>
                  {highPriorityTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.priority})
                    </option>
                  ))}
                </select>
              </div>
              {form.item_type === 'other' ? (
                <input className="w-full rounded border px-3 py-2" placeholder="Describe item type" value={form.custom_item} onChange={(e) => setForm((p) => ({ ...p, custom_item: e.target.value }))} required />
              ) : null}
              <div className="grid gap-3 md:grid-cols-2">
                {form.item_type === 'money' ? (
                  <input className="w-full rounded border px-3 py-2" type="number" min="1" step="0.01" placeholder="Amount (INR)" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} required />
                ) : (
                  <input className="w-full rounded border px-3 py-2" type="number" min="1" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} required />
                )}
                <textarea className="w-full rounded border px-3 py-2" placeholder="Notes / pickup details" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
              </div>
              <button className="w-full rounded bg-blue-900 px-3 py-2 text-white">Submit Donation</button>
            </form>
            {msg ? <p className="mt-2 text-sm text-slate-700">{msg}</p> : null}
          </article>

          <article className="rounded-xl border bg-white p-4">
            <h2 className="text-lg font-bold text-blue-900">High Priority Needs</h2>
            <div className="mt-2 max-h-48 space-y-2 overflow-auto text-sm">
              {highPriorityTasks.map((t) => (
                <div key={t.id} className="rounded border bg-slate-50 p-2">
                  <p className="font-semibold">{t.title}</p>
                  <p className="text-xs text-slate-600">Priority: {t.priority}</p>
                </div>
              ))}
              {highPriorityTasks.length === 0 ? <p className="text-slate-500">No high priority needs right now.</p> : null}
            </div>
            <h2 className="mt-4 text-lg font-bold text-blue-900">Recent Donations</h2>
            <div className="mt-2 max-h-72 space-y-2 overflow-auto text-sm">
              {donations.map((d) => (
                <div key={d.id} className="rounded border bg-slate-50 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{d.donor_name}</p>
                    <span className={`rounded-full px-2 py-1 text-xs ${statusStyles[d.status] || 'bg-slate-100 text-slate-700'}`}>
                      {statusLabel[d.status] || d.status || 'Submitted'}
                    </span>
                  </div>
                  <p className="mt-1">
                    Type: {d.item_type === 'other' ? d.custom_item || 'other' : d.item_type}
                    {d.item_type === 'money' ? ` | INR ${Number(d.amount || 0).toFixed(2)}` : ` | Qty ${d.quantity || 1}`}
                  </p>
                  <p className="text-xs text-slate-600">Incident: {d.incident_ref || '-'}</p>
                  {d.assigned_worker_name ? <p className="text-xs text-slate-600">Assigned Employee: {d.assigned_worker_name}</p> : null}
                </div>
              ))}
              {donations.length === 0 ? <p className="text-slate-500">No donations yet.</p> : null}
            </div>
          </article>
        </section>
      </div>
    </main>
  )
}
