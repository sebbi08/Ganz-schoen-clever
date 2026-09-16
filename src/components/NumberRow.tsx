import { useState } from 'react'
import type { BonusId } from '../game/layout'
import { lastFilledIndex, nextFreeIndex } from '../game/scoring'
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
  locked: boolean
  /** Setzt einen Wert; `null` leert das Feld und alle dahinter. */
  onSet: (index: number, value: number | null) => void
}

/** Gemeinsame Darstellung der orangen und der lila Reihe. */
export function NumberRow({
  color,
  label,
  title,
  points,
  values,
  bonuses,
  multipliers,
  locked,
  onSet,
}: Props) {
  // null = automatisch das nächste freie Feld
  const [selected, setSelected] = useState<number | null>(null)
  const next = nextFreeIndex(values)
  const last = lastFilledIndex(values)
  const target = selected ?? next
  const targetMultiplier = target === null ? 1 : (multipliers?.[target] ?? 1)

  function write(value: number) {
    if (target === null) return
    onSet(target, value)
    setSelected(null)
  }

  return (
    <section className={`area ${color}${locked ? ' locked' : ''}`}>
      <div className="area-head">
        <span>{title}</span>
        <span className="points">{points}</span>
      </div>

      <div className="track">
        {values.map((value, index) => {
          const multiplier = multipliers?.[index] ?? 1
          // Anwählbar sind gefüllte Felder und das nächste freie.
          const selectable = value !== null || index === next
          return (
            <div className="track-cell" key={index}>
              <span className="mult">{multiplier > 1 ? `×${multiplier}` : ''}</span>
              <button
                className={`cell${index === target ? ' next' : ''}`}
                disabled={locked || !selectable}
                onClick={() => setSelected(index === selected ? null : index)}
                aria-label={`${label} Feld ${index + 1}`}
              >
                {value ?? ''}
              </button>
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
              {values[target] !== null && ' überschreiben'}
            </>
          )}
        </span>
        {[1, 2, 3, 4, 5, 6].map((value) => (
          <button
            key={value}
            className="value-btn"
            disabled={locked || target === null}
            onClick={() => write(value)}
            aria-label={`${label}: ${value} eintragen`}
          >
            {value}
          </button>
        ))}
        <button
          className="btn ghost"
          disabled={locked || last === null}
          onClick={() => {
            if (last === null) return
            onSet(selected !== null && values[selected] !== null ? selected : last, null)
            setSelected(null)
          }}
          title="Letzten Eintrag zurücknehmen"
        >
          ⌫
        </button>
      </div>
    </section>
  )
}
