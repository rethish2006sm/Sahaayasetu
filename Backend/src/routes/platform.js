import express from 'express'
import path from 'path'
import { mkdir } from 'fs/promises'
import multer from 'multer'
import sharp from 'sharp'
import { randomUUID } from 'crypto'
import { getDb } from '../db/mongo.js'
import { authRequired, allowRoles } from '../middleware/auth.js'
import { ensureCompAccount, ensureWalletAccount, getSummary, makeId, refreshWorkerAvailabilityByUserId, sanitizeAmount } from '../services/data.js'
import { assignWorkerUserOwnership, buildOwnership, getNgoIdsForOwner, getPrimaryNgoForOwner, getWorkerByAssigneeId, hydrateWorkerOwnership, listWorkerAssigneeKeysForNgo, resolveOwnershipForActor, toWorkerOwnershipFields, workerBelongsToNgo } from '../services/ngoAccess.js'
import { assignSurvivorToShelter, computeShelterStatus, createShelterRecord, updateShelterOccupancyRecord, updateShelterRecord, writeNgoOperationLog } from '../services/ngoResources.js'
import { nowIso, toNumber, toOptionalNumber } from '../utils/common.js'

const router = express.Router()
router.use(authRequired)

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png'])
const IMAGE_UPLOAD_LIMIT_BYTES = 5 * 1024 * 1024
const missingImageUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) return cb(null, true)
    cb(new Error('Only JPG or PNG images are accepted'))
  },
  limits: { fileSize: IMAGE_UPLOAD_LIMIT_BYTES },
})

const isMultipartRequest = (req) => {
  const rawType = String(req.headers['content-type'] || '').toLowerCase()
  return rawType.includes('multipart/form-data')
}

const acceptMissingImageField = (fieldName) => (req, res, next) => {
  if (!isMultipartRequest(req)) return next()
  missingImageUpload.single(fieldName)(req, res, (err) => {
    if (err) return res.status(400).json({ detail: err.message })
    next()
  })
}

async function saveImageToUploads(buffer, folder = 'missing') {
  if (!buffer) return null
  const uploadsDir = path.join(process.cwd(), 'uploads', folder)
  await mkdir(uploadsDir, { recursive: true })
  const fileName = `${Date.now()}-${randomUUID()}.webp`
  const targetPath = path.join(uploadsDir, fileName)
  await sharp(buffer).rotate().webp({ quality: 80 }).toFile(targetPath)
  return `/uploads/${folder}/${fileName}`
}

function ngoCanManageSurvivorRequest(survivor, ngoUserId, ngoIds = []) {
  return (
    survivor?.assigned_ngo_user_id === ngoUserId
    || (survivor?.assigned_ngo_id && ngoIds.includes(survivor.assigned_ngo_id))
  )
}

function taskBelongsToNgo(task, ngoUserId, ngoIds = [], ngoWorkerKeys = []) {
  return (
    task?.owner_ngo_user_id === ngoUserId
    || (task?.ngo_id && ngoIds.includes(task.ngo_id))
    || (task?.assigned_worker_id && ngoWorkerKeys.includes(task.assigned_worker_id))
  )
}

async function buildWorkerQueryForUser(db, user) {
  if (user.role === 'admin') return {}
  if (user.role === 'ngo') {
    const ownedWorkerUsers = await db.collection('users').find(
      { role: 'worker', owner_ngo_user_id: user.id },
      { projection: { _id: 0, id: 1 } },
    ).toArray()
    const workerUserIds = ownedWorkerUsers.map((item) => item.id).filter(Boolean)
    const orConditions = [{ owner_ngo_user_id: user.id }]
    if (workerUserIds.length) orConditions.push({ linked_user_id: { $in: workerUserIds } })
    return { $or: orConditions }
  }
  if (user.role === 'worker') return { linked_user_id: user.id }
  return { linked_user_id: user.id }
}

async function buildTaskQueryForUser(db, user) {
  if (user.role === 'admin') return {}

  if (user.role === 'ngo') {
    const [ngoIds, ngoWorkerKeys] = await Promise.all([
      getNgoIdsForOwner(db, user.id),
      listWorkerAssigneeKeysForNgo(db, user.id),
    ])
    const orConditions = [{ owner_ngo_user_id: user.id }]
    if (ngoIds.length) orConditions.push({ ngo_id: { $in: ngoIds } })
    if (ngoWorkerKeys.length) orConditions.push({ assigned_worker_id: { $in: ngoWorkerKeys } })
    return { $or: orConditions }
  }

  if (user.role === 'worker') {
    const { ownership } = await resolveOwnershipForActor(db, user)
    const orConditions = [{ assigned_worker_id: user.id }]
    if (!ownership.ownerNgoUserId) return { $or: orConditions }
    if (ownership.ownerNgoUserId) {
      orConditions.push({ owner_ngo_user_id: ownership.ownerNgoUserId })
      const ngoIds = await getNgoIdsForOwner(db, ownership.ownerNgoUserId)
      if (ngoIds.length) orConditions.push({ ngo_id: { $in: ngoIds } })
    }
    orConditions.push({ assigned_worker_id: null, owner_ngo_user_id: null, ngo_id: null })
    return { $or: orConditions }
  }

  return { created_by_user_id: user.id }
}

async function buildDonationQueryForUser(db, user) {
  if (user.role === 'admin') return {}
  if (user.role === 'ngo') {
    return {
      $or: [
        { assigned_worker_owner_ngo_user_id: user.id },
        { assigned_worker_user_id: null },
        { assigned_worker_user_id: { $exists: false } },
      ],
    }
  }
  if (user.role === 'worker') {
    const workerProfile = await db.collection('workers').findOne(
      { linked_user_id: user.id },
      { projection: { _id: 0, id: 1 } },
    )
    const orConditions = [{ assigned_worker_user_id: user.id }]
    if (workerProfile?.id) orConditions.push({ assigned_worker_profile_id: workerProfile.id })
    return { $or: orConditions }
  }
  if (user.role === 'donor') return { donor_user_id: user.id }
  return { donor_user_id: user.id }
}

