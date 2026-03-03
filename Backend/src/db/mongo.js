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
  ])
}
