import { getDb } from '../db/mongo.js'
import { makeId } from './data.js'
import { nowIso, toNumber } from '../utils/common.js'

export const NGO_RESOURCE_CATEGORIES = [
  {
    id: 'food-supply',
    label: 'Food Supply',
    collection: 'ngo_food_supply_resources',
    defaultUnit: 'packs',
    keywords: ['food', 'meal', 'ration', 'nutrition'],
    fields: ['meal_type', 'dietary_support', 'expiry_date', 'storage_condition'],
  },
  {
    id: 'medical-aid',
    label: 'Medical Aid',
    collection: 'ngo_medical_aid_resources',
    defaultUnit: 'kits',
    keywords: ['medical', 'health', 'doctor', 'nurse', 'medicine'],
    fields: ['aid_type', 'expiry_date', 'cold_chain_required', 'requires_prescription'],
  },
  {
    id: 'emergency-services',
    label: 'Emergency Services',
    collection: 'ngo_emergency_service_resources',
    defaultUnit: 'teams',
    keywords: ['emergency', 'rescue', 'response', 'ambulance', 'fire'],
    fields: ['service_mode', 'response_time_minutes', 'contact_phone', 'readiness_score'],
  },
  {
    id: 'clothing-essentials',
    label: 'Clothing / Essentials',
    collection: 'ngo_clothing_essentials_resources',
    defaultUnit: 'kits',
    keywords: ['clothing', 'blanket', 'essentials', 'hygiene', 'wear'],
    fields: ['kit_type', 'size_range', 'gender_support', 'seasonal_support'],
  },
  {
    id: 'water-sanitation',
    label: 'Water & Sanitation',
    collection: 'ngo_water_sanitation_resources',
    defaultUnit: 'kits',
    keywords: ['water', 'sanitation', 'hygiene', 'purifier', 'toilet'],
    fields: ['kit_type', 'purifier_units', 'water_quality_status', 'service_radius_km'],
  },
]

const CATEGORY_BY_ID = new Map(NGO_RESOURCE_CATEGORIES.map((category) => [category.id, category]))

export function listNgoResourceCategories() {
  return NGO_RESOURCE_CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    default_unit: category.defaultUnit,
    fields: category.fields,
  }))
}

export function getNgoResourceCategory(categoryId) {
  return CATEGORY_BY_ID.get(String(categoryId || '').trim())
}

export function normalizePriority(value) {
  const raw = String(value || 'normal').trim().toLowerCase()
  if (['urgent', 'critical', 'high'].includes(raw)) return 'urgent'
  if (['low', 'minor'].includes(raw)) return 'low'
  return 'normal'
}

export function computeResourceStatus(resource) {
  const quantity = Math.max(toNumber(resource.quantity, 0), 0)
  const threshold = Math.max(toNumber(resource.min_threshold ?? resource.estimated_need, 0), 0)

  if (quantity <= 0) return 'critical'
  if (threshold > 0 && quantity <= threshold * 0.35) return 'critical'
  if (threshold > 0 && quantity <= threshold) return 'low'
  if (quantity <= 5) return 'low'
  return 'available'
}

export function decorateResource(category, resource) {
  const quantity = Math.max(toNumber(resource.quantity, 0), 0)
  const minThreshold = Math.max(toNumber(resource.min_threshold ?? resource.estimated_need, 0), 0)
  const status = computeResourceStatus({ ...resource, quantity, min_threshold: minThreshold })

  return {
    ...resource,
    category: category.id,
    category_label: category.label,
    quantity,
    min_threshold: minThreshold,
    unit: resource.unit || category.defaultUnit,
    priority: normalizePriority(resource.priority),
    status,
    location_text: resource.location_text || resource.location || 'Unknown location',
    low_stock_alert: status === 'low' || status === 'critical',
  }
}

