import type { BonusId } from '../game/layout'
import type { AreaMode } from '../game/bonuses'
import { nextFreeIndex } from '../game/scoring'
import { BonusChip } from './BonusChip'

interface Props {
  color: 'orange' | 'purple'
  /** Kurzname für Beschriftungen, z. B. "Orange". */
  label: string
  title: string
  points: number
  values: (number | null)[]
  bonuses: (BonusId | undefined)[]
  multipliers?: (1 | 2 | 3)[]
  mode: AreaMode
  onSet: (index: number, value: number) => void
}

/**
 * Orange und Lila teilen sich diese Darstellung. Geschrieben wird immer in
 * das nächste freie Feld – ein Eintrag steht, korrigiert wird über den
 * Verlauf.
 */
export function NumberRow({
  color,
  label,
  title,
  points,
  values,
  bonuses,
  multipliers,
  mode,
  onSet,
}: Props) {
  const locked = mode === 'locked'
  // Bei der Auswahl "Kreuz oder 6" ist hier nur die 6 erlaubt.
  const onlySix = mode === 'pick'
  const target = nextFreeIndex(values)
  const targetMultiplier = target === null ? 1 : (multipliers?.[target] ?? 1)

  return (
    <section className={`area ${color}${locked ? ' locked' : ''}${onlySix ? ' picking' : ''}`}>
      <div className="area-head">
        <span>{title}</span>
        <span className="points">{points}</span>
      </div>

      <div className="track">
        {values.map((value, index) => {
          const multiplier = multipliers?.[index] ?? 1
          return (
            <div className="track-cell" key={index}>
              <span className="mult">{multiplier > 1 ? `×${multiplier}` : ''}</span>
              <div
                className={`cell${index === target ? ' next' : ''}`}
                title={`${label} Feld ${index + 1}`}
              >
                {value ?? ''}
              </div>
              <span className="below">
                {bonuses[index] && <BonusChip bonus={bonuses[index]!} small />}
              </span>
            </div>
          )
        })}
      </div>

      <div className="value-bar">
        <span className="value-bar-label">
          {target === null ? (
            'Reihe ist voll'
          ) : (
            <>
              Feld {target + 1}
              {targetMultiplier > 1 && <b> ×{targetMultiplier}</b>}
            </>
          )}
        </span>
        {[1, 2, 3, 4, 5, 6].map((value) => (
          <button
            key={value}
            className="value-btn"
            disabled={locked || target === null || (onlySix && value !== 6)}
            onClick={() => target !== null && onSet(target, value)}
            aria-label={`${label}: ${value} eintragen`}
          >
            {value}
          </button>
        ))}
      </div>
    </section>
  )
}
