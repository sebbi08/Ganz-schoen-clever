import type { HistoryEntry } from '../game/history'

interface Props {
  past: HistoryEntry[]
  onUndo: (steps: number) => void
}

const SHOWN = 8

/**
 * Globaler Verlauf. Ein Klick nimmt den gewählten Zug und alles danach
 * zurück – einschließlich der Boni, die dabei ausgelöst wurden.
 */
export function HistoryPanel({ past, onUndo }: Props) {
  // Neueste zuerst; der Index von hinten ist zugleich die Anzahl der Schritte.
  const recent = past
    .map((entry, index) => ({ entry, steps: past.length - index }))
    .reverse()
    .slice(0, SHOWN)

  return (
    <div className="panel">
      <h2>Verlauf</h2>

      {past.length === 0 ? (
        <p className="empty-hint">Noch keine Züge.</p>
      ) : (
        <>
          <button className="btn undo-btn" onClick={() => onUndo(1)}>
            ↶ Letzten Zug zurücknehmen
          </button>
          <ol className="history-list">
            {recent.map(({ entry, steps }) => (
              <li key={steps}>
                <button
                  className={`history-row ${entry.tone}`}
                  onClick={() => onUndo(steps)}
                  title={
                    steps === 1
                      ? 'Diesen Zug zurücknehmen'
                      : `Diesen Zug und die ${steps - 1} danach zurücknehmen`
                  }
                >
                  <span className="history-dot" />
                  <span className="label">{entry.label}</span>
                  <span className="tick">↶{steps > 1 && ` ${steps}`}</span>
                </button>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}
