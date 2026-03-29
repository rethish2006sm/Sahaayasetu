import express from 'express'
import { authRequired, allowRoles } from '../middleware/auth.js'
import {
  createNgoResource,
  deleteNgoResource,
  getNgoResourceAnalytics,
  listNgoResourceCategories,
  listNgoResources,
  listRecentNgoOperationLogs,
  suggestVolunteerAssignment,
  updateNgoResource,
} from '../services/ngoResources.js'

const router = express.Router()

router.use(authRequired)

router.get('/categories', (_req, res) => {
  res.json(listNgoResourceCategories())
})

router.get('/analytics', async (_req, res) => {
  try {
    res.json(await getNgoResourceAnalytics())
  } catch (error) {
    res.status(500).json({ detail: error.message })
  }
})

router.get('/logs', async (req, res) => {
  try {
    const limit = Math.max(1, Number(req.query.limit || 25))
    res.json(await listRecentNgoOperationLogs(limit))
  } catch (error) {
    res.status(500).json({ detail: error.message })
  }
})

router.post('/suggest-volunteer/:category', async (req, res) => {
  try {
    res.json({ recommendation: await suggestVolunteerAssignment(req.params.category, req.body || {}) })
  } catch (error) {
    const status = error.message === 'Unknown resource category' ? 404 : 400
    res.status(status).json({ detail: error.message })
  }
})

router.get('/:category', async (req, res) => {
  try {
    res.json(await listNgoResources(req.params.category, req.query))
  } catch (error) {
    const status = error.message === 'Unknown resource category' ? 404 : 500
    res.status(status).json({ detail: error.message })
  }
})

router.post('/:category', allowRoles('admin', 'ngo'), async (req, res) => {
  try {
    res.status(201).json(await createNgoResource(req.params.category, req.body || {}, req.user))
  } catch (error) {
    const status = error.message === 'Unknown resource category' ? 404 : 400
    res.status(status).json({ detail: error.message })
  }
})

router.patch('/:category/:id', allowRoles('admin', 'ngo'), async (req, res) => {
  try {
    res.json(await updateNgoResource(req.params.category, req.params.id, req.body || {}, req.user))
  } catch (error) {
    const status = ['Unknown resource category', 'Resource not found'].includes(error.message) ? 404 : 400
    res.status(status).json({ detail: error.message })
  }
})

router.delete('/:category/:id', allowRoles('admin', 'ngo'), async (req, res) => {
  try {
    const deleted = await deleteNgoResource(req.params.category, req.params.id, req.user)
    if (!deleted) return res.status(404).json({ detail: 'Resource not found' })
    return res.status(204).send()
  } catch (error) {
    const status = error.message === 'Unknown resource category' ? 404 : 500
    return res.status(status).json({ detail: error.message })
  }
})

export default router