export function computeShelterStatus(shelter) {
  const capacity = Math.max(toNumber(shelter.capacity, 0), 0)
  const occupancy = Math.min(Math.max(toNumber(shelter.occupancy ?? shelter.occupied, 0), 0), capacity)

  if (capacity === 0) {
    return {
      capacity,
      occupancy,
      available_beds: 0,
      occupancy_ratio: 1,
      shelter_status: 'full',
    }
  }

  const availableBeds = Math.max(capacity - occupancy, 0)
  const occupancyRatio = occupancy / capacity
  let shelterStatus = 'available'
  if (occupancy >= capacity) shelterStatus = 'full'
  else if (occupancyRatio >= 0.85) shelterStatus = 'nearly_full'

  return {
    capacity,
    occupancy,
    available_beds: availableBeds,
    occupancy_ratio: Number(occupancyRatio.toFixed(2)),
    shelter_status: shelterStatus,
  }
}

function normalizeBaseResourceDoc(category, body, existingDoc, user) {
  const quantity = Math.max(toNumber(body.quantity ?? existingDoc?.quantity, 0), 0)
  const minThreshold = Math.max(toNumber(body.min_threshold ?? body.estimated_need ?? existingDoc?.min_threshold ?? existingDoc?.estimated_need, 0), 0)
  const priority = normalizePriority(body.priority ?? existingDoc?.priority)
  const doc = {
    id: existingDoc?.id || makeId(),
    category: category.id,
    category_label: category.label,
    title: String(body.title || existingDoc?.title || `${category.label} Item`).trim(),
    subtype: String(body.subtype || existingDoc?.subtype || '').trim() || null,
    quantity,
    min_threshold: minThreshold,
    unit: String(body.unit || existingDoc?.unit || category.defaultUnit).trim() || category.defaultUnit,
    priority,
    location_text: String(body.location_text || body.location || existingDoc?.location_text || existingDoc?.location || '').trim() || null,
    lat: body.lat ?? existingDoc?.lat ?? null,
    lon: body.lon ?? existingDoc?.lon ?? null,
    ngo_owner_user_id: body.ngo_owner_user_id || existingDoc?.ngo_owner_user_id || user?.id || null,
    ngo_name: body.ngo_name || existingDoc?.ngo_name || user?.name || null,
    notes: String(body.notes || existingDoc?.notes || '').trim() || null,
    assigned_volunteer_user_id: body.assigned_volunteer_user_id ?? existingDoc?.assigned_volunteer_user_id ?? null,
    assigned_volunteer_profile_id: body.assigned_volunteer_profile_id ?? existingDoc?.assigned_volunteer_profile_id ?? null,
    assigned_volunteer_name: body.assigned_volunteer_name ?? existingDoc?.assigned_volunteer_name ?? null,
    auto_assignment_reason: body.auto_assignment_reason ?? existingDoc?.auto_assignment_reason ?? null,
    created_at: existingDoc?.created_at || nowIso(),
    created_by_user_id: existingDoc?.created_by_user_id || user?.id || null,
    updated_at: nowIso(),
    updated_by_user_id: user?.id || null,
  }

  for (const field of category.fields) {
    doc[field] = body[field] ?? existingDoc?.[field] ?? null
  }

  doc.status = computeResourceStatus(doc)
  return doc
}

async function selectVolunteerForResource(db, category, resource) {
  const workers = await db.collection('workers').find({}, { projection: { _id: 0 } }).toArray()
  const locationText = String(resource.location_text || '').toLowerCase()
  const searchable = [resource.title, resource.subtype, resource.notes, category.label]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const ranked = workers
    .map((worker) => {
      const availability = String(worker.availability_status || '').toLowerCase()
      const skills = Array.isArray(worker.skills) ? worker.skills.join(' ').toLowerCase() : ''
      const coverage = String(worker.coverage_area || '').toLowerCase()
      let score = 0
      if (!availability || availability === 'available') score += 50
      if (availability === 'on-task') score -= 20
      if (locationText && coverage && locationText.includes(coverage)) score += 15
      if (coverage && locationText && coverage.includes(locationText)) score += 15
      if (category.keywords.some((keyword) => skills.includes(keyword))) score += 25
      if (category.keywords.some((keyword) => searchable.includes(keyword))) score += 5
      if (resource.priority === 'urgent') score += 10
      return { worker, score }
    })
    .sort((left, right) => right.score - left.score)

  if (!ranked.length) return null
  const best = ranked[0]
  if (best.score < 25) return null
  return best.worker
}

