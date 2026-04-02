import express from 'express'
import { getDb } from '../db/mongo.js'
import { authRequired } from '../middleware/auth.js'
import { makeId } from '../services/data.js'
import { getNgoIdsForOwner, getPrimaryNgoForOwner, getWorkerByAssigneeId, workerBelongsToNgo } from '../services/ngoAccess.js'
import { nowIso, toOptionalNumber } from '../utils/common.js'

const router = express.Router()

function ngoCanManageSurvivorRequest(survivor, ngoUserId, ngoIds = []) {
  return (
    survivor?.assigned_ngo_user_id === ngoUserId
    || (survivor?.assigned_ngo_id && ngoIds.includes(survivor.assigned_ngo_id))
  )
}

async function buildSurvivorQueryForUser(db, user) {
  if (user.role === 'admin') return {}
  if (user.role === 'survivor') return { created_by_user_id: user.id }
  if (user.role === 'worker') return { assigned_worker_id: user.id }
  if (user.role === 'ngo') {
    const ngoIds = await getNgoIdsForOwner(db, user.id)
    const orConditions = [{ assigned_ngo_user_id: user.id }]
    if (ngoIds.length) {
      orConditions.push({ assigned_ngo_id: { $in: ngoIds } })
    }
    return { $or: orConditions }
  }
  return { created_by_user_id: user.id }
}

function normalizeLocationText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenizeLocationText(value) {
  return normalizeLocationText(value)
    .split(' ')
    .map((item) => item.trim())
    .filter((item) => item.length >= 3)
}

function scoreAddressMatch(requestLocation, ngoLocationText) {
  const requestText = normalizeLocationText(requestLocation)
  const ngoText = normalizeLocationText(ngoLocationText)
  if (!requestText || !ngoText) return 0
  if (requestText === ngoText) return 1000
  if (requestText.includes(ngoText) || ngoText.includes(requestText)) {
    return 700 + Math.min(requestText.length, ngoText.length)
  }

  const requestTokens = tokenizeLocationText(requestText)
  const ngoTokens = new Set(tokenizeLocationText(ngoText))
  if (!requestTokens.length || !ngoTokens.size) return 0

  let overlap = 0
  for (const token of requestTokens) {
    if (ngoTokens.has(token)) overlap += 1
  }
  return overlap > 0 ? overlap * 100 : 0
}

async function findBestNgoByAddress(db, locationText) {
  const ngos = await db.collection('ngos').find(
    {},
    { projection: { _id: 0, id: 1, owner_user_id: 1, name: 1, location: 1, resources: 1 } },
  ).toArray()

  let bestNgo = null
  for (const ngo of ngos) {
    const bestScoreForNgo = scoreAddressMatch(locationText, ngo.location)
    if (bestScoreForNgo <= 0) continue

    if (!bestNgo || bestScoreForNgo > bestNgo.match_score) {
      bestNgo = { ...ngo, match_score: bestScoreForNgo }
    }
  }

  return bestNgo
}

