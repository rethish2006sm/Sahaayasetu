import { MongoClient } from 'mongodb'
import { env } from '../config/env.js'

let client
let db

export async function connectMongo() {
  if (!env.mongoUri) {
    throw new Error('MONGODB_URI is empty. Add it in Backend/.env')
  }
  client = new MongoClient(env.mongoUri)
  await client.connect()
  db = client.db(env.dbName)
  await ensureIndexes(db)
  return db
}

export function getDb() {
  if (!db) throw new Error('MongoDB is not connected yet')
  return db
}

async function ensureIndexes(database) {
  await Promise.all([
    database.collection('users').createIndex({ email: 1 }, { unique: true }),
    database.collection('users').createIndex({ id: 1 }, { unique: true }),
    database.collection('wallet_accounts').createIndex({ user_id: 1 }, { unique: true }),
    database.collection('comp_accounts').createIndex({ user_id: 1 }, { unique: true }),
    database.collection('workers').createIndex({ linked_user_id: 1 }, { unique: true, sparse: true }),
    database.collection('shelters').createIndex({ id: 1 }, { unique: true }),
    database.collection('alerts').createIndex({ alert_key: 1 }, { unique: true, sparse: true }),
    database.collection('ngo_food_supply_resources').createIndex({ id: 1 }, { unique: true }),
    database.collection('ngo_medical_aid_resources').createIndex({ id: 1 }, { unique: true }),
    database.collection('ngo_emergency_service_resources').createIndex({ id: 1 }, { unique: true }),
    database.collection('ngo_clothing_essentials_resources').createIndex({ id: 1 }, { unique: true }),
    database.collection('ngo_water_sanitation_resources').createIndex({ id: 1 }, { unique: true }),
    database.collection('ngo_operation_logs').createIndex({ created_at: -1 }),
  ])
}
