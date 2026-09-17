import {
  YELLOW_COLUMN_POINTS,
  YELLOW_DIAGONAL_BONUS,
  YELLOW_GRID,
  YELLOW_ROW_BONUS,
} from '../game/layout'
import { isYellowDiagonalComplete, isYellowLocked } from '../game/scoring'
import type { AreaMode } from '../game/bonuses'
import type { PlayerState } from '../game/types'
import { AreaHead } from './AreaHead'
import { BonusChip } from './BonusChip'

interface Props {
  player: PlayerState
  points: number
  /** Der Bereich mit den wenigsten Punkten trägt die Füchse. */
  weakest: boolean
  foxes: number
  mode: AreaMode
  onMark: (row: number, col: number) => void
}

export function YellowArea({ player, points, weakest, foxes, mode, onMark }: Props) {
  const columnDone = YELLOW_COLUMN_POINTS.map((_, col) => player.yellow.every((row) => row[col]))

  return (
    <section
      className={`area yellow${mode === 'pick' ? ' picking' : ''}${mode === 'locked' ? ' locked' : ''}`}
    >
      <AreaHead
        text="Gelb – volle Spalten geben Punkte, volle Reihen einen Bonus"
        points={points}
        weakest={weakest}
        foxes={foxes}
      />

      <div className="grid">
        {YELLOW_GRID.map((row, rowIndex) => (
          <div className="grid-row" key={rowIndex}>
            {row.map((value, colIndex) => {
              const locked = isYellowLocked(rowIndex, colIndex)
              const marked = player.yellow[rowIndex][colIndex]
              // Gesetzte Kreuze stehen; zurück geht es nur über den Verlauf.
              const disabled = locked || marked || mode === 'locked'
              return (
                <button
                  key={colIndex}
                  className={`cell${marked ? ' marked' : ''}${locked ? ' locked' : ''}`}
                  disabled={disabled}
                  onClick={() => onMark(rowIndex, colIndex)}
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
            className={`bonus-slot${isYellowDiagonalComplete(player) ? ' done' : ''}`}
            title="Bonus für die Diagonale 3–1–2–6"
          >
            <BonusChip bonus={YELLOW_DIAGONAL_BONUS} />
          </span>
        </div>
      </div>
    </section>
  )
}
