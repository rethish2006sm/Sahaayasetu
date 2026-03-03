import { useState } from 'react'
import SimpleChatBot from './SimpleChatBot'
import VoiceAssistant from './VoiceAssistant'

export default function AssistantHub({ className = '' }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(false)

  const openChat = () => {
    setMenuOpen(false)
    setVoiceOpen(false)
    setChatOpen(true)
  }

  const openVoice = () => {
    setMenuOpen(false)
    setChatOpen(false)
    setVoiceOpen(true)
  }

  return (
    <>
      <SimpleChatBot open={chatOpen} onOpenChange={setChatOpen} hideTrigger />
      <VoiceAssistant open={voiceOpen} onOpenChange={setVoiceOpen} hideTrigger />
      <div className={`fixed bottom-6 right-6 z-50 flex flex-col items-center gap-2 ${className}`}>
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-300 bg-white text-2xl font-bold text-slate-700 shadow-lg"
        >
          +
        </button>
        {menuOpen ? (
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
            <button
              type="button"
              onClick={openChat}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Medical Chat
            </button>
            <button
              type="button"
              onClick={openVoice}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Voice Assistant
            </button>
          </div>
        ) : null}
      </div>
    </>
  )
}