router.get('/', authRequired, async (req, res) => {
  try {
    const db = getDb()
    const survivorQuery = await buildSurvivorQueryForUser(db, req.user)
    const survivors = await db.collection('survivors').find(survivorQuery, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray()
    const workers = await db.collection('workers').find({}, { projection: { _id: 0 } }).toArray()
    const workerById = new Map()
    workers.forEach((worker) => {
      if (worker.id) workerById.set(worker.id, worker)
      if (worker.linked_user_id) workerById.set(worker.linked_user_id, worker)
    })
    const enriched = survivors.map((survivor) => {
      const worker = workerById.get(survivor.assigned_worker_id)
      return {
        ...survivor,
        assigned_worker_name: worker?.name || null,
        assigned_worker_phone: worker?.phone || null,
        assigned_worker_skills: Array.isArray(worker?.skills) ? worker.skills : [],
        assigned_worker_status: worker?.availability_status || null,
      }
    })
    return res.json(enriched)
  } catch (err) {
    return res.status(500).json({ detail: err.message || 'Failed to load survivors' })
  }
})

router.post('/', authRequired, async (req, res) => {
  try {
    const db = getDb()
    const payload = req.body || {}
    const locationLat = toOptionalNumber(payload.location_lat)
    const locationLon = toOptionalNumber(payload.location_lon)
    const locationText = String(payload.location_text || '').trim()
    const initialAssignedWorker = ['admin', 'ngo'].includes(req.user.role) && payload.assigned_worker_id
      ? await getWorkerByAssigneeId(db, payload.assigned_worker_id)
      : null
    if (payload.assigned_worker_id && !initialAssignedWorker) {
      return res.status(404).json({ detail: 'Employee not found' })
    }
    if (req.user.role === 'ngo' && initialAssignedWorker && !workerBelongsToNgo(initialAssignedWorker, req.user.id)) {
      return res.status(403).json({ detail: 'You can assign only your own employees' })
    }

    const initialAssignedWorkerId = ['admin', 'ngo'].includes(req.user.role)
      ? (initialAssignedWorker?.linked_user_id || initialAssignedWorker?.id || null)
      : null
    const matchedNgo = locationText
      ? await findBestNgoByAddress(db, locationText)
      : null
    const assignedNgoUserId = initialAssignedWorker?.owner_ngo_user_id || matchedNgo?.owner_user_id || null
    const assignedNgoProfile = assignedNgoUserId ? await getPrimaryNgoForOwner(db, assignedNgoUserId) : null
    const doc = {
      id: makeId(),
      ...payload,
      location_lat: locationLat,
      location_lon: locationLon,
      assigned_worker_id: initialAssignedWorkerId,
      assigned_ngo_id: assignedNgoProfile?.id || matchedNgo?.id || null,
      assigned_ngo_user_id: assignedNgoUserId,
      assigned_ngo_name: assignedNgoProfile?.name || matchedNgo?.name || null,
      assigned_ngo_distance_km: null,
      assigned_ngo_match_score: matchedNgo?.match_score ?? null,
      request_status: initialAssignedWorkerId ? (payload.request_status || 'assigned') : (payload.request_status || 'open'),
      worker_response_status: initialAssignedWorkerId ? (payload.worker_response_status || 'pending') : (payload.worker_response_status || 'unassigned'),
      created_by_user_id: req.user.id,
      created_at: nowIso(),
      updated_at: nowIso(),
    }
    await db.collection('survivors').insertOne(doc)
    return res.status(201).json(doc)
  } catch (err) {
    return res.status(500).json({ detail: err.message || 'Failed to create survivor request' })
  }
})

router.patch('/:id/status', authRequired, async (req, res) => {
  try {
    const db = getDb()
    const { id } = req.params
    const { status } = req.body || {}
    if (!status) return res.status(400).json({ detail: 'status is required' })
    const existing = await db.collection('survivors').findOne({ id }, { projection: { _id: 0 } })
    if (!existing) return res.status(404).json({ detail: 'Survivor request not found' })
    const isOwner = existing.created_by_user_id === req.user.id
    const ngoIds = req.user.role === 'ngo' ? await getNgoIdsForOwner(db, req.user.id) : []
    const canManageAsNgo = req.user.role === 'ngo' && ngoCanManageSurvivorRequest(existing, req.user.id, ngoIds)
    if (!isOwner && req.user.role !== 'admin' && !canManageAsNgo) {
      return res.status(403).json({ detail: 'Not allowed to update status' })
    }
    await db.collection('survivors').updateOne(
      { id },
      { $set: { request_status: status, updated_at: nowIso() } },
    )
    const updated = await db.collection('survivors').findOne({ id }, { projection: { _id: 0 } })
    return res.json(updated || {})
  } catch (err) {
    return res.status(500).json({ detail: err.message || 'Failed to update survivor request status' })
  }
})

router.delete('/:id', authRequired, async (req, res) => {
  try {
    const db = getDb()
    const { id } = req.params
    const existing = await db.collection('survivors').findOne({ id }, { projection: { _id: 0 } })
    if (!existing) return res.status(404).json({ detail: 'Survivor request not found' })

    const isOwner = existing.created_by_user_id === req.user.id
    const ngoIds = req.user.role === 'ngo' ? await getNgoIdsForOwner(db, req.user.id) : []
    const canManage = req.user.role === 'admin' || (req.user.role === 'ngo' && ngoCanManageSurvivorRequest(existing, req.user.id, ngoIds))
    if (!isOwner && !canManage) return res.status(403).json({ detail: 'Not allowed to delete this request' })

    await db.collection('survivors').deleteOne({ id })
    return res.status(204).send()
  } catch (err) {
    return res.status(500).json({ detail: err.message || 'Failed to delete survivor request' })
  }
})

export default router