async function resolveTaskAssignee(db, requestedWorkerId, ownerNgoUserId, actorUser) {
  if (!requestedWorkerId) {
    return {
      normalizedAssigneeId: null,
      worker: null,
      ownership: buildOwnership(ownerNgoUserId || null, null, null),
    }
  }

  const worker = await getWorkerByAssigneeId(db, requestedWorkerId)
  if (!worker) throw new Error('Employee not found')
  if (!worker.owner_ngo_user_id) throw new Error('Employee is not linked to any NGO')
  if (actorUser.role === 'ngo' && !workerBelongsToNgo(worker, actorUser.id)) {
    throw new Error('You can assign only your own employees')
  }
  if (ownerNgoUserId && worker.owner_ngo_user_id !== ownerNgoUserId) {
    throw new Error('Employee belongs to a different NGO')
  }

  const ngoProfile = await getPrimaryNgoForOwner(db, worker.owner_ngo_user_id)
  return {
    normalizedAssigneeId: worker.linked_user_id || worker.id,
    worker,
    ownership: buildOwnership(worker.owner_ngo_user_id, ngoProfile, worker.ngo_name || null),
  }
}

const list = (collection, sort = { created_at: -1 }) => async (_req, res) => {
  try { const db = getDb(); const data = await db.collection(collection).find({}, { projection: { _id: 0 } }).sort(sort).toArray(); res.json(data) }
  catch (e) { res.status(500).json({ detail: e.message }) }
}

router.get('/summary', async (_req, res) => { try { res.json(await getSummary()) } catch (e) { res.status(500).json({ detail: e.message }) } })

router.get('/alerts', list('alerts'))
router.post('/alerts', allowRoles('admin', 'ngo'), async (req, res) => {
  try { const db = getDb(); const b = req.body || {}; const doc = { id: makeId(), title: b.title || 'Untitled alert', message: b.message || '', severity: b.severity || 'medium', radius_km: toNumber(b.radius_km, 0), created_by_user_id: req.user.id, created_at: nowIso() }; await db.collection('alerts').insertOne(doc); res.status(201).json(doc) }
  catch (e) { res.status(500).json({ detail: e.message }) }
})
router.delete('/alerts/:id', allowRoles('admin', 'ngo'), async (req, res) => { try { const db = getDb(); await db.collection('alerts').deleteOne({ id: req.params.id }); res.status(204).send() } catch (e) { res.status(500).json({ detail: e.message }) } })

router.get('/inventory', list('inventory'))
router.post('/inventory', allowRoles('admin', 'ngo'), async (req, res) => {
  try { const db = getDb(); const b = req.body || {}; const doc = { id: makeId(), resource_type: b.resource_type || 'resource', quantity: toNumber(b.quantity, 0), estimated_need: toNumber(b.estimated_need, 0), location: b.location || null, expiration_date: b.expiration_date || null, created_at: nowIso(), updated_at: nowIso() }; await db.collection('inventory').insertOne(doc); res.status(201).json(doc) }
  catch (e) { res.status(500).json({ detail: e.message }) }
})
router.delete('/inventory/:id', allowRoles('admin', 'ngo'), async (req, res) => { try { const db = getDb(); await db.collection('inventory').deleteOne({ id: req.params.id }); res.status(204).send() } catch (e) { res.status(500).json({ detail: e.message }) } })
router.get('/inventory/insights', async (_req, res) => {
  try { const db = getDb(); const items = await db.collection('inventory').find({}, { projection: { _id: 0 } }).toArray(); const total_items = items.reduce((s, i) => s + toNumber(i.quantity), 0); const total_estimated_need = items.reduce((s, i) => s + toNumber(i.estimated_need), 0); res.json({ total_items, total_estimated_need, gap: total_estimated_need - total_items, low_stock_count: items.filter((i) => toNumber(i.quantity) < toNumber(i.estimated_need) * 0.4).length }) }
  catch (e) { res.status(500).json({ detail: e.message }) }
})

