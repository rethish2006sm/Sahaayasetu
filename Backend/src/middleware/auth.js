import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { getDb } from '../db/mongo.js'

export function makeToken(user) {
  return jwt.sign(
    { uid: user.id, role: user.role, email: user.email },
    env.jwtSecret,
    { expiresIn: '7d' },
  )
}

export async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ detail: 'Missing bearer token' })
    }

    const token = header.slice('Bearer '.length)
    const payload = jwt.verify(token, env.jwtSecret)
    const db = getDb()
    const user = await db.collection('users').findOne({ id: payload.uid }, { projection: { password_hash: 0, _id: 0 } })

    if (!user) return res.status(401).json({ detail: 'Invalid token user' })

    req.user = user
    req.token = token
    return next()
  } catch {
    return res.status(401).json({ detail: 'Invalid or expired token' })
  }
}

export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ detail: 'Forbidden for this role' })
    }
    return next()
  }
}
