import { useCallback, useMemo, useState } from 'react'
import axios from 'axios'
import { API_BASE } from '../lib/api'

const DEFAULT_CHAT_BACKEND = `${API_BASE}/v1/chat`

const bubbleStyles = {
  user: 'self-end rounded-xl bg-blue-900 text-white px-3 py-2 text-sm',
  bot: 'self-start rounded-xl bg-slate-100 text-slate-800 px-3 py-2 text-sm',
}

export default function SimpleChatBot({ open: externalOpen, onOpenChange, hideTrigger = false }) {
  const [open, setOpen] = useState(Boolean(externalOpen))
  const [message, setMessage] = useState('')
  const [chat, setChat] = useState([
    { sender: 'bot', text: 'Ask me a medical question and I will suggest the next steps.' },
  ])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const apiUrl = useMemo(() => import.meta.env.VITE_CHAT_BACKEND_URL || DEFAULT_CHAT_BACKEND, [])
  const actualOpen = typeof externalOpen === 'boolean' ? externalOpen : open
  const setOpenState = (value) => {
    if (typeof externalOpen !== 'boolean') {
      setOpen(value)
    }
    onOpenChange?.(value)
  }

  const sendMessage = useCallback(async () => {
    const trimmed = message.trim()
    if (!trimmed || loading) return
    const updatedChat = [...chat, { sender: 'user', text: trimmed }]
    setChat(updatedChat)
    setMessage('')
    setLoading(true)
    setStatus('Thinking...')
    try {
      const response = await axios.post(apiUrl, { message: trimmed })
      setChat([...updatedChat, { sender: 'bot', text: response.data.reply || 'No reply available.' }])
      setStatus('')
    } catch (error) {
      console.error('Chatbot error', error)
      setChat([
        ...updatedChat,
        { sender: 'bot', text: 'The assistant is unavailable right now. Please try again later.' },
      ])
      setStatus('Unable to reach the bot.')
    } finally {
      setLoading(false)
    }
  }, [apiUrl, chat, loading, message])

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {!actualOpen ? (
        hideTrigger ? null : (
          <button
            type="button"
            onClick={() => setOpenState(true)}
            className="fixed bottom-6 right-6 z-50 rounded-full border border-slate-200 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg"
          >
            Chat with Doctor
          </button>
        )
      ) : (
        <section className="fixed bottom-6 right-6 z-50 w-[320px] max-w-[90vw] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
          <header className="flex items-center justify-between pb-2 text-sm font-semibold text-slate-600">
            <span>Medical Chat</span>
            <button type="button" onClick={() => setOpenState(false)} className="text-slate-500 hover:text-slate-700">
              Close
            </button>
          </header>
          <div className="mb-3 max-h-60 space-y-2 overflow-y-auto px-1 py-2">
            {chat.map((msg, index) => (
              <div key={`${msg.sender}-${index}`} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={bubbleStyles[msg.sender]}>{msg.text}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <input
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              placeholder="Describe symptoms or ask for help..."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Send'}
            </button>
            {status ? <p className="text-xs text-slate-500">{status}</p> : null}
          </div>
        </section>
      )}
    </>
  )
}
