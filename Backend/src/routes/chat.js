import { Router } from 'express'
import OpenAI from 'openai'

const router = Router()
const groqApiKey = process.env.GROQ_API_KEY
const client = groqApiKey
  ? new OpenAI({
      apiKey: groqApiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    })
  : null

const extractReply = (response) => {
  if (!response) return 'No reply received from the assistant.'
  if (typeof response.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim()
  }
  if (Array.isArray(response.output)) {
    const joined = response.output
      .map((block) => {
        if (Array.isArray(block.content)) {
          return block.content.map((piece) => (typeof piece === 'string' ? piece : piece?.text || '')).join(' ')
        }
        if (typeof block.content === 'string') return block.content
        if (typeof block.text === 'string') return block.text
        return ''
      })
      .filter(Boolean)
      .join(' ')
    if (joined) return joined.trim()
  }
  if (response.result) return String(response.result).trim()
  return 'The assistant did not return a message.'
}

router.post('/', async (req, res) => {
  if (!client) {
    return res.status(503).json({ detail: 'GROQ_API_KEY is not configured.' })
  }
  const { message } = req.body || {}
  if (!message || !String(message).trim()) {
    return res.status(400).json({ detail: 'Message is required.' })
  }

  try {
    const featureNote = `
The platform supports: survivor help requests, compensation transfers, Suraksha Kendra shelter lookups, NGO help centre, missing person reports, alerts, and admin dashboards.
When recommending a feature, keep each reply short, direct, and focused on the medical concern.
Proceed as a general medical assistant.
`
    const response = await client.responses.create({
      model: 'openai/gpt-oss-20b',
      input: `${featureNote}\nUser: ${String(message).trim()}`,
    })
    res.json({ reply: extractReply(response) })
  } catch (error) {
    console.error('Chatbot error', error)
    res.status(500).json({ detail: 'Failed to generate a reply.' })
  }
})

export default router