router.get('/ngos', list('ngos'))
router.post('/ngos', allowRoles('admin', 'ngo'), async (req, res) => {
  try { const db = getDb(); const b = req.body || {}; const doc = { id: makeId(), owner_user_id: b.owner_user_id || req.user.id, name: b.name || `${req.user.name} NGO`, location: b.location || null, phone: b.phone || null, lat: b.lat ?? null, lon: b.lon ?? null, resources: b.resources || '', created_at: nowIso(), updated_at: nowIso() }; await db.collection('ngos').insertOne(doc); res.status(201).json(doc) }
  catch (e) { res.status(500).json({ detail: e.message }) }
})
router.patch('/ngos/:id', allowRoles('admin', 'ngo'), async (req, res) => {
  try {
    const db = getDb()
    const existing = await db.collection('ngos').findOne({ id: req.params.id }, { projection: { _id: 0 } })
    if (!existing) return res.status(404).json({ detail: 'NGO profile not found' })
    if (req.user.role === 'ngo' && existing.owner_user_id !== req.user.id) {
      return res.status(403).json({ detail: 'You can update only your NGO profile' })
    }

    const b = req.body || {}
    const set = {
      name: b.name || existing.name || `${req.user.name} NGO`,
      location: b.location || null,
      phone: b.phone || null,
      lat: toOptionalNumber(b.lat),
      lon: toOptionalNumber(b.lon),
      resources: b.resources ?? existing.resources ?? '',
      updated_at: nowIso(),
    }

    await db.collection('ngos').updateOne({ id: req.params.id }, { $set: set })
    const updated = await db.collection('ngos').findOne({ id: req.params.id }, { projection: { _id: 0 } })
    res.json(updated || {})
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})
router.delete('/ngos/:id', allowRoles('admin', 'ngo'), async (req, res) => { try { const db = getDb(); await db.collection('ngos').deleteOne({ id: req.params.id }); res.status(204).send() } catch (e) { res.status(500).json({ detail: e.message }) } })

router.get('/shelters', async (_req, res) => {
  try {
    const db = getDb()
    const data = await db.collection('shelters').find({}, { projection: { _id: 0 } }).sort({ updated_at: -1, created_at: -1 }).toArray()
    res.json(data.map((item) => ({ ...item, ...computeShelterStatus(item) })))
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})
router.post('/shelters', allowRoles('admin', 'ngo'), async (req, res) => {
  try {
    res.status(201).json(await createShelterRecord(req.body || {}, req.user))
  } catch (e) {
    res.status(400).json({ detail: e.message })
  }
})
router.patch('/shelters/:id', allowRoles('admin', 'ngo'), async (req, res) => {
  try {
    res.json(await updateShelterRecord(req.params.id, req.body || {}, req.user))
  } catch (e) {
    const status = e.message === 'Shelter not found' ? 404 : 400
    res.status(status).json({ detail: e.message })
  }
})
router.patch('/shelters/:id/occupancy', allowRoles('admin', 'ngo'), async (req, res) => {
  try {
    res.json(await updateShelterOccupancyRecord(req.params.id, req.body || {}, req.user))
  } catch (e) {
    const status = e.message === 'Shelter not found' ? 404 : 400
    res.status(status).json({ detail: e.message })
  }
})
router.delete('/shelters/:id', allowRoles('admin', 'ngo'), async (req, res) => {
  try {
    const db = getDb()
    const existing = await db.collection('shelters').findOne({ id: req.params.id }, { projection: { _id: 0 } })
    await db.collection('shelters').deleteOne({ id: req.params.id })
    if (existing) {
      await writeNgoOperationLog({
        db,
        action: 'shelter_deleted',
        entity_type: 'shelter',
        entity_id: existing.id,
        title: existing.name,
        user: req.user,
        details: { location_text: existing.location_text || null },
      })
    }
    res.status(204).send()
  } catch (e) {
    res.status(500).json({ detail: e.message })
  }
})

router.get('/tasks', async (req, res) => {
  try {
    const db = getDb()
    const query = await buildTaskQueryForUser(db, req.user)
    const [tasks, workers] = await Promise.all([
      db.collection('tasks').find(query, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray(),
      db.collection('workers').find({}, { projection: { _id: 0 } }).toArray(),
    ])
    const workerByUser = new Map()
    workers.forEach((worker) => {
      if (worker.id) workerByUser.set(worker.id, worker)
      if (worker.linked_user_id) workerByUser.set(worker.linked_user_id, worker)
    })
    res.json(tasks.map((t) => ({ ...t, assigned_worker_name: workerByUser.get(t.assigned_worker_id)?.name || null })))
  }
  catch (e) { res.status(500).json({ detail: e.message }) }
})
router.post('/tasks', allowRoles('admin', 'ngo'), async (req, res) => {
  try {
    const db = getDb()
    const b = req.body || {}

    if (req.user.role === 'ngo' && b.owner_ngo_user_id && b.owner_ngo_user_id !== req.user.id) {
      return res.status(403).json({ detail: 'You can create tasks only for your NGO' })
    }

    let ownerNgoUserId = req.user.role === 'ngo' ? req.user.id : (b.owner_ngo_user_id || null)
    let ownerNgoProfile = ownerNgoUserId ? await getPrimaryNgoForOwner(db, ownerNgoUserId) : null
    if (req.user.role === 'admin' && ownerNgoUserId && !ownerNgoProfile) {
      return res.status(400).json({ detail: 'Selected NGO profile was not found' })
    }

    const assignee = await resolveTaskAssignee(db, b.assigned_worker_id || null, ownerNgoUserId, req.user)
    if (assignee.worker && !ownerNgoUserId) {
      ownerNgoUserId = assignee.worker.owner_ngo_user_id
      ownerNgoProfile = await getPrimaryNgoForOwner(db, ownerNgoUserId)
    }

    const doc = {
      id: makeId(),
      title: b.title || 'Untitled task',
      description: b.description || '',
      priority: b.priority || 'medium',
      status: b.status || 'open',
      assigned_worker_id: assignee.normalizedAssigneeId,
      assigned_worker_profile_id: assignee.worker?.id || null,
      assigned_worker_owner_ngo_user_id: assignee.worker?.owner_ngo_user_id || null,
      owner_ngo_user_id: ownerNgoUserId || null,
      ngo_id: ownerNgoProfile?.id || null,
      ngo_name: ownerNgoProfile?.name || null,
      category: b.category || null,
      assignment_tag: b.assignment_tag || 'general',
      is_admin_special: Boolean(b.is_admin_special),
      location_text: b.location_text || null,
      survivor_id: b.survivor_id || null,
      created_by_user_id: req.user.id,
      created_by_role: req.user.role,
      created_at: nowIso(),
      updated_at: nowIso(),
    }

    await db.collection('tasks').insertOne(doc)
    if (doc.assigned_worker_id) await refreshWorkerAvailabilityByUserId(doc.assigned_worker_id)
    res.status(201).json(doc)
  }
  catch (e) { res.status(500).json({ detail: e.message }) }
})
router.patch('/tasks/:id/status', allowRoles('admin', 'ngo', 'worker'), async (req, res) => {
  try {
    const db = getDb()
    const t = await db.collection('tasks').findOne({ id: req.params.id }, { projection: { _id: 0 } })
    if (!t) return res.status(404).json({ detail: 'Task not found' })

    const b = req.body || {}
    const requestedAssigneeId = b.assigned_worker_id === undefined ? t.assigned_worker_id : (b.assigned_worker_id || null)

    if (req.user.role === 'ngo') {
      const [ngoIds, ngoWorkerKeys] = await Promise.all([
        getNgoIdsForOwner(db, req.user.id),
        listWorkerAssigneeKeysForNgo(db, req.user.id),
      ])
      if (!taskBelongsToNgo(t, req.user.id, ngoIds, ngoWorkerKeys)) {
        return res.status(403).json({ detail: 'This task belongs to another NGO' })
      }
    }

    if (req.user.role === 'worker') {
      const { ownership } = await resolveOwnershipForActor(db, req.user)
      const canManageOwnTask = t.assigned_worker_id === req.user.id
      const canClaimTask = (
        !t.assigned_worker_id
        && requestedAssigneeId === req.user.id
        && (!t.owner_ngo_user_id || (ownership.ownerNgoUserId && t.owner_ngo_user_id === ownership.ownerNgoUserId))
      )
      if (!canManageOwnTask && !canClaimTask) {
        return res.status(403).json({ detail: 'You can update only your own NGO tasks' })
      }
      if (requestedAssigneeId && requestedAssigneeId !== req.user.id) {
        return res.status(403).json({ detail: 'You can assign tasks only to yourself' })
      }
    }

    const expectedOwnerNgoUserId = req.user.role === 'ngo'
      ? req.user.id
      : (t.owner_ngo_user_id || null)
    const assignee = await resolveTaskAssignee(db, requestedAssigneeId, expectedOwnerNgoUserId, req.user)

    const set = {
      status: b.status || t.status,
      assigned_worker_id: assignee.normalizedAssigneeId,
      assigned_worker_profile_id: assignee.worker?.id || null,
      assigned_worker_owner_ngo_user_id: assignee.worker?.owner_ngo_user_id || null,
      updated_at: nowIso(),
    }

    await db.collection('tasks').updateOne({ id: t.id }, { $set: set })
    if (t.assigned_worker_id) await refreshWorkerAvailabilityByUserId(t.assigned_worker_id)
    if (set.assigned_worker_id) await refreshWorkerAvailabilityByUserId(set.assigned_worker_id)
    const f = await db.collection('tasks').findOne({ id: t.id }, { projection: { _id: 0 } })
    res.json(f)
  }
  catch (e) { res.status(500).json({ detail: e.message }) }
})
router.delete('/tasks/:id', allowRoles('admin', 'ngo'), async (req, res) => {
  try {
    const db = getDb()
    const t = await db.collection('tasks').findOne({ id: req.params.id }, { projection: { _id: 0 } })
    if (!t) return res.status(404).json({ detail: 'Task not found' })

    if (req.user.role === 'ngo') {
      const [ngoIds, ngoWorkerKeys] = await Promise.all([
        getNgoIdsForOwner(db, req.user.id),
        listWorkerAssigneeKeysForNgo(db, req.user.id),
      ])
      if (!taskBelongsToNgo(t, req.user.id, ngoIds, ngoWorkerKeys)) {
        return res.status(403).json({ detail: 'This task belongs to another NGO' })
      }
    }

    await db.collection('tasks').deleteOne({ id: req.params.id })
    if (t.assigned_worker_id) await refreshWorkerAvailabilityByUserId(t.assigned_worker_id)
    res.status(204).send()
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

router.get('/workers', async (req, res) => {
  try {
    const db = getDb()
    const query = await buildWorkerQueryForUser(db, req.user)
    const workers = await db.collection('workers').find(query, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray()
    const hydrated = await Promise.all(workers.map((worker) => hydrateWorkerOwnership(db, worker)))
    res.json(hydrated)
  } catch (e) { res.status(500).json({ detail: e.message }) }
})
router.post('/workers', allowRoles('admin', 'ngo', 'worker'), async (req, res) => {
  try {
    const db = getDb()
    const b = req.body || {}
    const linked_user_id = req.user.role === 'worker' ? req.user.id : (b.linked_user_id || null)

    if (linked_user_id) {
      const ex = await db.collection('workers').findOne({ linked_user_id }, { projection: { _id: 0 } })
      if (ex) return res.status(409).json({ detail: 'Worker profile already exists for this user' })
    }

    let ownership = null
    if (req.user.role === 'worker') {
      const resolved = await resolveOwnershipForActor(db, req.user)
      ownership = resolved.ownership
      if (!ownership.ownerNgoUserId) {
        return res.status(403).json({ detail: 'Employee account is not linked to any NGO' })
      }
    } else if (req.user.role === 'ngo') {
      const ngoProfile = await getPrimaryNgoForOwner(db, req.user.id)
      ownership = buildOwnership(req.user.id, ngoProfile, ngoProfile?.name || req.user.name || null)
    } else {
      const ownerNgoUserId = b.owner_ngo_user_id || null
      if (!ownerNgoUserId) return res.status(400).json({ detail: 'owner_ngo_user_id is required for admin-created employee profiles' })
      const ngoProfile = await getPrimaryNgoForOwner(db, ownerNgoUserId)
      ownership = buildOwnership(ownerNgoUserId, ngoProfile, ngoProfile?.name || null)
    }

    if (linked_user_id && ownership.ownerNgoUserId) {
      await assignWorkerUserOwnership(db, linked_user_id, ownership.ownerNgoUserId)
    }

    const doc = {
      id: makeId(),
      linked_user_id,
      name: b.name || req.user.name,
      phone: b.phone || req.user.phone || null,
      skills: Array.isArray(b.skills) ? b.skills : [],
      coverage_area: b.coverage_area || null,
      lat: b.lat ?? null,
      lon: b.lon ?? null,
      availability_status: b.availability_status || 'Available',
      ...toWorkerOwnershipFields(ownership),
      created_at: nowIso(),
      updated_at: nowIso(),
    }
    await db.collection('workers').insertOne(doc)
    res.status(201).json(doc)
  }
  catch (e) { res.status(500).json({ detail: e.message }) }
})
router.get('/workers/me', allowRoles('worker'), async (req, res) => {
  try {
    const db = getDb()
    const profile = await db.collection('workers').findOne({ linked_user_id: req.user.id }, { projection: { _id: 0 } })
    const hydrated = await hydrateWorkerOwnership(db, profile)
    res.json({ profile: hydrated || null })
  } catch (e) { res.status(500).json({ detail: e.message }) }
})
router.patch('/workers/me/status', allowRoles('worker'), async (req, res) => { try { const status = await refreshWorkerAvailabilityByUserId(req.user.id); res.json({ status: status || null }) } catch (e) { res.status(500).json({ detail: e.message }) } })
router.delete('/workers/:id', allowRoles('admin', 'ngo'), async (req, res) => {
  try {
    const db = getDb()
    const existing = await db.collection('workers').findOne({ id: req.params.id }, { projection: { _id: 0 } })
    if (!existing) return res.status(404).json({ detail: 'Employee not found' })
    const worker = await hydrateWorkerOwnership(db, existing)

    if (req.user.role === 'ngo' && !workerBelongsToNgo(worker, req.user.id)) {
      return res.status(403).json({ detail: 'You can delete only your own employees' })
    }

    await db.collection('workers').deleteOne({ id: req.params.id })
    res.status(204).send()
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

router.get('/donations', async (req, res) => {
  try {
    const db = getDb()
    const query = await buildDonationQueryForUser(db, req.user)
    const data = await db.collection('donations').find(query, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray()
    res.json(data)
  } catch (e) { res.status(500).json({ detail: e.message }) }
})
router.post('/donations', async (req, res) => {
  try { const db = getDb(); const b = req.body || {}; const doc = { id: makeId(), donor_user_id: req.user.id, donor_name: b.donor_name || req.user.name, donor_phone: b.donor_phone || req.user.phone || null, item_type: b.item_type || 'other', custom_item: b.custom_item || null, quantity: toNumber(b.quantity, 1), amount: b.amount ? toNumber(b.amount, 0) : null, incident_ref: b.incident_ref || null, notes: b.notes || null, status: 'submitted', assigned_worker_user_id: null, assigned_worker_profile_id: null, created_at: nowIso(), updated_at: nowIso() }; await db.collection('donations').insertOne(doc); res.status(201).json(doc) }
  catch (e) { res.status(500).json({ detail: e.message }) }
})
router.patch('/donations/:id/assign-worker', allowRoles('admin', 'ngo'), async (req, res) => {
  try {
    const db = getDb()
    const workerUserId = req.body?.worker_user_id
    if (!workerUserId) return res.status(400).json({ detail: 'worker_user_id is required' })

    const worker = await getWorkerByAssigneeId(db, workerUserId)
    if (!worker) return res.status(404).json({ detail: 'Employee not found' })
    if (req.user.role === 'ngo' && !workerBelongsToNgo(worker, req.user.id)) {
      return res.status(403).json({ detail: 'You can assign only your own employees' })
    }

    await db.collection('donations').updateOne(
      { id: req.params.id },
      {
        $set: {
          assigned_worker_user_id: worker.linked_user_id || worker.id,
          assigned_worker_profile_id: worker.id || null,
          assigned_worker_owner_ngo_user_id: worker.owner_ngo_user_id || null,
          assigned_worker_name: worker.name || null,
          status: 'worker_assigned',
          updated_at: nowIso(),
        },
      },
    )
    const f = await db.collection('donations').findOne({ id: req.params.id }, { projection: { _id: 0 } })
    res.json(f || {})
  }
  catch (e) { res.status(500).json({ detail: e.message }) }
})
router.patch('/donations/:id/mark-picked-up', allowRoles('admin', 'ngo', 'worker'), async (req, res) => {
  try {
    const db = getDb()
    const donation = await db.collection('donations').findOne({ id: req.params.id }, { projection: { _id: 0 } })
    if (!donation) return res.status(404).json({ detail: 'Donation not found' })

    if (req.user.role === 'ngo' && donation.assigned_worker_owner_ngo_user_id !== req.user.id) {
      return res.status(403).json({ detail: 'This pickup belongs to another NGO employee' })
    }
    if (req.user.role === 'worker') {
      const myProfile = await db.collection('workers').findOne(
        { linked_user_id: req.user.id },
        { projection: { _id: 0, id: 1 } },
      )
      const isMine = donation.assigned_worker_user_id === req.user.id || (myProfile?.id && donation.assigned_worker_profile_id === myProfile.id)
      if (!isMine) return res.status(403).json({ detail: 'This pickup is not assigned to you' })
    }

    await db.collection('donations').updateOne({ id: req.params.id }, { $set: { status: 'picked_up', updated_at: nowIso() } })
    const f = await db.collection('donations').findOne({ id: req.params.id }, { projection: { _id: 0 } })
    res.json(f || {})
  } catch (e) { res.status(500).json({ detail: e.message }) }
})
router.patch('/donations/:id/mark-distributed', allowRoles('admin', 'ngo', 'worker'), async (req, res) => {
  try {
    const db = getDb()
    const donation = await db.collection('donations').findOne({ id: req.params.id }, { projection: { _id: 0 } })
    if (!donation) return res.status(404).json({ detail: 'Donation not found' })

    if (req.user.role === 'ngo' && donation.assigned_worker_owner_ngo_user_id !== req.user.id) {
      return res.status(403).json({ detail: 'This distribution belongs to another NGO employee' })
    }
    if (req.user.role === 'worker') {
      const myProfile = await db.collection('workers').findOne(
        { linked_user_id: req.user.id },
        { projection: { _id: 0, id: 1 } },
      )
      const isMine = donation.assigned_worker_user_id === req.user.id || (myProfile?.id && donation.assigned_worker_profile_id === myProfile.id)
      if (!isMine) return res.status(403).json({ detail: 'This distribution is not assigned to you' })
    }

    await db.collection('donations').updateOne({ id: req.params.id }, { $set: { status: 'distributed', updated_at: nowIso() } })
    const f = await db.collection('donations').findOne({ id: req.params.id }, { projection: { _id: 0 } })
    res.json(f || {})
  } catch (e) { res.status(500).json({ detail: e.message }) }
})

router.get('/missing-persons', list('missing_persons'))
router.post(
  '/missing-persons',
  acceptMissingImageField('photo'),
  async (req, res) => {
    try {
      const db = getDb()
      const b = req.body || {}
      const age = toOptionalNumber(b.age)
      const photoUrl = req.file?.buffer ? await saveImageToUploads(req.file.buffer) : null
      const doc = {
        id: makeId(),
        name: b.name || 'Unknown',
        age,
        gender: b.gender || null,
        last_seen: b.last_seen || null,
        notes: b.notes || null,
        reporter_contact: b.reporter_contact || req.user.phone || null,
        photo_url: photoUrl,
        case_status: 'missing',
        verification_status: 'not_required',
        found_notes: null,
        found_photo_url: null,
        found_reporter_contact: null,
        found_reporter_email: null,
        created_by_user_id: req.user.id,
        created_at: nowIso(),
        updated_at: nowIso(),
      }
      await db.collection('missing_persons').insertOne(doc)
      res.status(201).json(doc)
    } catch (e) {
      res.status(500).json({ detail: e.message })
    }
  },
)
router.get('/missing-persons/search', async (req, res) => {
  try { const db = getDb(); const q = String(req.query.q || '').trim().toLowerCase(); const all = await db.collection('missing_persons').find({}, { projection: { _id: 0 } }).toArray(); if (!q) return res.json(all); res.json(all.filter((m) => String(m.name || '').toLowerCase().includes(q) || String(m.notes || '').toLowerCase().includes(q) || String(m.case_status || '').toLowerCase().includes(q))) }
  catch (e) { res.status(500).json({ detail: e.message }) }
})
router.delete('/missing-persons/:id', async (req, res) => { try { const db = getDb(); await db.collection('missing_persons').deleteOne({ id: req.params.id }); res.status(204).send() } catch (e) { res.status(500).json({ detail: e.message }) } })
router.patch(
  '/missing-persons/:id/report-found',
  acceptMissingImageField('found_photo'),
  async (req, res) => {
    try {
      const db = getDb()
      const b = req.body || {}
      const foundPhotoUrl = req.file?.buffer ? await saveImageToUploads(req.file.buffer) : null
      const updateFields = {
        case_status: 'found_pending_verification',
        verification_status: 'pending',
        found_notes: b.found_notes || null,
        found_reporter_contact: b.found_reporter_contact || null,
        found_reporter_email: b.found_reporter_email || null,
        updated_at: nowIso(),
      }
      if (foundPhotoUrl) updateFields.found_photo_url = foundPhotoUrl
      await db.collection('missing_persons').updateOne({ id: req.params.id }, { $set: updateFields })
      const f = await db.collection('missing_persons').findOne({ id: req.params.id }, { projection: { _id: 0 } })
      res.json(f || {})
    } catch (e) {
      res.status(500).json({ detail: e.message })
    }
  },
)
router.patch('/missing-persons/:id/verify-found', allowRoles('admin', 'ngo'), async (req, res) => {
  try { const db = getDb(); const approve = String(req.body?.decision || '').toLowerCase() === 'approve'; await db.collection('missing_persons').updateOne({ id: req.params.id }, { $set: { case_status: approve ? 'found_verified' : 'missing', verification_status: approve ? 'verified' : 'not_required', updated_at: nowIso() } }); const f = await db.collection('missing_persons').findOne({ id: req.params.id }, { projection: { _id: 0 } }); res.json(f || {}) }
  catch (e) { res.status(500).json({ detail: e.message }) }
})

router.patch('/survivor-requests/:id/assign', allowRoles('admin', 'ngo'), async (req, res) => {
  try {
    const db = getDb()
    const workerId = req.body?.assigned_worker_id || null
    const existing = await db.collection('survivors').findOne({ id: req.params.id }, { projection: { _id: 0 } })
    if (!existing) return res.status(404).json({ detail: 'Survivor request not found' })

    if (req.user.role === 'ngo') {
      const ngoIds = await getNgoIdsForOwner(db, req.user.id)
      if (!ngoCanManageSurvivorRequest(existing, req.user.id, ngoIds)) {
        return res.status(403).json({ detail: 'This survivor request belongs to another NGO' })
      }
    }

    const worker = workerId ? await getWorkerByAssigneeId(db, workerId) : null
    if (workerId && !worker) {
      return res.status(404).json({ detail: 'Employee not found' })
    }
    if (req.user.role === 'ngo' && worker && !workerBelongsToNgo(worker, req.user.id)) {
      return res.status(403).json({ detail: 'You can assign only your own employees' })
    }

    const assignmentNgoUserId = worker?.owner_ngo_user_id || existing.assigned_ngo_user_id || (req.user.role === 'ngo' ? req.user.id : null)
    const assignmentNgoProfile = assignmentNgoUserId ? await getPrimaryNgoForOwner(db, assignmentNgoUserId) : null

    await db.collection('survivors').updateOne(
      { id: req.params.id },
      {
        $set: {
          assigned_worker_id: worker?.linked_user_id || worker?.id || null,
          assigned_ngo_user_id: assignmentNgoUserId || null,
          assigned_ngo_id: assignmentNgoProfile?.id || existing.assigned_ngo_id || null,
          assigned_ngo_name: assignmentNgoProfile?.name || existing.assigned_ngo_name || null,
          assigned_by_ngo_user_id: req.user.role === 'ngo' ? req.user.id : (assignmentNgoUserId || existing.assigned_by_ngo_user_id || null),
          request_status: workerId ? 'assigned' : 'open',
          worker_response_status: workerId ? 'pending' : 'unassigned',
          updated_at: nowIso(),
        },
      },
    )

    const normalizedWorkerId = worker?.linked_user_id || worker?.id || null

    if (existing.assigned_worker_id && existing.assigned_worker_id !== normalizedWorkerId) {
      await refreshWorkerAvailabilityByUserId(existing.assigned_worker_id)
    }
    if (normalizedWorkerId) await refreshWorkerAvailabilityByUserId(normalizedWorkerId)

    const updated = await db.collection('survivors').findOne({ id: req.params.id }, { projection: { _id: 0 } })
    res.json(updated || {})
  }
  catch (e) { res.status(500).json({ detail: e.message }) }
})
router.patch('/survivor-requests/:id/shelter', allowRoles('admin', 'ngo'), async (req, res) => {
  try {
    res.json(await assignSurvivorToShelter(req.params.id, req.body?.shelter_id || null, req.user))
  } catch (e) {
    const status = e.message === 'Survivor request not found' ? 404 : 400
    res.status(status).json({ detail: e.message })
  }
})
router.patch('/survivor-requests/:id/worker-response', allowRoles('worker'), async (req, res) => {
  try {
    const db = getDb()
    const action = req.body?.action
    if (!['accept', 'reject'].includes(action)) return res.status(400).json({ detail: 'action must be accept or reject' })

    const existing = await db.collection('survivors').findOne({ id: req.params.id }, { projection: { _id: 0 } })
    if (!existing) return res.status(404).json({ detail: 'Survivor request not found' })
    if (existing.assigned_worker_id !== req.user.id) {
      return res.status(403).json({ detail: 'This survivor request is not assigned to you' })
    }

    const set = action === 'accept'
      ? { request_status: 'accepted_by_worker', worker_response_status: 'accepted', updated_at: nowIso() }
      : { request_status: 'rejection_pending_ngo', worker_response_status: 'rejected_by_worker', updated_at: nowIso() }

    await db.collection('survivors').updateOne({ id: req.params.id }, { $set: set })
    const updated = await db.collection('survivors').findOne({ id: req.params.id }, { projection: { _id: 0 } })
    res.json(updated || {})
  }
  catch (e) { res.status(500).json({ detail: e.message }) }
})
router.patch('/survivor-requests/:id/confirm-rejection', allowRoles('admin', 'ngo'), async (req, res) => {
  try {
    const db = getDb()
    const decision = req.body?.decision
    const existing = await db.collection('survivors').findOne({ id: req.params.id }, { projection: { _id: 0 } })
    if (!existing) return res.status(404).json({ detail: 'Survivor request not found' })

    if (req.user.role === 'ngo') {
      const ngoIds = await getNgoIdsForOwner(db, req.user.id)
      if (!ngoCanManageSurvivorRequest(existing, req.user.id, ngoIds)) {
        return res.status(403).json({ detail: 'This survivor request belongs to another NGO' })
      }
    }

    const set = decision === 'confirm_reject'
      ? { request_status: 'open', worker_response_status: 'rejection_confirmed', assigned_worker_id: null, updated_at: nowIso() }
      : { request_status: 'assigned', worker_response_status: 'assignment_kept', updated_at: nowIso() }

    await db.collection('survivors').updateOne({ id: req.params.id }, { $set: set })
    if (existing.assigned_worker_id) await refreshWorkerAvailabilityByUserId(existing.assigned_worker_id)
    const updated = await db.collection('survivors').findOne({ id: req.params.id }, { projection: { _id: 0 } })
    res.json(updated || {})
  }
  catch (e) { res.status(500).json({ detail: e.message }) }
})
async function walletTransfer(db, fromUserId, toUserId, amount, note = null, txType = 'transfer') {
  const safeAmount = sanitizeAmount(amount)
  if (!safeAmount) throw new Error('Amount must be greater than 0')
  if (fromUserId === toUserId) throw new Error('Cannot transfer to same account')
  const from = await ensureWalletAccount(fromUserId)
  const to = await ensureWalletAccount(toUserId)
  if (toNumber(from.balance) < safeAmount) throw new Error('Insufficient wallet balance')
  await db.collection('wallet_accounts').updateOne({ user_id: fromUserId }, { $inc: { balance: -safeAmount, total_sent: safeAmount }, $set: { updated_at: nowIso() } })
  await db.collection('wallet_accounts').updateOne({ user_id: toUserId }, { $inc: { balance: safeAmount, total_received: safeAmount }, $set: { updated_at: nowIso() } })
  const tx = { id: makeId(), tx_type: txType, status: 'completed', amount: safeAmount, from_user_id: fromUserId, to_user_id: toUserId, note, created_at: nowIso() }
  await db.collection('wallet_transactions').insertOne(tx)
  return tx
}

router.get('/wallet/me', async (req, res) => {
  try { const wallet = await ensureWalletAccount(req.user.id, req.user.phone || null); res.json({ account: wallet, share_phone: wallet.share_phone || req.user.phone || '' }) }
  catch (e) { res.status(500).json({ detail: e.message }) }
})
router.get('/wallet/directory', async (_req, res) => {
  try {
    const db = getDb()
    const users = await db.collection('users').find({}, { projection: { _id: 0, password_hash: 0 } }).toArray()
    const wallets = await db.collection('wallet_accounts').find({}, { projection: { _id: 0 } }).toArray()
    const byUser = new Map(wallets.map((w) => [w.user_id, w]))
    res.json(users.map((u) => ({ user_id: u.id, name: u.name, role: u.role, email: u.email, phone: u.phone || byUser.get(u.id)?.share_phone || null })))
  } catch (e) { res.status(500).json({ detail: e.message }) }
})
router.get('/wallet/transactions', async (req, res) => {
  try { const db = getDb(); const tx = await db.collection('wallet_transactions').find({ $or: [{ from_user_id: req.user.id }, { to_user_id: req.user.id }] }, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray(); res.json(tx) }
  catch (e) { res.status(500).json({ detail: e.message }) }
})
router.post('/wallet/transfer', async (req, res) => {
  try { const db = getDb(); const toUserId = req.body?.to_user_id; if (!toUserId) return res.status(400).json({ detail: 'to_user_id is required' }); const tx = await walletTransfer(db, req.user.id, toUserId, req.body?.amount, req.body?.note || null); res.status(201).json(tx) }
  catch (e) { res.status(400).json({ detail: e.message }) }
})
router.post('/wallet/transfer/by-phone', async (req, res) => {
  try { const db = getDb(); const phone = req.body?.phone; if (!phone) return res.status(400).json({ detail: 'phone is required' }); const user = await db.collection('users').findOne({ phone }, { projection: { _id: 0 } }) || await db.collection('wallet_accounts').findOne({ share_phone: phone }, { projection: { _id: 0 } }); const toUserId = user?.id || user?.user_id; if (!toUserId) return res.status(404).json({ detail: 'No user found for this phone number' }); const tx = await walletTransfer(db, req.user.id, toUserId, req.body?.amount, req.body?.note || null); res.status(201).json(tx) }
  catch (e) { res.status(400).json({ detail: e.message }) }
})
router.post('/wallet/topup-from-compensation', async (req, res) => {
  try { const db = getDb(); const amount = sanitizeAmount(req.body?.amount); if (!amount) return res.status(400).json({ detail: 'amount must be greater than 0' }); const comp = await ensureCompAccount(req.user.id); if (toNumber(comp.balance) < amount) return res.status(400).json({ detail: 'Insufficient compensation balance' }); await db.collection('comp_accounts').updateOne({ user_id: req.user.id }, { $inc: { balance: -amount, total_paid: amount }, $set: { updated_at: nowIso() } }); await db.collection('wallet_accounts').updateOne({ user_id: req.user.id }, { $inc: { balance: amount, total_received: amount }, $set: { updated_at: nowIso() } }); await db.collection('wallet_transactions').insertOne({ id: makeId(), tx_type: 'topup_from_compensation', status: 'completed', amount, from_user_id: req.user.id, to_user_id: req.user.id, note: req.body?.note || null, created_at: nowIso() }); await db.collection('comp_transactions').insertOne({ id: makeId(), user_id: req.user.id, tx_type: 'topup_to_wallet', amount, status: 'completed', note: req.body?.note || null, created_by_user_id: req.user.id, created_at: nowIso(), reviewed_at: nowIso() }); res.status(201).json({ ok: true }) }
  catch (e) { res.status(500).json({ detail: e.message }) }
})

router.get('/compensation/accounts', list('comp_accounts', { updated_at: -1 }))
router.get('/compensation/transactions', list('comp_transactions', { created_at: -1 }))
router.post('/compensation/grant', allowRoles('admin'), async (req, res) => {
  try { const db = getDb(); const userId = req.body?.survivor_user_id; const amount = sanitizeAmount(req.body?.amount); if (!userId) return res.status(400).json({ detail: 'survivor_user_id is required' }); if (!amount) return res.status(400).json({ detail: 'amount must be greater than 0' }); await ensureCompAccount(userId); await db.collection('comp_accounts').updateOne({ user_id: userId }, { $inc: { balance: amount, total_granted: amount }, $set: { updated_at: nowIso() } }); const tx = { id: makeId(), user_id: userId, tx_type: 'grant', amount, status: 'completed', note: req.body?.note || null, created_by_user_id: req.user.id, created_at: nowIso(), reviewed_at: nowIso() }; await db.collection('comp_transactions').insertOne(tx); res.status(201).json(tx) }
  catch (e) { res.status(500).json({ detail: e.message }) }
})
router.post('/compensation/pay', async (req, res) => {
  try { const db = getDb(); const amount = sanitizeAmount(req.body?.amount); if (!amount) return res.status(400).json({ detail: 'amount must be greater than 0' }); const account = await ensureCompAccount(req.user.id); if (toNumber(account.balance) < amount) return res.status(400).json({ detail: 'Insufficient compensation balance' }); await db.collection('comp_accounts').updateOne({ user_id: req.user.id }, { $inc: { balance: -amount, total_paid: amount }, $set: { updated_at: nowIso() } }); const tx = { id: makeId(), user_id: req.user.id, tx_type: 'payment', amount, status: 'completed', merchant_name: req.body?.merchant_name || null, note: req.body?.note || null, created_by_user_id: req.user.id, created_at: nowIso(), reviewed_at: nowIso() }; await db.collection('comp_transactions').insertOne(tx); res.status(201).json(tx) }
  catch (e) { res.status(500).json({ detail: e.message }) }
})
router.post('/compensation/withdraw-request', async (req, res) => {
  try { const db = getDb(); const amount = sanitizeAmount(req.body?.amount); if (!amount) return res.status(400).json({ detail: 'amount must be greater than 0' }); await ensureCompAccount(req.user.id); const tx = { id: makeId(), user_id: req.user.id, tx_type: 'withdraw_request', amount, status: 'pending', account_holder: req.body?.account_holder || null, bank_name: req.body?.bank_name || null, ifsc_code: req.body?.ifsc_code || null, account_number: req.body?.account_number || null, note: req.body?.note || null, created_by_user_id: req.user.id, created_at: nowIso(), reviewed_at: null }; await db.collection('comp_transactions').insertOne(tx); res.status(201).json(tx) }
  catch (e) { res.status(500).json({ detail: e.message }) }
})
router.patch('/compensation/transactions/:id/review', allowRoles('admin'), async (req, res) => {
  try { const db = getDb(); const d = String(req.body?.decision || '').toLowerCase(); if (!['approve', 'reject'].includes(d)) return res.status(400).json({ detail: 'decision must be approve or reject' }); const tx = await db.collection('comp_transactions').findOne({ id: req.params.id }, { projection: { _id: 0 } }); if (!tx) return res.status(404).json({ detail: 'Transaction not found' }); if (tx.status !== 'pending') return res.status(400).json({ detail: 'Transaction is already reviewed' }); if (d === 'approve') { const account = await ensureCompAccount(tx.user_id); if (toNumber(account.balance) < toNumber(tx.amount)) return res.status(400).json({ detail: 'Insufficient compensation balance for approval' }); await db.collection('comp_accounts').updateOne({ user_id: tx.user_id }, { $inc: { balance: -toNumber(tx.amount), total_withdrawn: toNumber(tx.amount) }, $set: { updated_at: nowIso() } }) } await db.collection('comp_transactions').updateOne({ id: tx.id }, { $set: { status: d === 'approve' ? 'approved' : 'rejected', reviewed_by_user_id: req.user.id, reviewed_at: nowIso() } }); const f = await db.collection('comp_transactions').findOne({ id: tx.id }, { projection: { _id: 0 } }); res.json(f) }
  catch (e) { res.status(500).json({ detail: e.message }) }
})

export default router
