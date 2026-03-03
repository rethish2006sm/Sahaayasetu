import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getDb } from '../db/mongo.js'
import { env } from '../config/env.js'
import { authRequired, allowRoles, makeToken } from '../middleware/auth.js'
import { pickUserPublic, nowIso } from '../utils/common.js'
import { ensureCompAccount, ensureWalletAccount, makeId } from '../services/data.js'

const router = express.Router()

function canCreateRole(currentUser, targetRole) {
  if (!currentUser) return ['survivor', 'donor'].includes(targetRole)
  if (currentUser.role === 'admin') return targetRole === 'ngo'
  if (currentUser.role === 'ngo') return targetRole === 'worker'
  return false
}

router.post('/signup', async (req, res) => {
  try {
    const db = getDb()
    const authHeader = req.headers.authorization || ''
    let creator = null

    if (authHeader.startsWith('Bearer ')) {
      const [, token] = authHeader.split('Bearer ')
      try {
        const payload = jwt.verify(token, env.jwtSecret)
        creator = await db.collection('users').findOne({ id: payload.uid }, { projection: { _id: 0, password_hash: 0 } })
      } catch {
        creator = null
      }
    }

    const { name, email, phone, password, role } = req.body || {}
    if (!name || !email || !password || !role) {
      return res.status(400).json({ detail: 'name, email, password, and role are required' })
    }

    if (!canCreateRole(creator, role)) {
      return res.status(403).json({ detail: 'You are not allowed to create this role' })
    }

    const exists = await db.collection('users').findOne({ email })
    if (exists) return res.status(409).json({ detail: 'Email already registered' })

    const user = {
      id: makeId(),
      name,
      email,
      password_hash: await bcrypt.hash(password, 10),
      role,
      phone: phone || null,
      created_at: nowIso(),
      updated_at: nowIso(),
    }

    await db.collection('users').insertOne(user)
    await Promise.all([
      ensureWalletAccount(user.id),
      ensureCompAccount(user.id),
    ])

    if (role === 'ngo') {
      await db.collection('ngos').insertOne({
        id: makeId(),
        owner_user_id: user.id,
        name: `${name} NGO`,
        location: null,
        phone: null,
        lat: null,
        lon: null,
        resources: '',
        created_at: nowIso(),
        updated_at: nowIso(),
      })
    }

    return res.status(201).json({ user: pickUserPublic(user) })
  } catch (err) {
    return res.status(500).json({ detail: err.message || 'Signup failed' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const db = getDb()
    const { email, password } = req.body || {}
    const user = await db.collection('users').findOne({ email })
    if (!user) return res.status(401).json({ detail: 'Invalid email or password' })

    const ok = await bcrypt.compare(password || '', user.password_hash)
    if (!ok) return res.status(401).json({ detail: 'Invalid email or password' })

    const token = makeToken(user)
    return res.json({ token, user: pickUserPublic(user) })
  } catch (err) {
    return res.status(500).json({ detail: err.message || 'Login failed' })
  }
})

router.post('/forgot-password', async (req, res) => {
  try {
    const db = getDb()
    const { email, new_password: newPassword } = req.body || {}
    if (!email || !newPassword) return res.status(400).json({ detail: 'email and new_password are required' })

    const user = await db.collection('users').findOne({ email })
    if (!user) return res.status(404).json({ detail: 'No account found for this email' })

    const password_hash = await bcrypt.hash(newPassword, 10)
    await db.collection('users').updateOne({ id: user.id }, { $set: { password_hash, updated_at: nowIso() } })
    return res.json({ ok: true })
  } catch (err) {
    return res.status(500).json({ detail: err.message || 'Forgot password failed' })
  }
})

router.get('/me', authRequired, async (req, res) => {
  return res.json({ user: req.user })
})

router.patch('/me', authRequired, async (req, res) => {
  try {
    const db = getDb()
    const { name, email, phone } = req.body || {}
    if (!name || !email) return res.status(400).json({ detail: 'name and email are required' })

    const clash = await db.collection('users').findOne({ email, id: { $ne: req.user.id } })
    if (clash) return res.status(409).json({ detail: 'Email is already in use' })

    await db.collection('users').updateOne(
      { id: req.user.id },
      { $set: { name, email, phone: phone || req.user.phone || null, updated_at: nowIso() } },
    )

    const fresh = await db.collection('users').findOne({ id: req.user.id }, { projection: { _id: 0, password_hash: 0 } })
    return res.json({ user: fresh })
  } catch (err) {
    return res.status(500).json({ detail: err.message || 'Profile update failed' })
  }
})

router.post('/change-password', authRequired, async (req, res) => {
  try {
    const db = getDb()
    const { current_password: currentPassword, new_password: newPassword } = req.body || {}
    if (!currentPassword || !newPassword) return res.status(400).json({ detail: 'current_password and new_password are required' })

    const user = await db.collection('users').findOne({ id: req.user.id })
    const ok = await bcrypt.compare(currentPassword, user.password_hash)
    if (!ok) return res.status(401).json({ detail: 'Current password is incorrect' })

    const password_hash = await bcrypt.hash(newPassword, 10)
    await db.collection('users').updateOne({ id: req.user.id }, { $set: { password_hash, updated_at: nowIso() } })
    return res.json({ ok: true })
  } catch (err) {
    return res.status(500).json({ detail: err.message || 'Password change failed' })
  }
})

router.get('/users', authRequired, allowRoles('admin'), async (_req, res) => {
  try {
    const db = getDb()
    const users = await db.collection('users').find({}, { projection: { _id: 0, password_hash: 0 } }).sort({ created_at: -1 }).toArray()
    return res.json({ users })
  } catch (err) {
    return res.status(500).json({ detail: err.message || 'Failed to load users' })
  }
})

export default router

