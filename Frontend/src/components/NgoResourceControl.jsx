import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../lib/api'

const resourceSections = [
  {
    id: 'food-supply',
    label: 'Food Supply',
    intro: 'NGO can enter how much food is available.',
    quantityLabel: 'Food Quantity',
    unitPlaceholder: 'packs / kg / meals',
    titlePlaceholder: 'Food item name',
  },
  {
    id: 'medical-aid',
    label: 'Medical Aid',
    intro: 'NGO can enter how much medical aid is available.',
    quantityLabel: 'Medical Aid Quantity',
    unitPlaceholder: 'kits / medicines / beds',
    titlePlaceholder: 'Medical aid name',
  },
  {
    id: 'emergency-services',
    label: 'Emergency Services',
    intro: 'NGO can enter emergency support available for survivors.',
    quantityLabel: 'Emergency Support Count',
    unitPlaceholder: 'teams / vehicles / rescue units',
    titlePlaceholder: 'Emergency support name',
  },
]

const shelterInitial = {
  name: '',
  location_text: '',
  shelter_type: '',
  capacity: 0,
  occupancy: 0,
  contact_phone: '',
}

function emptyResourceForm(section, user) {
  return {
    title: '',
    quantity: '',
    unit: section?.unitPlaceholder || 'units',
    location_text: '',
    notes: '',
    ngo_name: user?.name || '',
  }
}

function safeNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function prettyStatus(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function statusTone(value) {
  if (value === 'critical' || value === 'full') return 'bg-red-100 text-red-700'
  if (value === 'low' || value === 'nearly_full') return 'bg-amber-100 text-amber-700'
  return 'bg-emerald-100 text-emerald-700'
}

export default function NgoResourceControl({ token, user, onToast }) {
  const [tab, setTab] = useState('food-supply')
  const [resources, setResources] = useState({})
  const [shelters, setShelters] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState('')
  const [editingId, setEditingId] = useState('')
  const [editingShelterId, setEditingShelterId] = useState('')
  const currentSection = useMemo(() => resourceSections.find((item) => item.id === tab) || resourceSections[0], [tab])
  const [resourceForm, setResourceForm] = useState(emptyResourceForm(resourceSections[0], user))
  const [shelterForm, setShelterForm] = useState(shelterInitial)

  const totalFood = useMemo(() => (resources['food-supply'] || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0), [resources])
  const totalMedical = useMemo(() => (resources['medical-aid'] || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0), [resources])
  const totalEmergency = useMemo(() => (resources['emergency-services'] || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0), [resources])
  const totalShelterCapacity = useMemo(() => shelters.reduce((sum, item) => sum + Number(item.capacity || 0), 0), [shelters])
  const totalShelterOccupancy = useMemo(() => shelters.reduce((sum, item) => sum + Number(item.occupancy || 0), 0), [shelters])

  const loadData = async () => {
    if (!token) return
    setLoading(true)
    try {
      const [food, medical, emergency, shelterData] = await Promise.all([
        apiRequest('/v1/platform/ngo-resources/food-supply', { token }),
        apiRequest('/v1/platform/ngo-resources/medical-aid', { token }),
        apiRequest('/v1/platform/ngo-resources/emergency-services', { token }),
        apiRequest('/v1/platform/shelters', { token }),
      ])
      setResources({
        'food-supply': food || [],
        'medical-aid': medical || [],
        'emergency-services': emergency || [],
      })
      setShelters(shelterData || [])
    } catch (error) {
      onToast?.(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token])

  useEffect(() => {
    setEditingId('')
    setResourceForm(emptyResourceForm(currentSection, user))
  }, [currentSection, user])

  const saveResource = async (event) => {
    event.preventDefault()
    setActionLoading(editingId ? 'Updating...' : 'Saving...')
    try {
      const payload = {
        title: resourceForm.title,
        quantity: safeNumber(resourceForm.quantity),
        unit: resourceForm.unit,
        location_text: resourceForm.location_text,
        notes: resourceForm.notes,
        ngo_name: user?.name || resourceForm.ngo_name,
        auto_assign_volunteer: false,
      }
      if (editingId) {
        await apiRequest(`/v1/platform/ngo-resources/${tab}/${editingId}`, {
          method: 'PATCH',
          token,
          body: payload,
        })
        onToast?.('Updated successfully.')
      } else {
        await apiRequest(`/v1/platform/ngo-resources/${tab}`, {
          method: 'POST',
          token,
          body: payload,
        })
        onToast?.('Saved successfully.')
      }
      setEditingId('')
      setResourceForm(emptyResourceForm(currentSection, user))
      await loadData()
    } catch (error) {
      onToast?.(error.message)
    } finally {
      setActionLoading('')
    }
  }

  const editResource = (item) => {
    setEditingId(item.id)
    setResourceForm({
      title: item.title || '',
      quantity: item.quantity ?? '',
      unit: item.unit || currentSection.unitPlaceholder,
      location_text: item.location_text || '',
      notes: item.notes || '',
      ngo_name: item.ngo_name || user?.name || '',
    })
  }

  const deleteResource = async (item) => {
    setActionLoading('Deleting...')
    try {
      await apiRequest(`/v1/platform/ngo-resources/${tab}/${item.id}`, {
        method: 'DELETE',
        token,
      })
      onToast?.('Deleted successfully.')
      setEditingId('')
      setResourceForm(emptyResourceForm(currentSection, user))
      await loadData()
    } catch (error) {
      onToast?.(error.message)
    } finally {
      setActionLoading('')
    }
  }

  const saveShelter = async (event) => {
    event.preventDefault()
    setActionLoading(editingShelterId ? 'Updating shelter...' : 'Saving shelter...')
    try {
      const payload = {
        ...shelterForm,
        capacity: safeNumber(shelterForm.capacity),
        occupancy: safeNumber(shelterForm.occupancy),
      }
      if (editingShelterId) {
        await apiRequest(`/v1/platform/shelters/${editingShelterId}`, {
          method: 'PATCH',
          token,
          body: payload,
        })
        onToast?.('Shelter updated.')
      } else {
        await apiRequest('/v1/platform/shelters', {
          method: 'POST',
          token,
          body: payload,
        })
        onToast?.('Shelter saved.')
      }
      setEditingShelterId('')
      setShelterForm(shelterInitial)
      await loadData()
    } catch (error) {
      onToast?.(error.message)
    } finally {
      setActionLoading('')
    }
  }

  const editShelter = (item) => {
    setEditingShelterId(item.id)
    setShelterForm({
      name: item.name || '',
      location_text: item.location_text || '',
      shelter_type: item.shelter_type || '',
      capacity: item.capacity ?? 0,
      occupancy: item.occupancy ?? 0,
      contact_phone: item.contact_phone || '',
    })
  }

  const deleteShelter = async (item) => {
    setActionLoading('Deleting shelter...')
    try {
      await apiRequest(`/v1/platform/shelters/${item.id}`, {
        method: 'DELETE',
        token,
      })
      onToast?.('Shelter deleted.')
      setEditingShelterId('')
      setShelterForm(shelterInitial)
      await loadData()
    } catch (error) {
      onToast?.(error.message)
    } finally {
      setActionLoading('')
    }
  }

  const updateShelterOccupancy = async (item, delta) => {
    setActionLoading('Updating shelter...')
    try {
      await apiRequest(`/v1/platform/shelters/${item.id}/occupancy`, {
        method: 'PATCH',
        token,
        body: { occupied_delta: delta },
      })
      onToast?.('Shelter occupancy updated.')
      await loadData()
    } catch (error) {
      onToast?.(error.message)
    } finally {
      setActionLoading('')
    }
  }

  return (
    <section className="mt-4 rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap gap-3">
        <SummaryCard label="Food Available" value={totalFood} helper="Total food entered by NGOs" />
        <SummaryCard label="Medical Aid" value={totalMedical} helper="Total medical aid entered" />
        <SummaryCard label="Emergency Support" value={totalEmergency} helper="Emergency service count" />
        <SummaryCard label="Shelter Capacity" value={totalShelterCapacity} helper={`${totalShelterOccupancy} currently occupied`} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {resourceSections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setTab(section.id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === section.id ? 'bg-blue-900 text-white' : 'border bg-white text-slate-700'}`}
          >
            {section.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setTab('shelter-management')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'shelter-management' ? 'bg-blue-900 text-white' : 'border bg-white text-slate-700'}`}
        >
          Shelter Management
        </button>
      </div>

      {tab === 'shelter-management' ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="rounded-xl border p-4">
            <h3 className="text-lg font-bold text-blue-900">{editingShelterId ? 'Edit Shelter' : 'Add Shelter'}</h3>
            <p className="mt-1 text-sm text-slate-600">NGO should enter shelter name and shelter capacity.</p>
            <form onSubmit={saveShelter} className="mt-3 space-y-3 text-sm">
              <input className="w-full rounded-lg border px-3 py-2" placeholder="Shelter name" value={shelterForm.name} onChange={(event) => setShelterForm((prev) => ({ ...prev, name: event.target.value }))} required />
              <input className="w-full rounded-lg border px-3 py-2" placeholder="Location" value={shelterForm.location_text} onChange={(event) => setShelterForm((prev) => ({ ...prev, location_text: event.target.value }))} required />
              <input className="w-full rounded-lg border px-3 py-2" placeholder="Shelter type" value={shelterForm.shelter_type} onChange={(event) => setShelterForm((prev) => ({ ...prev, shelter_type: event.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <input className="rounded-lg border px-3 py-2" type="number" min="0" placeholder="Capacity" value={shelterForm.capacity} onChange={(event) => setShelterForm((prev) => ({ ...prev, capacity: event.target.value }))} required />
                <input className="rounded-lg border px-3 py-2" type="number" min="0" placeholder="Occupied" value={shelterForm.occupancy} onChange={(event) => setShelterForm((prev) => ({ ...prev, occupancy: event.target.value }))} required />
              </div>
              <input className="w-full rounded-lg border px-3 py-2" placeholder="Contact phone" value={shelterForm.contact_phone} onChange={(event) => setShelterForm((prev) => ({ ...prev, contact_phone: event.target.value }))} />
              <button disabled={Boolean(actionLoading)} className="w-full rounded-lg bg-blue-900 px-4 py-2 text-white disabled:opacity-60">
                {actionLoading || (editingShelterId ? 'Update Shelter' : 'Save Shelter')}
              </button>
            </form>
          </article>

          <article className="rounded-xl border p-4">
            <h3 className="text-lg font-bold text-blue-900">Shelter List</h3>
            <div className="mt-3 space-y-3">
              {shelters.map((item) => (
                <div key={item.id} className="rounded-xl border bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="text-sm text-slate-600">{item.location_text || 'No location'}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone(item.shelter_status)}`}>
                      {prettyStatus(item.shelter_status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">Capacity: {item.capacity} | Occupied: {item.occupancy} | Beds Left: {item.available_beds}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => updateShelterOccupancy(item, 1)} className="rounded border px-3 py-1 text-xs">+1</button>
                    <button type="button" onClick={() => updateShelterOccupancy(item, -1)} className="rounded border px-3 py-1 text-xs">-1</button>
                    <button type="button" onClick={() => editShelter(item)} className="rounded border px-3 py-1 text-xs">Edit</button>
                    <button type="button" onClick={() => deleteShelter(item)} className="rounded border border-red-300 px-3 py-1 text-xs text-red-700">Delete</button>
                  </div>
                </div>
              ))}
              {shelters.length === 0 ? <p className="text-sm text-slate-500">No shelters added yet.</p> : null}
            </div>
          </article>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="rounded-xl border p-4">
            <h3 className="text-lg font-bold text-blue-900">{editingId ? `Edit ${currentSection.label}` : `Add ${currentSection.label}`}</h3>
            <p className="mt-1 text-sm text-slate-600">{currentSection.intro}</p>
            <form onSubmit={saveResource} className="mt-3 space-y-3 text-sm">
              <input className="w-full rounded-lg border px-3 py-2" placeholder={currentSection.titlePlaceholder} value={resourceForm.title} onChange={(event) => setResourceForm((prev) => ({ ...prev, title: event.target.value }))} required />
              <div className="grid grid-cols-2 gap-3">
                <input className="rounded-lg border px-3 py-2" type="number" min="0" placeholder={currentSection.quantityLabel} value={resourceForm.quantity} onChange={(event) => setResourceForm((prev) => ({ ...prev, quantity: event.target.value }))} required />
                <input className="rounded-lg border px-3 py-2" placeholder={currentSection.unitPlaceholder} value={resourceForm.unit} onChange={(event) => setResourceForm((prev) => ({ ...prev, unit: event.target.value }))} required />
              </div>
              <input className="w-full rounded-lg border px-3 py-2" placeholder="Location" value={resourceForm.location_text} onChange={(event) => setResourceForm((prev) => ({ ...prev, location_text: event.target.value }))} />
              <textarea className="w-full rounded-lg border px-3 py-2" rows="3" placeholder="Notes" value={resourceForm.notes} onChange={(event) => setResourceForm((prev) => ({ ...prev, notes: event.target.value }))} />
              <button disabled={Boolean(actionLoading)} className="w-full rounded-lg bg-blue-900 px-4 py-2 text-white disabled:opacity-60">
                {actionLoading || (editingId ? 'Update' : 'Save')}
              </button>
            </form>
          </article>

          <article className="rounded-xl border p-4">
            <h3 className="text-lg font-bold text-blue-900">{currentSection.label} List</h3>
            <div className="mt-3 space-y-3">
              {(resources[tab] || []).map((item) => (
                <div key={item.id} className="rounded-xl border bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="text-sm text-slate-600">{item.location_text || 'No location'}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone(item.status)}`}>
                      {prettyStatus(item.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{item.quantity} {item.unit}</p>
                  {item.notes ? <p className="mt-1 text-sm text-slate-600">{item.notes}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => editResource(item)} className="rounded border px-3 py-1 text-xs">Edit</button>
                    <button type="button" onClick={() => deleteResource(item)} className="rounded border border-red-300 px-3 py-1 text-xs text-red-700">Delete</button>
                  </div>
                </div>
              ))}
              {(resources[tab] || []).length === 0 ? <p className="text-sm text-slate-500">No entries added yet.</p> : null}
            </div>
          </article>
        </div>
      )}

      {loading ? <p className="mt-4 text-xs text-slate-500">Loading NGO data...</p> : null}
    </section>
  )
}

function SummaryCard({ label, value, helper }) {
  return (
    <article className="min-w-[180px] rounded-xl border bg-slate-50 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-blue-900">{value ?? 0}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </article>
  )
}
