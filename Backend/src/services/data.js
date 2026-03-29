import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { getDb } from '../db/mongo.js'
import { nowIso, toNumber } from '../utils/common.js'
import { getHomeSettings } from './homeSettings.js'

export function makeId() {
  return uuid()
}

export async function ensureWalletAccount(userId, phone = null) {
  const db = getDb()
  const existing = await db.collection('wallet_accounts').findOne({ user_id: userId }, { projection: { _id: 0 } })
  if (existing) return existing

  const doc = {
    id: makeId(),
    user_id: userId,
    balance: 0,
    total_received: 0,
    total_sent: 0,
    share_phone: phone || null,
    created_at: nowIso(),
    updated_at: nowIso(),
  }
  await db.collection('wallet_accounts').insertOne(doc)
  return doc
}

export async function ensureCompAccount(userId) {
  const db = getDb()
  const existing = await db.collection('comp_accounts').findOne({ user_id: userId }, { projection: { _id: 0 } })
  if (existing) return existing

  const doc = {
    id: makeId(),
    user_id: userId,
    balance: 0,
    total_granted: 0,
    total_paid: 0,
    total_withdrawn: 0,
    created_at: nowIso(),
    updated_at: nowIso(),
  }
  await db.collection('comp_accounts').insertOne(doc)
  return doc
}

export async function refreshWorkerAvailabilityByUserId(userId) {
  const db = getDb()
  const worker = await db.collection('workers').findOne({ linked_user_id: userId }, { projection: { _id: 0 } })
  if (!worker) return null

  const activeTaskCount = await db.collection('tasks').countDocuments({
    assigned_worker_id: userId,
    status: { $in: ['open', 'in_progress', 'accepted_by_worker'] },
  })

  const status = activeTaskCount > 0 ? 'On-Task' : 'Available'
  await db.collection('workers').updateOne(
    { id: worker.id },
    { $set: { availability_status: status, updated_at: nowIso() } },
  )
  return status
}

export async function getSummary() {
  const db = getDb()
  const [survivors, openTasks, alerts, donations, shelters, workers, resourceCounts] = await Promise.all([
    db.collection('survivors').countDocuments(),
    db.collection('tasks').countDocuments({ status: { $ne: 'completed' } }),
    db.collection('alerts').countDocuments(),
    db.collection('donations').countDocuments(),
    db.collection('shelters').find({}, { projection: { _id: 0, capacity: 1, available_beds: 1, occupancy: 1 } }).toArray(),
    db.collection('workers').find({}, { projection: { _id: 0, availability_status: 1 } }).toArray(),
    Promise.all([
      db.collection('ngo_food_supply_resources').countDocuments(),
      db.collection('ngo_medical_aid_resources').countDocuments(),
      db.collection('ngo_emergency_service_resources').countDocuments(),
      db.collection('ngo_clothing_essentials_resources').countDocuments(),
      db.collection('ngo_water_sanitation_resources').countDocuments(),
    ]),
  ])

  const availableBeds = shelters.reduce((sum, shelter) => {
    const beds = shelter.available_beds ?? (Number(shelter.capacity || 0) - Number(shelter.occupancy || 0))
    return sum + Math.max(Number(beds || 0), 0)
  }, 0)
  const activeShelters = shelters.filter((shelter) => Number(shelter.occupancy || 0) > 0).length
  const availableVolunteers = workers.filter((worker) => String(worker.availability_status || '').toLowerCase() === 'available').length
  const busyVolunteers = workers.filter((worker) => String(worker.availability_status || '').toLowerCase() === 'on-task').length
  const resources = resourceCounts.reduce((sum, count) => sum + count, 0)

  return {
    survivors,
    open_tasks: openTasks,
    alerts,
    donations,
    resources,
    active_shelters: activeShelters,
    available_beds: availableBeds,
    available_volunteers: availableVolunteers,
    busy_volunteers: busyVolunteers,
  }
}

const ADMIN_INITIAL_BALANCE = 1000000

