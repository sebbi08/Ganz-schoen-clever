import { BONUSES, SUPPLY_SLOTS } from '../game/layout'
import type { BonusId } from '../game/layout'
import type { EarnedBonus } from '../game/types'
import { BonusChip } from './BonusChip'

interface Props {
  bonus: BonusId
  /** Alle erhaltenen Boni dieser Art. */
  entries: EarnedBonus[]
  used: Set<string>
  onUse: (sourceId: string) => void
}

/**
 * Vorratsleiste wie auf dem Originalblock: Jeder erhaltene Bonus füllt einen
 * Kreis, ein Klick hakt ihn beim Einlösen ab. Eingelöste rutschen nach
 * vorn, damit die offenen zusammenhängend am Ende stehen.
 */
export function SupplyTrack({ bonus, entries, used, onUse }: Props) {
  const info = BONUSES[bonus]
  const done = entries.filter((entry) => used.has(entry.sourceId))
  const open = entries.filter((entry) => !used.has(entry.sourceId))
  const sorted = [...done, ...open]
  // Der Block hat acht Kreise; mehr werden angehängt, statt verloren zu gehen.
  const slots = Math.max(SUPPLY_SLOTS, sorted.length)

  return (
    <div className="supply-track">
      <BonusChip bonus={bonus} />
      <div className="supply-slots">
        {Array.from({ length: slots }, (_, index) => {
          const entry = sorted[index]
          if (!entry) {
            return <span key={`empty-${index}`} className="slot" aria-hidden />
          }
          const isUsed = used.has(entry.sourceId)
          return (
            <button
              key={entry.sourceId}
              className={`slot filled${isUsed ? ' used' : ''}`}
              disabled={isUsed}
              onClick={() => onUse(entry.sourceId)}
              title={`${entry.origin}${isUsed ? ' · eingelöst' : ' · zum Einlösen abhaken'}`}
              aria-label={`${info.label} ${index + 1}${isUsed ? ', eingelöst' : ', offen'}`}
            />
          )
        })}
      </div>
      <strong className="supply-count" title="noch offen">
        {open.length}
      </strong>
    </div>
  )
}
