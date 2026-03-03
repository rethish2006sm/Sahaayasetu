import { useEffect, useMemo, useState } from 'react'

const DEFAULT_COMMANDS = [
  { key: 'show help', action: 'Navigate to the Help Centre tab' },
  { key: 'show shelters', action: 'Navigate to the Suraksha Kendra tab' },
  { key: 'show requests', action: 'Navigate to My Requests' },
  { key: 'show compensation', action: 'Open the Compensation tab' },
  { key: 'show missing', action: 'Open the Missing Person tab' },
]

export default function VoiceAssistant({
  onCommand,
  commands = DEFAULT_COMMANDS,
  displayName = 'Voice Assistant',
  open: externalOpen,
  onOpenChange,
  hideTrigger = false,
}) {
  const [listening, setListening] = useState(false)
  const [status, setStatus] = useState('Waiting...')
  const [lastTranscript, setLastTranscript] = useState('')
  const [lastCommand, setLastCommand] = useState('')
  const [panelOpen, setPanelOpen] = useState(Boolean(externalOpen))
  const Recognition = useMemo(() => {
    if (typeof window === 'undefined') return null
    return window.SpeechRecognition || window.webkitSpeechRecognition || null
  }, [])
  const recognitionAvailable = Boolean(Recognition)

  useEffect(() => {
    if (!recognitionAvailable) {
      setStatus('Voice recognition unavailable in this browser.')
      return undefined
    }
    if (typeof externalOpen === 'boolean') {
      setPanelOpen(externalOpen)
    }
    const recorder = new Recognition()
    recorder.continuous = false
    recorder.interimResults = false
    recorder.lang = 'en-US'

    recorder.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim()
      setLastTranscript(transcript)
      const match = commands.find((cmd) => transcript.includes(cmd.key))
      if (match) {
        const keyIndex = transcript.indexOf(match.key)
        const extra = keyIndex >= 0 ? transcript.slice(keyIndex + match.key.length).trim() : ''
        setLastCommand(match.action || match.key)
        onCommand({
          key: match.key,
          action: match.action || match.key,
          value: extra,
        })
        setStatus(`Command recognized: ${match.key}`)
      } else {
        setStatus('Command not recognized. Try a preset phrase.')
      }
    }
    recorder.onerror = () => {
      setStatus('Speech recognition failed. Try again.')
      setListening(false)
    }
    recorder.onend = () => {
      setListening(false)
    }

    if (listening) {
      setStatus('Listening...')
      recorder.start()
    } else {
      recorder.stop()
    }

    return () => {
      recorder.stop()
    }
  }, [Recognition, listening, onCommand, externalOpen])

  if (!panelOpen) {
    if (hideTrigger) return null
    return (
      <button
        type="button"
        onClick={() => {
          if (!recognitionAvailable) return
          setPanelOpen(true)
          onOpenChange?.(true)
        }}
        className="fixed bottom-6 right-6 z-50 rounded-full border border-slate-200 bg-white/90 p-3 text-sm font-semibold text-slate-700 shadow-lg transition hover:bg-white"
        aria-label="Open voice assistant"
      >
        🎙️
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex w-72 flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
        <span>{displayName}</span>
        <button
          type="button"
          onClick={() => {
            setPanelOpen(false)
            setListening(false)
            onOpenChange?.(false)
          }}
          className="text-slate-400 hover:text-slate-700"
          aria-label="Close voice assistant panel"
        >
          Close
        </button>
      </div>
      <div className="space-y-1 text-[11px] text-slate-700">
        <p>Try phrases like:</p>
        <ul className="list-disc pl-4">
          {commands.map((cmd) => (
            <li key={cmd.key}>{cmd.key}</li>
          ))}
        </ul>
      </div>
      {lastCommand ? (
        <p className="text-[10px] font-semibold text-slate-600">Executed: {lastCommand}</p>
      ) : null}
      {lastTranscript ? (
        <p className="text-[10px] text-slate-500">Last heard: {lastTranscript}</p>
      ) : null}
      <button
        onClick={() => {
          if (!recognitionAvailable) return
          setListening((prev) => !prev)
        }}
        disabled={!recognitionAvailable}
        className={`rounded-full px-4 py-2 text-sm font-semibold ${listening ? 'bg-red-600 text-white' : 'bg-blue-900 text-white'} ${!recognitionAvailable ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {listening ? 'Stop listening' : 'Start listening'}
      </button>
      <p className="text-[10px] text-slate-500">{status}</p>
      {!recognitionAvailable ? (
        <p className="text-[10px] text-red-500">Microphone access or speech API not available.</p>
      ) : null}
    </div>
  )
}
