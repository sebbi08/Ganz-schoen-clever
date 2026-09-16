import type { Score } from '../game/types'

const AREAS = [
  { key: 'yellow', label: 'Gelb', color: 'var(--yellow)' },
  { key: 'blue', label: 'Blau', color: 'var(--blue)' },
  { key: 'green', label: 'Grün', color: 'var(--green)' },
  { key: 'orange', label: 'Orange', color: 'var(--orange)' },
  { key: 'purple', label: 'Lila', color: 'var(--purple)' },
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
                <span className="swatch" style={{ background: area.color }} />
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
              <span className="swatch" style={{ background: 'var(--fox)' }} />
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
