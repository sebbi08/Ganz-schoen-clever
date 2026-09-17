import { BLUE_COLUMN_BONUS, BLUE_GRID, BLUE_POINTS, BLUE_ROW_BONUS } from '../game/layout'
import { blueMarkCount, isBlueGap } from '../game/scoring'
import type { AreaMode } from '../game/bonuses'
import type { PlayerState } from '../game/types'
import { BonusChip } from './BonusChip'

interface Props {
  player: PlayerState
  points: number
  mode: AreaMode
  onToggle: (row: number, col: number) => void
}

export function BlueArea({ player, points, mode, onToggle }: Props) {
  const count = blueMarkCount(player)

  return (
    <section className={`area blue${mode === 'pick' ? ' picking' : ''}${mode === 'locked' ? ' locked' : ''}`}>
      <div className="area-head">
        <span>Blau – Punkte nach Anzahl der Kreuze</span>
        <span className="points">{points}</span>
      </div>

      <div className="blue-track">
        {BLUE_POINTS.slice(1).map((value, index) => (
          <div key={value} className={count >= index + 1 ? 'reached' : ''} title={`${index + 1} Kreuze`}>
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
                  onClick={() => onToggle(rowIndex, colIndex)}
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
              <div key={col} style={{ textAlign: 'center', opacity: done ? 1 : 0.45 }}>
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
