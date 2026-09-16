import { ROUNDS, roundsFor } from '../game/layout'
import { BonusChip } from './BonusChip'

interface Props {
  round: number
  playerCount: number
  claimedRounds: number[]
  onSelectRound: (round: number) => void
  onComplete: () => void
}

export function RoundBar({ round, playerCount, claimedRounds, onSelectRound, onComplete }: Props) {
  const total = roundsFor(playerCount)
  const bonus = ROUNDS[round - 1]?.bonus
  const claimed = claimedRounds.includes(round)

  return (
    <div className="panel">
      <h2>
        Runde {round} von {total}
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
            ? `Runde ${round} abschließen – Bonus für alle →`
            : `Runde ${round} abschließen →`}
        </button>
      </div>
    </div>
  )
}
