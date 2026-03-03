import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import { allowRoles, authRequired } from '../middleware/auth.js'
import { getHomeSettings, upsertHomeSettings } from '../services/homeSettings.js'

const router = express.Router()
const uploadDir = path.join(process.cwd(), 'uploads', 'home')

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    await fs.mkdir(uploadDir, { recursive: true })
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now()
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, `${timestamp}${ext}`)
  },
})

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } })

const removeOldImage = async (oldPath) => {
  if (!oldPath || oldPath.startsWith('http')) return
  const absolute = path.join(process.cwd(), oldPath.replace(/^\//, ''))
  try {
    await fs.unlink(absolute)
  } catch (err) {
    // ignore missing file
  }
}

router.get('/', async (_req, res) => {
  try {
    const settings = await getHomeSettings()
    res.json(settings)
  } catch (err) {
    res.status(500).json({ detail: err.message })
  }
})

router.put(
  '/',
  authRequired,
  allowRoles('admin'),
  upload.single('image'),
  async (req, res) => {
    try {
      const { alert_text, hero_text } = req.body || {}
      const settings = await getHomeSettings()
      let image_path = settings.image_path
      if (req.file) {
        await removeOldImage(image_path)
        image_path = `/uploads/home/${req.file.filename}`
      }
      const updated = await upsertHomeSettings({
        alert_text,
        hero_text,
        image_path,
      })
      res.json(updated)
    } catch (err) {
      res.status(500).json({ detail: err.message })
    }
  },
)

export default router
