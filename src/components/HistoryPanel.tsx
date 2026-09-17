import { useEffect, useState } from 'react'
import type { HistoryEntry } from '../game/history'

interface Props {
  past: HistoryEntry[]
  onUndo: (steps: number) => void
}

const SHOWN = 8
const ARMED_MS = 4000

/**
 * Globaler Verlauf. Nur der jeweils letzte Zug lässt sich zurücknehmen, und
 * das erst auf den zweiten Klick – der erste fragt nach.
 */
export function HistoryPanel({ past, onUndo }: Props) {
  const [armed, setArmed] = useState(false)
  const last = past[past.length - 1]

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
          <ol className="history-list">
            {past
              .slice(-SHOWN)
              .reverse()
              .map((entry, index) => (
                <li key={past.length - index} className={`history-row ${entry.tone}`}>
                  <span className="history-dot" />
                  <span className="label">{entry.label}</span>
                </li>
              ))}
          </ol>
        </>
      )}
    </div>
  )
}
