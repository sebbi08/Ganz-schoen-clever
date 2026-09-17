import type { Score } from '../game/types'

const AREAS = [
  { key: 'yellow', label: 'Gelb' },
  { key: 'blue', label: 'Blau' },
  { key: 'green', label: 'Grün' },
  { key: 'orange', label: 'Orange' },
  { key: 'purple', label: 'Lila' },
] as const

export function ScorePanel({ score }: { score: Score }) {
  return (
    <div className="panel">
      <h2>Wertung</h2>
      <table className="score-table">
        <tbody>
          {AREAS.map((area) => (
            <tr key={area.key}>
              <td>
                <span className={`swatch ${area.key}`} />
                {area.label}
                {score[area.key] === score.foxValue && score.foxes > 0 && (
                  <span className="note"> · schwächster Bereich</span>
                )}
              </td>
              <td>{score[area.key]}</td>
            </tr>
          ))}
          <tr>
            <td>
              <span className="swatch fox" />
              Füchse
              <span className="note">
                {' '}
                {score.foxes} × {score.foxValue}
              </span>
            </td>
            <td>{score.foxPoints}</td>
          </tr>
          <tr className="total">
            <td>Gesamt</td>
            <td>{score.total}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
