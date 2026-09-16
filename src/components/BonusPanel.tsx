import { ALL_BONUS_IDS, BONUSES, SUPPLY_BONUSES } from '../game/layout'
import type { BonusId } from '../game/layout'
import { earnedBonuses, openBonuses } from '../game/scoring'
import type { PlayerState } from '../game/types'
import { BonusChip } from './BonusChip'
import { SupplyTrack } from './SupplyTrack'

interface Props {
  player: PlayerState
  onToggleUsed: (sourceId: string) => void
  onAddManual: (bonus: BonusId) => void
  onRemoveManual: (id: string) => void
}

export function BonusPanel({ player, onToggleUsed, onAddManual, onRemoveManual }: Props) {
  const earned = earnedBonuses(player)
  const used = new Set(player.usedBonuses)
  // Farbboni laufen sofort durch, hier bleibt nur der Vorrat übrig.
  const other = openBonuses(player).filter(
    (entry) => !(SUPPLY_BONUSES as readonly BonusId[]).includes(entry.bonus),
  )
  const isManual = (sourceId: string) => player.manualBonuses.some((m) => m.id === sourceId)

  return (
    <div className="panel">
      <h2>Vorrat</h2>

      {SUPPLY_BONUSES.map((bonus) => (
        <SupplyTrack
          key={bonus}
          bonus={bonus}
          entries={earned.filter((entry) => entry.bonus === bonus)}
          used={used}
          onToggle={onToggleUsed}
        />
      ))}

      {other.length > 0 && (
        <div className="bonus-list" style={{ marginTop: 10 }}>
          {other.map((entry) => (
            <div
              className="bonus-row"
              key={entry.sourceId}
              role="button"
              tabIndex={0}
              title="Als eingelöst abhaken"
              onClick={() => onToggleUsed(entry.sourceId)}
              onKeyDown={(event) => event.key === 'Enter' && onToggleUsed(entry.sourceId)}
            >
              <BonusChip bonus={entry.bonus} />
              <span className="label">
                {BONUSES[entry.bonus].label}
                <span className="origin">{entry.origin}</span>
              </span>
              {isManual(entry.sourceId) && (
                <button
                  className="tick"
                  onClick={(event) => {
                    event.stopPropagation()
                    onRemoveManual(entry.sourceId)
                  }}
                  title="Eintrag entfernen"
                  style={{ background: 'none', border: 'none' }}
                >
                  ✕
                </button>
              )}
              <span className="tick" aria-hidden>
                ▢
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="add-bonus">
        <span className="empty-hint" style={{ width: '100%' }}>
          Bonus von Hand gutschreiben:
        </span>
        {ALL_BONUS_IDS.map((bonus) => (
          <button
            key={bonus}
            className="chip-btn"
            onClick={() => onAddManual(bonus)}
            title={BONUSES[bonus].label}
            aria-label={`${BONUSES[bonus].label} gutschreiben`}
          >
            <BonusChip bonus={bonus} />
          </button>
        ))}
      </div>
    </div>
  )
}