async function syncResourceAlert(db, category, resource) {
  const alertKey = `ngo-resource:${category.id}:${resource.id}`
  const shouldAlert = resource.status === 'low' || resource.status === 'critical'

  if (!shouldAlert) {
    await db.collection('alerts').deleteMany({ alert_key: alertKey })
    return null
  }

  const severity = resource.status === 'critical' ? 'critical' : 'high'
  const existing = await db.collection('alerts').findOne({ alert_key: alertKey }, { projection: { _id: 0 } })
  const alertDoc = {
    id: existing?.id || makeId(),
    alert_key: alertKey,
    title: `${category.label} ${resource.status === 'critical' ? 'critical' : 'running low'}`,
    message: `${resource.title} at ${resource.location_text || 'unknown location'} is ${resource.status}. ${resource.quantity} ${resource.unit} remaining.`,
    severity,
    channel: 'web',
    target_location: resource.location_text || null,
    auto_generated: true,
    resource_ref: {
      category: category.id,
      resource_id: resource.id,
    },
    created_by_user_id: resource.updated_by_user_id || resource.created_by_user_id || null,
    created_at: existing?.created_at || nowIso(),
    updated_at: nowIso(),
  }

  await db.collection('alerts').updateOne(
    { alert_key: alertKey },
    { $set: alertDoc },
    { upsert: true },
  )

  return alertDoc.id
}

export async function writeNgoOperationLog({
  db = getDb(),
  action,
  entity_type,
  entity_id,
  title,
  user,
  details = {},
}) {
  await db.collection('ngo_operation_logs').insertOne({
    id: makeId(),
    action,
    entity_type,
    entity_id,
    title,
    actor_user_id: user?.id || null,
    actor_name: user?.name || null,
    actor_role: user?.role || null,
    details,
    created_at: nowIso(),
  })
}

export async function listRecentNgoOperationLogs(limit = 25) {
  const db = getDb()
  return db.collection('ngo_operation_logs').find({}, { projection: { _id: 0 } }).sort({ created_at: -1 }).limit(limit).toArray()
}

export async function listNgoResources(categoryId, query = {}) {
  const db = getDb()
  const category = getNgoResourceCategory(categoryId)
  if (!category) throw new Error('Unknown resource category')

  const docs = await db.collection(category.collection).find({}, { projection: { _id: 0 } }).sort({ updated_at: -1, created_at: -1 }).toArray()
  const search = String(query.q || '').trim().toLowerCase()
  const statusFilter = String(query.status || 'all').trim().toLowerCase()
  const priorityFilter = String(query.priority || 'all').trim().toLowerCase()
  const locationFilter = String(query.location || '').trim().toLowerCase()

  return docs
    .map((doc) => decorateResource(category, doc))
    .filter((doc) => {
      const matchesSearch = !search || [doc.title, doc.subtype, doc.notes, doc.location_text]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search)
      const matchesStatus = statusFilter === 'all' || doc.status === statusFilter
      const matchesPriority = priorityFilter === 'all' || doc.priority === priorityFilter
      const matchesLocation = !locationFilter || String(doc.location_text || '').toLowerCase().includes(locationFilter)
      return matchesSearch && matchesStatus && matchesPriority && matchesLocation
    })
}

