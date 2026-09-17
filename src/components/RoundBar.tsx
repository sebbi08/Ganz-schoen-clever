import { ROUNDS, roundsFor } from '../game/layout'
import { BonusChip } from './BonusChip'

interface Props {
  round: number
  /** Die letzte Runde ist abgerechnet. */
  finished: boolean
  /** Wie viele am Tisch sitzen – bestimmt allein die Rundenzahl. */
  tableSize: number
  claimedRounds: number[]
  onComplete: () => void
  onFinish: () => void
}

export function RoundBar({
  round,
  finished,
  tableSize,
  claimedRounds,
  onComplete,
  onFinish,
}: Props) {
  const total = roundsFor(tableSize)
  const lastRound = round >= total
  // Der Bonus der nächsten Runde gibt es beim Abschließen dieser Runde.
  const nextBonus = ROUNDS[round]?.bonus

  return (
    <div className="panel">
      <h2>
        Runde {round} von {total}
        <span className="table-size">
          {tableSize} {tableSize === 1 ? 'Spieler' : 'Spieler am Tisch'}
        </span>
      </h2>
      <div className="rounds">
        {ROUNDS.slice(0, total).map((info, index) => {
          const number = index + 1
          // Angefangene Runden bekommen ihren Haken – auch die ohne Bonus.
          const done = number <= round
          return (
            <div
              key={number}
              className={`round${number === round ? ' current' : ''}${done ? ' done' : ''}`}
              title={claimedRounds.includes(number) ? 'Bonus erhalten' : undefined}
            >
              <span className="no">{number}</span>
              {info.bonus ? (
                <BonusChip bonus={info.bonus} small />
              ) : (
                <span className="hint">–</span>
              )}
            </div>
          )
        })}
        <button
          className="btn round-done"
          onClick={lastRound ? onFinish : onComplete}
          disabled={finished}
        >
          {finished ? (
            'Spiel beendet'
          ) : lastRound ? (
            'Spiel beenden – Endwertung'
          ) : (
            <>
              Runde {round + 1} beginnen →
              {nextBonus && (
                <>
                  {' '}
                  <BonusChip bonus={nextBonus} small />
                </>
              )}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
