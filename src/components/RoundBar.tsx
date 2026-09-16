import { ROUNDS, roundsFor } from '../game/layout'
import { BonusChip } from './BonusChip'

interface Props {
  round: number
  playerCount: number
  onSelectRound: (round: number) => void
  onClaimBonus: (roundNumber: number) => void
}

export function RoundBar({ round, playerCount, onSelectRound, onClaimBonus }: Props) {
  const total = roundsFor(playerCount)

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
              className={`round${number === round ? ' current' : ''}`}
              onClick={() => onSelectRound(number)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => event.key === 'Enter' && onSelectRound(number)}
            >
              <span className="no">{number}</span>
              {info.bonus ? (
                <button
                  style={{ background: 'none', border: 'none', padding: 0 }}
                  title="Rundenbonus dem aktiven Spieler gutschreiben"
                  onClick={(event) => {
                    event.stopPropagation()
                    onClaimBonus(number)
                  }}
                >
                  <BonusChip bonus={info.bonus} small />
                </button>
              ) : (
                <span className="hint">–</span>
              )}
            </div>
          )
        })}
        <button className="btn" onClick={() => onSelectRound(Math.min(total, round + 1))}>
          Runde weiter →
        </button>
      </div>
    </div>
  )
}