export async function seedInitialData() {
  const db = getDb()
  const adminEmail = 'admin@sahaayasetu.com'
  let adminUser = await db.collection('users').findOne({ email: adminEmail })

  if (!adminUser) {
    adminUser = {
      id: makeId(),
      name: 'Platform Admin',
      email: adminEmail,
      password_hash: await bcrypt.hash('admin123', 10),
      role: 'admin',
      phone: '9999999999',
      created_at: nowIso(),
      updated_at: nowIso(),
    }
    await db.collection('users').insertOne(adminUser)
  }

  await ensureWalletAccount(adminUser.id, adminUser.phone)
  await ensureCompAccount(adminUser.id)
  await ensureAdminWalletBalance(db, adminUser.id)

  const alertCount = await db.collection('alerts').countDocuments()
  if (alertCount === 0) {
    await db.collection('alerts').insertMany([
      {
        id: makeId(),
        title: 'Rainfall Warning',
        message: 'Heavy rainfall warning in low-lying areas.',
        severity: 'high',
        radius_km: 12,
        created_at: nowIso(),
      },
      {
        id: makeId(),
        title: 'Medical Camp Active',
        message: 'Emergency medical camp is active at central zone shelter.',
        severity: 'medium',
        radius_km: 5,
        created_at: nowIso(),
      },
    ])
  }

  const shelterCount = await db.collection('shelters').countDocuments()
  if (shelterCount === 0) {
    await db.collection('shelters').insertMany([
      {
        id: makeId(),
        name: 'Central Relief Shelter',
        location_text: 'City Community Hall',
        capacity: 250,
        occupancy: 80,
        contact_phone: '9000000001',
        created_at: nowIso(),
      },
      {
        id: makeId(),
        name: 'North Zone Shelter',
        location_text: 'North School Ground',
        capacity: 120,
        occupancy: 35,
        contact_phone: '9000000002',
        created_at: nowIso(),
      },
    ])
  }

  const inventoryCount = await db.collection('inventory').countDocuments()
  if (inventoryCount === 0) {
    await db.collection('inventory').insertMany([
      {
        id: makeId(),
        resource_type: 'food_packets',
        quantity: 450,
        estimated_need: 600,
        location: 'Main Warehouse',
        expiration_date: null,
        created_at: nowIso(),
      },
      {
        id: makeId(),
        resource_type: 'blankets',
        quantity: 180,
        estimated_need: 220,
        location: 'Zone B Depot',
        expiration_date: null,
        created_at: nowIso(),
      },
    ])
  }

  const taskCount = await db.collection('tasks').countDocuments()
  if (taskCount === 0) {
    await db.collection('tasks').insertMany([
      {
        id: makeId(),
        title: 'Relief Distribution - Sector 4',
        description: 'Deliver packed food and water to sector 4 families.',
        priority: 'high',
        status: 'open',
        assigned_worker_id: null,
        ngo_id: null,
        category: 'distribution',
        assignment_tag: 'general',
        is_admin_special: false,
        location_text: 'Sector 4',
        survivor_id: null,
        created_by_user_id: null,
        created_by_role: 'admin',
        created_at: nowIso(),
        updated_at: nowIso(),
      },
      {
        id: makeId(),
        title: 'Field Health Check',
        description: 'Coordinate with medical team and update patient list.',
        priority: 'medium',
        status: 'open',
        assigned_worker_id: null,
        ngo_id: null,
        category: 'medical',
        assignment_tag: 'admin_special',
        is_admin_special: true,
        location_text: 'Camp A',
        survivor_id: null,
        created_by_user_id: null,
        created_by_role: 'admin',
        created_at: nowIso(),
        updated_at: nowIso(),
      },
    ])
  }

  const missingCount = await db.collection('missing_persons').countDocuments()
  if (missingCount === 0) {
    await db.collection('missing_persons').insertOne({
      id: makeId(),
      name: 'Unknown Child',
      age: 9,
      gender: 'unknown',
      notes: 'Reported near bus stand during flood response.',
      case_status: 'missing',
      verification_status: 'not_required',
      found_notes: null,
      found_reporter_contact: null,
      reporter_contact: '9000000009',
      created_by_user_id: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    })
  }
  await getHomeSettings()
}

export function sanitizeAmount(amount) {
  const value = toNumber(amount)
  if (!Number.isFinite(value) || value <= 0) return null
  return Number(value.toFixed(2))
}

async function ensureAdminWalletBalance(db, userId) {
  const wallet = await db.collection('wallet_accounts').findOne({ user_id: userId }, { projection: { _id: 0 } })
  if (!wallet) return

  const deficit = ADMIN_INITIAL_BALANCE - toNumber(wallet.balance)
  if (deficit <= 0) return

  await db.collection('wallet_accounts').updateOne(
    { user_id: userId },
    {
      $inc: { balance: deficit, total_received: deficit },
      $set: { updated_at: nowIso() },
    },
  )

  await db.collection('wallet_transactions').insertOne({
    id: makeId(),
    tx_type: 'initial_seed',
    status: 'completed',
    amount: deficit,
    from_user_id: 'system',
    to_user_id: userId,
    note: 'Seed admin wallet with 10,00,000 initial balance',
    created_at: nowIso(),
  })
}
