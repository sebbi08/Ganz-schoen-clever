import { useEffect, useState } from 'react'
import type { HistoryEntry } from '../game/history'

interface Props {
  past: HistoryEntry[]
  future: HistoryEntry[]
  onUndo: (steps: number) => void
  onRedo: (steps: number) => void
}

const SHOWN = 8
const ARMED_MS = 4000

function Rows({ entries, undone }: { entries: HistoryEntry[]; undone?: boolean }) {
  return (
    <ol className={`history-list${undone ? ' undone' : ''}`}>
      {entries.map((entry, index) => (
        <li key={index} className={`history-row ${entry.tone}`}>
          <span className="history-dot" />
          <span className="label">{entry.label}</span>
        </li>
      ))}
    </ol>
  )
}

/**
 * Globaler Verlauf. Zurücknehmen geht nur für den letzten Zug und erst auf
 * den zweiten Klick. Was zurückgenommen wurde, steht oben und lässt sich
 * wiederholen – solange kein neuer Zug dazwischenkommt.
 */
export function HistoryPanel({ past, future, onUndo, onRedo }: Props) {
  const [armed, setArmed] = useState(false)
  const last = past[past.length - 1]
  const next = future[0]

  // Die Rückfrage verfällt von selbst, damit sie nicht scharf liegen bleibt.
  useEffect(() => {
    if (!armed) return
    const timer = setTimeout(() => setArmed(false), ARMED_MS)
    return () => clearTimeout(timer)
  }, [armed])

  // Ein neuer Zug entschärft eine offene Rückfrage.
  useEffect(() => setArmed(false), [past.length])

  return (
    <div className="panel">
      <h2>Verlauf</h2>

      {next && (
        <>
          <button
            className="btn redo-btn"
            onClick={() => onRedo(1)}
            title={`„${next.label}" wieder ausführen`}
          >
            ↷ Wiederholen
          </button>
          {/* Neueste Rücknahme oben, damit die Zeitachse durchläuft. */}
          <Rows entries={[...future].reverse()} undone />
        </>
      )}

      {past.length === 0 ? (
        <p className="empty-hint">Noch keine Züge.</p>
      ) : (
        <>
          <button
            className={`btn undo-btn${armed ? ' armed' : ''}`}
            onClick={() => {
              if (!armed) {
                setArmed(true)
                return
              }
              setArmed(false)
              onUndo(1)
            }}
          >
            {armed ? `„${last.label}" wirklich zurücknehmen?` : '↶ Letzten Zug zurücknehmen'}
          </button>
          <Rows entries={[...past].slice(-SHOWN).reverse()} />
        </>
      )}
    </div>
  )
}
