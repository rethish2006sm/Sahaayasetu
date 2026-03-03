import express from 'express'
import cors from 'cors'
import path from 'path'
import { env } from './src/config/env.js'
import { connectMongo } from './src/db/mongo.js'
import { seedInitialData } from './src/services/data.js'
import authRoutes from './src/routes/auth.js'
import survivorRoutes from './src/routes/survivors.js'
import platformRoutes from './src/routes/platform.js'
import chatRoutes from './src/routes/chat.js'
import homeSettingsRoutes from './src/routes/homeSettings.js'

async function start() {
  await connectMongo()
  await seedInitialData()

  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '2mb' }))

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'sahaayasetu-backend' }))
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))
  app.use('/v1/auth', authRoutes)
  app.use('/v1/survivors', survivorRoutes)
  app.use('/v1/platform', platformRoutes)
  app.use('/v1/chat', chatRoutes)
  app.use('/v1/home-settings', homeSettingsRoutes)

  app.use((req, res) => res.status(404).json({ detail: `Route not found: ${req.method} ${req.path}` }))

  app.listen(env.port, () => {
    console.log(`Backend running at http://127.0.0.1:${env.port}`)
  })
}

start().catch((err) => {
  console.error('Failed to start backend:', err)
  process.exit(1)
})
