import { ROUNDS, roundsFor } from '../game/layout'
import { BonusChip } from './BonusChip'

interface Props {
  round: number
  /** Wie viele am Tisch sitzen – bestimmt allein die Rundenzahl. */
  tableSize: number
  claimedRounds: number[]
  onSelectRound: (round: number) => void
  onSetTableSize: (size: number) => void
  onComplete: () => void
}

export function RoundBar({
  round,
  tableSize,
  claimedRounds,
  onSelectRound,
  onSetTableSize,
  onComplete,
}: Props) {
  const total = roundsFor(tableSize)
  const bonus = ROUNDS[round - 1]?.bonus
  const claimed = claimedRounds.includes(round)

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
              title={claimedRounds.includes(number) ? 'Bonus verteilt' : undefined}
              onClick={() => onSelectRound(number)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => event.key === 'Enter' && onSelectRound(number)}
            >
              <span className="no">{number}</span>
              {info.bonus ? <BonusChip bonus={info.bonus} small /> : <span className="hint">–</span>}
            </div>
          )
        })}
        <button className="btn round-done" onClick={onComplete} disabled={round >= total && claimed}>
          {bonus && !claimed
            ? `Runde ${round} abschließen – Bonus kassieren →`
            : `Runde ${round} abschließen →`}
        </button>
      </div>
    </div>
  )
}
