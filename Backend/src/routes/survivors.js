import express from 'express'
import { getDb } from '../db/mongo.js'
import { authRequired } from '../middleware/auth.js'
import { makeId } from '../services/data.js'
import { nowIso } from '../utils/common.js'

const router = express.Router()

router.get('/', authRequired, async (_req, res) => {
  try {
    const db = getDb()
    const survivors = await db.collection('survivors').find({}, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray()
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
    const doc = {
      id: makeId(),
      ...payload,
      assigned_worker_id: payload.assigned_worker_id || null,
      request_status: payload.request_status || 'open',
      worker_response_status: payload.worker_response_status || 'pending',
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
    const existing = await db.collection('survivors').findOne({ id })
    if (!existing) return res.status(404).json({ detail: 'Survivor request not found' })
    const isOwner = existing.created_by_user_id === req.user.id
    if (!isOwner && !['admin', 'ngo'].includes(req.user.role)) {
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
    const existing = await db.collection('survivors').findOne({ id })
    if (!existing) return res.status(404).json({ detail: 'Survivor request not found' })

    const isOwner = existing.created_by_user_id === req.user.id
    const canManage = ['admin', 'ngo'].includes(req.user.role)
    if (!isOwner && !canManage) return res.status(403).json({ detail: 'Not allowed to delete this request' })

    await db.collection('survivors').deleteOne({ id })
    return res.status(204).send()
  } catch (err) {
    return res.status(500).json({ detail: err.message || 'Failed to delete survivor request' })
  }
})

export default router
