import { soloRating } from '../game/layout'
import type { Score } from '../game/types'

interface Props {
  score: Score
  /** Nur am Einzelblock zeigt der Block eine Bewertungsstufe an. */
  solo: boolean
}

const AREAS = [
  { key: 'yellow', label: 'Gelb' },
  { key: 'blue', label: 'Blau' },
  { key: 'green', label: 'Grün' },
  { key: 'orange', label: 'Orange' },
  { key: 'purple', label: 'Lila' },
] as const

/** Die Abrechnung nach der letzten Runde. */
export function FinalScore({ score, solo }: Props) {
  const rating = soloRating(score.total)

  return (
    <div className="panel final-score">
      <h2>Endwertung</h2>

      <div className="final-total">
        <strong>{score.total}</strong>
        <span>Punkte</span>
      </div>

      {solo && <p className="final-rating">{rating.label}</p>}

      <div className="final-areas">
        {AREAS.map((area) => (
          <div key={area.key} className={`final-area ${area.key}`}>
            <span className="label">{area.label}</span>
            <span className="value">{score[area.key]}</span>
          </div>
        ))}
        <div className="final-area fox">
          <span className="label">
            Füchse {score.foxes} × {score.foxValue}
          </span>
          <span className="value">{score.foxPoints}</span>
        </div>
      </div>

      <p className="empty-hint">
        {score.foxes > 0 && score.foxValue === 0
          ? 'Ein Bereich steht auf null – die Füchse bringen damit nichts.'
          : 'Korrigieren geht weiter über den Verlauf.'}
      </p>
    </div>
  )
}