export async function createNgoResource(categoryId, body, user) {
  const db = getDb()
  const category = getNgoResourceCategory(categoryId)
  if (!category) throw new Error('Unknown resource category')

  const doc = normalizeBaseResourceDoc(category, body, null, user)
  if (!doc.assigned_volunteer_user_id && body.auto_assign_volunteer === true) {
    const worker = await selectVolunteerForResource(db, category, doc)
    if (worker) {
      doc.assigned_volunteer_user_id = worker.linked_user_id || null
      doc.assigned_volunteer_profile_id = worker.id || null
      doc.assigned_volunteer_name = worker.name || null
      doc.auto_assignment_reason = 'Matched by availability, skills, and location proximity.'
    }
  }

  doc.linked_alert_id = await syncResourceAlert(db, category, doc)
  await db.collection(category.collection).insertOne(doc)
  await writeNgoOperationLog({
    db,
    action: 'resource_created',
    entity_type: category.id,
    entity_id: doc.id,
    title: doc.title,
    user,
    details: { status: doc.status, priority: doc.priority, location_text: doc.location_text },
  })

  return doc
}

export async function updateNgoResource(categoryId, resourceId, body, user) {
  const db = getDb()
  const category = getNgoResourceCategory(categoryId)
  if (!category) throw new Error('Unknown resource category')

  const existing = await db.collection(category.collection).findOne({ id: resourceId }, { projection: { _id: 0 } })
  if (!existing) throw new Error('Resource not found')

  const doc = normalizeBaseResourceDoc(category, body, existing, user)

  if (!doc.assigned_volunteer_user_id && body.auto_assign_volunteer === true) {
    const worker = await selectVolunteerForResource(db, category, doc)
    if (worker) {
      doc.assigned_volunteer_user_id = worker.linked_user_id || null
      doc.assigned_volunteer_profile_id = worker.id || null
      doc.assigned_volunteer_name = worker.name || null
      doc.auto_assignment_reason = 'Re-matched by availability, skills, and location proximity.'
    }
  }

  doc.linked_alert_id = await syncResourceAlert(db, category, doc)
  await db.collection(category.collection).updateOne({ id: resourceId }, { $set: doc })
  await writeNgoOperationLog({
    db,
    action: 'resource_updated',
    entity_type: category.id,
    entity_id: doc.id,
    title: doc.title,
    user,
    details: { status: doc.status, priority: doc.priority, location_text: doc.location_text },
  })

  return doc
}

export async function deleteNgoResource(categoryId, resourceId, user) {
  const db = getDb()
  const category = getNgoResourceCategory(categoryId)
  if (!category) throw new Error('Unknown resource category')

  const existing = await db.collection(category.collection).findOne({ id: resourceId }, { projection: { _id: 0 } })
  if (!existing) return false

  await db.collection(category.collection).deleteOne({ id: resourceId })
  await db.collection('alerts').deleteMany({ alert_key: `ngo-resource:${category.id}:${resourceId}` })
  await writeNgoOperationLog({
    db,
    action: 'resource_deleted',
    entity_type: category.id,
    entity_id: resourceId,
    title: existing.title || category.label,
    user,
    details: { location_text: existing.location_text || null },
  })
  return true
}

export async function suggestVolunteerAssignment(categoryId, body) {
  const db = getDb()
  const category = getNgoResourceCategory(categoryId)
  if (!category) throw new Error('Unknown resource category')
  const draft = normalizeBaseResourceDoc(category, body || {}, null, null)
  const worker = await selectVolunteerForResource(db, category, draft)
  if (!worker) return null
  return {
    id: worker.id,
    linked_user_id: worker.linked_user_id || null,
    name: worker.name || 'Volunteer',
    phone: worker.phone || null,
    availability_status: worker.availability_status || 'Unknown',
    coverage_area: worker.coverage_area || null,
    skills: Array.isArray(worker.skills) ? worker.skills : [],
  }
}

