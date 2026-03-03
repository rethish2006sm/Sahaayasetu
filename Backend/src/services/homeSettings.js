import { getDb } from '../db/mongo.js'
import { makeId } from './data.js'
import { nowIso } from '../utils/common.js'

const COLLECTION = 'home_settings'

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1570560258879-af7f8e1447ac?auto=format&fit=crop&w=1600&q=80'

export async function getHomeSettings() {
  const db = getDb()
  let doc = await db.collection(COLLECTION).findOne({}, { projection: { _id: 0 } })
  if (!doc) {
    doc = await createDefaultSettings()
  }
  return {
    alert_text: doc.alert_text || 'ALERT: Heavy rainfall warning in coastal regions. Evacuation advised in low-lying areas.',
    hero_text: doc.hero_text || 'Alert: Stay safe during the next weather event.',
    image_path: doc.image_path || DEFAULT_IMAGE,
    updated_at: doc.updated_at || doc.created_at,
  }
}

async function createDefaultSettings() {
  const db = getDb()
  const doc = {
    id: makeId(),
    alert_text: 'ALERT: Heavy rainfall warning in coastal regions. Evacuation advised in low-lying areas.',
    hero_text: 'Alert: Stay safe during the next weather event.',
    image_path: DEFAULT_IMAGE,
    created_at: nowIso(),
    updated_at: nowIso(),
  }
  const { ok, value } = await db.collection(COLLECTION).findOneAndUpdate(
    {},
    { $setOnInsert: doc },
    { upsert: true, returnDocument: 'after' },
  )
  return value || doc
}

export async function upsertHomeSettings({ alert_text, hero_text, image_path = null }) {
  const db = getDb()
  const update = { updated_at: nowIso() }
  if (alert_text !== undefined) update.alert_text = alert_text
  if (hero_text !== undefined) update.hero_text = hero_text
  if (image_path) update.image_path = image_path
  if (Object.keys(update).length === 1) {
    // only updated_at, nothing else
    return getHomeSettings()
  }
  const result = await db.collection(COLLECTION).findOneAndUpdate(
    {},
    { $set: update },
    { upsert: true, returnDocument: 'after' },
  )
  return result.value || getHomeSettings()
}
