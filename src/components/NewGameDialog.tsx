import { useState } from 'react'
import { roundsFor } from '../game/layout'

interface Props {
  /** Vorauswahl – die Spielerzahl der laufenden Partie. */
  tableSize: number
  /** Beim ersten Besuch gibt es noch nichts zu verwerfen. */
  fresh: boolean
  onStart: (size: number) => void
  onCancel: () => void
}

/**
 * Die Spielerzahl wird hier gewählt, nicht mehr während der Partie: Sie
 * bestimmt die Rundenzahl, und die ändert man mitten im Spiel nicht mehr.
 */
export function NewGameDialog({ tableSize, fresh, onStart, onCancel }: Props) {
  const [size, setSize] = useState(tableSize)

  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-label="Neues Spiel">
      <div className="panel dialog">
        <h2>Neues Spiel</h2>

        <p className="dialog-question">Wie viele sitzen am Tisch?</p>
        <div className="dialog-sizes">
          {[1, 2, 3, 4].map((option) => (
            <button
              key={option}
              className={`dialog-size${option === size ? ' active' : ''}`}
              onClick={() => setSize(option)}
              aria-pressed={option === size}
            >
              {option}
            </button>
          ))}
        </div>
        <p className="empty-hint">
          {roundsFor(size)} Runden · Die Spielerzahl lässt sich später nicht mehr ändern.
        </p>

        {!fresh && <p className="dialog-warning">Der aktuelle Block geht dabei verloren.</p>}

        <div className="dialog-actions">
          <button className="btn ghost" onClick={onCancel}>
            Abbrechen
          </button>
          <button className="btn primary" onClick={() => onStart(size)}>
            Spiel starten
          </button>
        </div>
      </div>
    </div>
  )
}
