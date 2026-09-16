import {
  YELLOW_COLUMN_POINTS,
  YELLOW_DIAGONAL_BONUS,
  YELLOW_GRID,
  YELLOW_ROW_BONUS,
} from '../game/layout'
import { isYellowDiagonalComplete, isYellowLocked } from '../game/scoring'
import type { PlayerState } from '../game/types'
import { BonusChip } from './BonusChip'

interface Props {
  player: PlayerState
  points: number
  onToggle: (row: number, col: number) => void
}

export function YellowArea({ player, points, onToggle }: Props) {
  const columnDone = YELLOW_COLUMN_POINTS.map((_, col) => player.yellow.every((row) => row[col]))

  return (
    <section className="area yellow">
      <div className="area-head">
        <span>Gelb – volle Spalten geben Punkte, volle Reihen einen Bonus</span>
        <span className="points">{points}</span>
      </div>

      <div className="grid">
        {YELLOW_GRID.map((row, rowIndex) => (
          <div className="grid-row" key={rowIndex}>
            {row.map((value, colIndex) => {
              const locked = isYellowLocked(rowIndex, colIndex)
              const marked = player.yellow[rowIndex][colIndex]
              return (
                <button
                  key={colIndex}
                  className={`cell${marked ? ' marked' : ''}${locked ? ' locked' : ''}`}
                  disabled={locked}
                  onClick={() => onToggle(rowIndex, colIndex)}
                  aria-label={`Gelb Reihe ${rowIndex + 1} Spalte ${colIndex + 1}`}
                  aria-pressed={marked}
                >
                  {value ?? ''}
                </button>
              )
            })}
            <BonusChip bonus={YELLOW_ROW_BONUS[rowIndex]} />
          </div>
        ))}

        <div className="grid-foot">
          {YELLOW_COLUMN_POINTS.map((value, index) => (
            <div key={index} className={`col-points${columnDone[index] ? ' done' : ''}`}>
              {value}
            </div>
          ))}
          <span
            style={{ opacity: isYellowDiagonalComplete(player) ? 1 : 0.45 }}
            title="Bonus für die Diagonale 3–1–2–6"
          >
            <BonusChip bonus={YELLOW_DIAGONAL_BONUS} />
          </span>
        </div>
      </div>
    </section>
  )
}
