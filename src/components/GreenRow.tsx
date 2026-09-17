import { GREEN_POINTS, GREEN_STEPS } from '../game/layout'
import type { AreaMode } from '../game/bonuses'
import type { PlayerState } from '../game/types'
import { BonusChip } from './BonusChip'

interface Props {
  player: PlayerState
  points: number
  mode: AreaMode
  onSet: (count: number) => void
}

export function GreenRow({ player, points, mode, onSet }: Props) {
  const locked = mode === 'locked'
  return (
    <section className={`area green${locked ? ' locked' : ''}${mode === 'pick' ? ' picking' : ''}`}>
      <div className="area-head">
        <span>Grün – von links nach rechts ankreuzen</span>
        <span className="points">{points}</span>
      </div>

      <div className="track">
        {GREEN_STEPS.map((step, index) => {
          const marked = index < player.green
          return (
            <div className="track-cell" key={index}>
              <span className={`above${marked ? ' reached' : ''}`}>{GREEN_POINTS[index + 1]}</span>
              <button
                className={`cell${marked ? ' marked' : ''}${index === player.green ? ' next' : ''}`}
                // Es geht immer nur ein Feld weiter; zurück nur über den Verlauf.
                disabled={locked || index !== player.green}
                onClick={() => onSet(index + 1)}
                aria-label={`Grünes Feld ${index + 1}`}
                aria-pressed={marked}
              >
                {`≥${step.min}`}
              </button>
              <span className="below">{step.bonus && <BonusChip bonus={step.bonus} small />}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