export async function createShelterRecord(body, user) {
  const db = getDb()
  const metrics = computeShelterStatus({
    capacity: body.capacity,
    occupancy: body.occupied ?? body.occupancy,
  })
  const doc = {
    id: makeId(),
    name: String(body.name || 'Shelter').trim(),
    location_text: String(body.location_text || body.location || '').trim() || null,
    contact_phone: String(body.contact_phone || body.contact || '').trim() || null,
    shelter_type: String(body.shelter_type || 'general').trim() || 'general',
    lat: body.lat ?? null,
    lon: body.lon ?? null,
    ngo_owner_user_id: body.ngo_owner_user_id || user?.id || null,
    ngo_name: body.ngo_name || user?.name || null,
    notes: String(body.notes || '').trim() || null,
    priority: normalizePriority(body.priority),
    created_at: nowIso(),
    created_by_user_id: user?.id || null,
    updated_at: nowIso(),
    updated_by_user_id: user?.id || null,
    ...metrics,
  }

  await db.collection('shelters').insertOne(doc)
  await writeNgoOperationLog({
    db,
    action: 'shelter_created',
    entity_type: 'shelter',
    entity_id: doc.id,
    title: doc.name,
    user,
    details: { shelter_status: doc.shelter_status, location_text: doc.location_text },
  })

  return doc
}

export async function updateShelterRecord(shelterId, body, user) {
  const db = getDb()
  const existing = await db.collection('shelters').findOne({ id: shelterId }, { projection: { _id: 0 } })
  if (!existing) throw new Error('Shelter not found')

  const capacityCandidate = body.capacity !== undefined ? body.capacity : existing.capacity
  const occupancyCandidate = body.occupancy !== undefined || body.occupied !== undefined
    ? (body.occupancy ?? body.occupied)
    : existing.occupancy
  const metrics = computeShelterStatus({
    capacity: capacityCandidate,
    occupancy: occupancyCandidate,
  })

  const doc = {
    ...existing,
    name: body.name !== undefined ? String(body.name || 'Shelter').trim() : existing.name,
    location_text: body.location_text !== undefined || body.location !== undefined
      ? (String(body.location_text || body.location || '').trim() || null)
      : existing.location_text,
    contact_phone: body.contact_phone !== undefined || body.contact !== undefined
      ? (String(body.contact_phone || body.contact || '').trim() || null)
      : existing.contact_phone,
    shelter_type: body.shelter_type !== undefined ? (String(body.shelter_type || '').trim() || 'general') : (existing.shelter_type || 'general'),
    lat: body.lat ?? existing.lat ?? null,
    lon: body.lon ?? existing.lon ?? null,
    notes: body.notes !== undefined ? (String(body.notes || '').trim() || null) : (existing.notes || null),
    priority: body.priority !== undefined ? normalizePriority(body.priority) : normalizePriority(existing.priority),
    updated_at: nowIso(),
    updated_by_user_id: user?.id || null,
    ...metrics,
  }

  await db.collection('shelters').updateOne({ id: shelterId }, { $set: doc })
  await writeNgoOperationLog({
    db,
    action: 'shelter_updated',
    entity_type: 'shelter',
    entity_id: doc.id,
    title: doc.name,
    user,
    details: { shelter_status: doc.shelter_status, available_beds: doc.available_beds },
  })
  return doc
}

export async function updateShelterOccupancyRecord(shelterId, body, user) {
  const db = getDb()
  const existing = await db.collection('shelters').findOne({ id: shelterId }, { projection: { _id: 0 } })
  if (!existing) throw new Error('Shelter not found')

  const capacity = body.capacity !== undefined ? Math.max(toNumber(body.capacity, existing.capacity), 0) : Math.max(toNumber(existing.capacity, 0), 0)
  let occupancy = Math.max(toNumber(existing.occupancy, 0), 0)

  if (body.occupied !== undefined || body.occupancy !== undefined) {
    occupancy = Math.max(toNumber(body.occupancy ?? body.occupied, occupancy), 0)
  }
  if (body.occupied_delta !== undefined || body.occupancy_delta !== undefined) {
    occupancy += toNumber(body.occupied_delta ?? body.occupancy_delta, 0)
  }

  const metrics = computeShelterStatus({
    capacity,
    occupancy,
  })
  const doc = {
    ...existing,
    capacity,
    updated_at: nowIso(),
    updated_by_user_id: user?.id || null,
    ...metrics,
  }

  await db.collection('shelters').updateOne({ id: shelterId }, { $set: doc })
  await writeNgoOperationLog({
    db,
    action: 'shelter_occupancy_changed',
    entity_type: 'shelter',
    entity_id: doc.id,
    title: doc.name,
    user,
    details: { occupancy: doc.occupancy, available_beds: doc.available_beds, shelter_status: doc.shelter_status },
  })
  return doc
}

