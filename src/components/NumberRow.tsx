import { useState } from 'react'
import type { BonusId } from '../game/layout'
import { nextFreeIndex } from '../game/scoring'
import { BonusChip } from './BonusChip'
import { ValuePicker } from './ValuePicker'

interface Props {
  color: 'orange' | 'purple'
  /** Kurzname für Beschriftungen, z. B. "Orange". */
  label: string
  title: string
  points: number
  values: (number | null)[]
  bonuses: (BonusId | undefined)[]
  multipliers?: (1 | 2 | 3)[]
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
  onSet,
}: Props) {
  const [open, setOpen] = useState<number | null>(null)
  const next = nextFreeIndex(values)

  return (
    <section className={`area ${color}`}>
      <div className="area-head">
        <span>{title}</span>
        <span className="points">{points}</span>
      </div>

      <div className="track">
        {values.map((value, index) => {
          const multiplier = multipliers?.[index] ?? 1
          const editable = value !== null || index === next
          return (
            <div className="track-cell" key={index}>
              <span className="mult">{multiplier > 1 ? `×${multiplier}` : ''}</span>
              <button
                className={`cell${index === next ? ' next' : ''}`}
                disabled={!editable}
                onClick={() => setOpen(open === index ? null : index)}
                aria-label={`${label} Feld ${index + 1}`}
              >
                {value ?? ''}
              </button>
              {open === index && (
                <ValuePicker
                  onPick={(picked) => {
                    onSet(index, picked)
                    setOpen(null)
                  }}
                  onClear={
                    value !== null
                      ? () => {
                          onSet(index, null)
                          setOpen(null)
                        }
                      : undefined
                  }
                  onClose={() => setOpen(null)}
                />
              )}
              <span className="below">
                {bonuses[index] && <BonusChip bonus={bonuses[index]!} small />}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
