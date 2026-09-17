import { BLUE_COLUMN_BONUS, BLUE_GRID, BLUE_POINTS, BLUE_ROW_BONUS } from '../game/layout'
import { blueMarkCount, isBlueGap } from '../game/scoring'
import type { AreaMode } from '../game/bonuses'
import type { PlayerState } from '../game/types'
import { AreaHead } from './AreaHead'
import { BonusChip } from './BonusChip'

interface Props {
  player: PlayerState
  points: number
  weakest: boolean
  foxes: number
  mode: AreaMode
  onMark: (row: number, col: number) => void
}

export function BlueArea({ player, points, weakest, foxes, mode, onMark }: Props) {
  const count = blueMarkCount(player)

  return (
    <section
      className={`area blue${mode === 'pick' ? ' picking' : ''}${mode === 'locked' ? ' locked' : ''}`}
    >
      <AreaHead
        text="Blau – Punkte nach Anzahl der Kreuze"
        points={points}
        weakest={weakest}
        foxes={foxes}
      />

      <div className="blue-track">
        {BLUE_POINTS.slice(1).map((value, index) => (
          <div
            key={value}
            className={count >= index + 1 ? 'reached' : ''}
            title={`${index + 1} Kreuze`}
          >
            {value}
          </div>
        ))}
      </div>

      <div className="grid">
        {BLUE_GRID.map((row, rowIndex) => (
          <div className="grid-row" key={rowIndex}>
            {row.map((value, colIndex) => {
              if (isBlueGap(rowIndex, colIndex)) {
                return <div key={colIndex} className="cell empty" aria-hidden />
              }
              const marked = player.blue[rowIndex][colIndex]
              const disabled = marked || mode === 'locked'
              return (
                <button
                  key={colIndex}
                  className={`cell${marked ? ' marked' : ''}`}
                  disabled={disabled}
                  onClick={() => onMark(rowIndex, colIndex)}
                  aria-label={`Blau ${value}`}
                  aria-pressed={marked}
                >
                  {value}
                </button>
              )
            })}
            <BonusChip bonus={BLUE_ROW_BONUS[rowIndex]} />
          </div>
        ))}

        <div className="grid-foot">
          {BLUE_COLUMN_BONUS.map((bonus, col) => {
            const done = player.blue.every((row, rowIndex) => isBlueGap(rowIndex, col) || row[col])
            return (
              <div key={col} className={`bonus-slot${done ? ' done' : ''}`}>
                <BonusChip bonus={bonus} />
              </div>
            )
          })}
          <span />
        </div>
      </div>
    </section>
  )
}
