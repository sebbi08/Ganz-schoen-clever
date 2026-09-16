import { GREEN_POINTS, GREEN_STEPS } from '../game/layout'
import type { PlayerState } from '../game/types'
import { BonusChip } from './BonusChip'

interface Props {
  player: PlayerState
  points: number
  onSet: (count: number) => void
}

export function GreenRow({ player, points, onSet }: Props) {
  return (
    <section className="area green">
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
                // Klick auf ein gefülltes Feld nimmt alles ab dort zurück.
                onClick={() => onSet(marked ? index : index + 1)}
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
