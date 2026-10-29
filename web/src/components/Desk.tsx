import { useEffect, useId, useRef, useState, useTransition } from 'react'
import {
  MODE_META,
  answerDesk,
  modeHint,
  type ChatMessage,
  type DeskMode,
} from '../lib/deskAi'

type Props = {
  onBack: () => void
}

const MODES: DeskMode[] = ['programma', 'email', 'formula', 'faq']

const STARTERS: Record<DeskMode, string> = {
  programma:
    'Coppia, 12 giorni a ottobre, prima volta in Cina, ritmo medio, Pechino Xi’an Guilin Shanghai.',
  email:
    'Agenzia chiede Zhangjiajie + panda per 14 giorni a settembre, clienti amanti natura.',
  formula:
    'Famiglia di 5 vuole hotel e transfer, guida solo Muraglia e Terracotta, resto in autonomia.',
  faq: 'Serve il visto per la Cina nel 2026 per italiani?',
}

export function Desk({ onBack }: Props) {
  const [mode, setMode] = useState<DeskMode>('programma')
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pending, startTransition] = useTransition()
  const streamRef = useRef<HTMLDivElement>(null)
  const formId = useId()

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, mode])

  function send(text: string) {
    const value = text.trim()
    if (!value) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: value,
      mode,
    }

    startTransition(() => {
      const reply = answerDesk(mode, value)
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: reply,
        mode,
      }
      setMessages((prev) => [...prev, userMsg, assistantMsg])
    })
    setDraft('')
  }

  const visible = messages.filter((m) => m.mode === mode)
  const meta = MODE_META[mode]

  return (
    <div className="desk-shell">
      <header className="desk-top">
        <div className="brand-mark">
          Yoyiyo <span>Desk AI</span>
        </div>
        <div className="nav-actions">
          <button type="button" className="btn btn-ghost" style={{ color: 'var(--ink)', borderColor: 'var(--line)' }} onClick={onBack}>
            Home
          </button>
          <button
            type="button"
            className="btn btn-lacquer"
            onClick={() => send(STARTERS[mode])}
            disabled={pending}
          >
            Esempio rapido
          </button>
        </div>
      </header>

      <div className="desk-layout">
        <aside className="mode-rail" aria-label="Modalità desk">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              className={`mode-btn${mode === m ? ' active' : ''}`}
              onClick={() => setMode(m)}
            >
              <strong>{MODE_META[m].label}</strong>
              <span>{MODE_META[m].description}</span>
            </button>
          ))}
        </aside>

        <section className="chat-panel" aria-labelledby={formId}>
          <div className="chat-head">
            <h2 id={formId}>{meta.title}</h2>
            <p>{meta.description}</p>
          </div>

          <div className="chat-stream" ref={streamRef} role="log" aria-live="polite">
            {visible.length === 0 ? (
              <div className="bubble assistant">
                {`Pronto. Incolla il brief dell’agenzia o del cliente.\n\n${modeHint(mode)}`}
              </div>
            ) : (
              visible.map((m) => (
                <div key={m.id} className={`bubble ${m.role}`}>
                  {m.text}
                </div>
              ))
            )}
          </div>

          <form
            className="chat-compose"
            onSubmit={(e) => {
              e.preventDefault()
              send(draft)
            }}
          >
            <label className="visually-hidden" htmlFor={`${formId}-input`} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
              Brief
            </label>
            <textarea
              id={`${formId}-input`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={modeHint(mode)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  send(draft)
                }
              }}
            />
            <div className="compose-row">
              <p className="hint">Invio+Cmd/Ctrl per generare · Demo locale su knowledge Yoyiyo</p>
              <button type="submit" className="btn btn-ink" disabled={pending || !draft.trim()}>
                {pending ? 'Sto scrivendo…' : 'Genera'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
