import { ROUNDS, roundsFor } from '../game/layout'
import { BonusChip } from './BonusChip'

interface Props {
  round: number
  /** Die letzte Runde ist abgerechnet. */
  finished: boolean
  /** Wie viele am Tisch sitzen – bestimmt allein die Rundenzahl. */
  tableSize: number
  claimedRounds: number[]
  onSetTableSize: (size: number) => void
  onComplete: () => void
  onFinish: () => void
}

export function RoundBar({
  round,
  finished,
  tableSize,
  claimedRounds,
  onSetTableSize,
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
          Am Tisch:
          {[1, 2, 3, 4].map((size) => (
            <button
              key={size}
              className={`size-btn${size === tableSize ? ' active' : ''}`}
              onClick={() => onSetTableSize(size)}
              title={`${size} Spieler → ${roundsFor(size)} Runden`}
            >
              {size}
            </button>
          ))}
        </span>
      </h2>
      <div className="rounds">
        {ROUNDS.slice(0, total).map((info, index) => {
          const number = index + 1
          return (
            <div
              key={number}
              className={`round${number === round ? ' current' : ''}${
                claimedRounds.includes(number) ? ' claimed' : ''
              }`}
              title={claimedRounds.includes(number) ? 'Bonus schon erhalten' : undefined}
            >
              <span className="no">{number}</span>
              {info.bonus ? <BonusChip bonus={info.bonus} small /> : <span className="hint">–</span>}
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
