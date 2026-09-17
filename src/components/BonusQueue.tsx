import { BONUSES } from '../game/layout'
import type { EarnedBonus } from '../game/types'
import { BonusChip } from './BonusChip'

interface Props {
  queue: EarnedBonus[]
  onResolve: (sourceId: string) => void
}

/**
 * Mehrere Boni wurden im selben Zug freigeschaltet. Welcher zuerst
 * ausgeführt wird, entscheidet der Spieler – so steht es in der Regel, und
 * gelegentlich hängt das Ergebnis daran.
 */
export function BonusQueue({ queue, onResolve }: Props) {
  return (
    <div className="choice-banner neutral queue" role="alert">
      <span className="choice-dot" />
      <span className="choice-text">
        <strong>Reihenfolge wählen</strong>
        <span>
          {queue.length} Boni auf einmal · Der angeklickte kommt zuerst, der Block ist bis dahin
          gesperrt.
        </span>
      </span>
      <div className="queue-options">
        {queue.map((entry) => {
          const info = BONUSES[entry.bonus]
          return (
            <button
              key={entry.sourceId}
              className="btn queue-option"
              onClick={() => onResolve(entry.sourceId)}
              title={`${info.label} zuerst ausführen`}
            >
              <BonusChip bonus={entry.bonus} small />
              <span className="queue-label">
                {info.label}
                <span className="origin">{entry.origin}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