export async function assignSurvivorToShelter(survivorId, shelterId, user) {
  const db = getDb()
  const survivor = await db.collection('survivors').findOne({ id: survivorId }, { projection: { _id: 0 } })
  if (!survivor) throw new Error('Survivor request not found')

  const currentShelterId = survivor.assigned_shelter_id || null
  if (currentShelterId && currentShelterId !== shelterId) {
    await updateShelterOccupancyRecord(currentShelterId, { occupied_delta: -1 }, user)
  }

  let assignedShelter = null
  if (shelterId) {
    assignedShelter = await updateShelterOccupancyRecord(shelterId, { occupied_delta: currentShelterId === shelterId ? 0 : 1 }, user)
  }

  const updateDoc = {
    assigned_shelter_id: shelterId || null,
    assigned_shelter_name: assignedShelter?.name || null,
    shelter_status: assignedShelter?.shelter_status || null,
    updated_at: nowIso(),
  }

  await db.collection('survivors').updateOne({ id: survivorId }, { $set: updateDoc })
  const updated = await db.collection('survivors').findOne({ id: survivorId }, { projection: { _id: 0 } })

  await writeNgoOperationLog({
    db,
    action: shelterId ? 'survivor_assigned_to_shelter' : 'survivor_removed_from_shelter',
    entity_type: 'survivor',
    entity_id: survivorId,
    title: updated?.name || survivorId,
    user,
    details: { shelter_id: shelterId || null, shelter_name: assignedShelter?.name || null },
  })

  return updated
}

export async function getNgoResourceAnalytics() {
  const db = getDb()
  const categoryEntries = await Promise.all(
    NGO_RESOURCE_CATEGORIES.map(async (category) => {
      const docs = await db.collection(category.collection).find({}, { projection: { _id: 0 } }).toArray()
      const items = docs.map((doc) => decorateResource(category, doc))
      return {
        id: category.id,
        label: category.label,
        total_items: items.length,
        total_quantity: items.reduce((sum, item) => sum + item.quantity, 0),
        low_count: items.filter((item) => item.status === 'low').length,
        critical_count: items.filter((item) => item.status === 'critical').length,
        urgent_count: items.filter((item) => item.priority === 'urgent').length,
      }
    }),
  )

  const [shelters, workers, survivors, tasks, alerts] = await Promise.all([
    db.collection('shelters').find({}, { projection: { _id: 0 } }).toArray(),
    db.collection('workers').find({}, { projection: { _id: 0 } }).toArray(),
    db.collection('survivors').find({}, { projection: { _id: 0 } }).toArray(),
    db.collection('tasks').find({}, { projection: { _id: 0 } }).toArray(),
    db.collection('alerts').find({}, { projection: { _id: 0 } }).toArray(),
  ])

  const normalizedShelters = shelters.map((shelter) => ({ ...shelter, ...computeShelterStatus(shelter) }))
  const totalResourceRecords = categoryEntries.reduce((sum, category) => sum + category.total_items, 0)
  const totalResourceQuantity = categoryEntries.reduce((sum, category) => sum + category.total_quantity, 0)
  const lowResources = categoryEntries.reduce((sum, category) => sum + category.low_count, 0)
  const criticalResources = categoryEntries.reduce((sum, category) => sum + category.critical_count, 0)
  const urgentResources = categoryEntries.reduce((sum, category) => sum + category.urgent_count, 0)
  const availableVolunteers = workers.filter((worker) => String(worker.availability_status || '').toLowerCase() === 'available').length
  const busyVolunteers = workers.filter((worker) => String(worker.availability_status || '').toLowerCase() === 'on-task').length
  const activeShelters = normalizedShelters.filter((shelter) => shelter.occupancy > 0).length
  const availableBeds = normalizedShelters.reduce((sum, shelter) => sum + shelter.available_beds, 0)
  const totalBeds = normalizedShelters.reduce((sum, shelter) => sum + shelter.capacity, 0)
  const openSurvivorAssignments = survivors.filter((survivor) => !survivor.assigned_shelter_id).length

  return {
    categories: categoryEntries,
    totals: {
      total_resource_records: totalResourceRecords,
      total_resource_quantity: totalResourceQuantity,
      low_resources: lowResources,
      critical_resources: criticalResources,
      urgent_resources: urgentResources,
      active_shelters: activeShelters,
      total_shelters: normalizedShelters.length,
      available_beds: availableBeds,
      total_beds: totalBeds,
      available_volunteers: availableVolunteers,
      busy_volunteers: busyVolunteers,
      active_alerts: alerts.filter((alert) => !alert.resolved_at).length,
      open_tasks: tasks.filter((task) => task.status !== 'completed').length,
      unassigned_survivors: openSurvivorAssignments,
    },
    shelter_health: {
      available: normalizedShelters.filter((shelter) => shelter.shelter_status === 'available').length,
      nearly_full: normalizedShelters.filter((shelter) => shelter.shelter_status === 'nearly_full').length,
      full: normalizedShelters.filter((shelter) => shelter.shelter_status === 'full').length,
    },
    low_resource_alerts: categoryEntries
      .filter((category) => category.low_count || category.critical_count)
      .sort((left, right) => (right.critical_count + right.low_count) - (left.critical_count + left.low_count))
      .slice(0, 4),
  }
}

export async function seedNgoResourceData() {
  const db = getDb()

  const seedEntries = [
    {
      categoryId: 'food-supply',
      docs: [
        {
          title: 'Ready-to-eat meal packets',
          subtype: 'Dry ration',
          quantity: 320,
          min_threshold: 250,
          unit: 'packs',
          priority: 'normal',
          location_text: 'Central Warehouse',
          meal_type: 'family packs',
          dietary_support: 'standard',
          storage_condition: 'dry storage',
        },
      ],
    },
    {
      categoryId: 'medical-aid',
      docs: [
        {
          title: 'First aid trauma kits',
          subtype: 'Emergency treatment',
          quantity: 18,
          min_threshold: 25,
          unit: 'kits',
          priority: 'urgent',
          location_text: 'Medical Camp Alpha',
          aid_type: 'trauma',
          cold_chain_required: false,
        },
      ],
    },
    {
      categoryId: 'emergency-services',
      docs: [
        {
          title: 'Rapid rescue boat crew',
          subtype: 'Flood response',
          quantity: 2,
          min_threshold: 2,
          unit: 'teams',
          priority: 'urgent',
          location_text: 'River belt sector',
          service_mode: 'boat rescue',
          response_time_minutes: 18,
          readiness_score: 88,
        },
      ],
    },
    {
      categoryId: 'clothing-essentials',
      docs: [
        {
          title: 'Blanket and essentials kit',
          subtype: 'Winter relief',
          quantity: 120,
          min_threshold: 90,
          unit: 'kits',
          priority: 'normal',
          location_text: 'North Depot',
          kit_type: 'blanket kit',
          seasonal_support: 'winter',
        },
      ],
    },
    {
      categoryId: 'water-sanitation',
      docs: [
        {
          title: 'Water purification packs',
          subtype: 'Safe drinking water',
          quantity: 40,
          min_threshold: 60,
          unit: 'packs',
          priority: 'urgent',
          location_text: 'Relief Camp Delta',
          purifier_units: 12,
          water_quality_status: 'watch',
        },
      ],
    },
  ]

  for (const entry of seedEntries) {
    const category = getNgoResourceCategory(entry.categoryId)
    if (!category) continue
    const count = await db.collection(category.collection).countDocuments()
    if (count > 0) continue

    const docs = entry.docs.map((doc) => normalizeBaseResourceDoc(category, doc, null, { id: null, name: 'System Seed' }))
    for (const doc of docs) {
      doc.linked_alert_id = await syncResourceAlert(db, category, doc)
    }
    await db.collection(category.collection).insertMany(docs)
  }
}
