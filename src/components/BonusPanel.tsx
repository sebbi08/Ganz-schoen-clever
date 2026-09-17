import { SUPPLY_BONUSES } from '../game/layout'
import { earnedBonuses, foxCount } from '../game/scoring'
import type { PlayerState } from '../game/types'
import { BonusChip } from './BonusChip'
import { SupplyTrack } from './SupplyTrack'

interface Props {
  player: PlayerState
  onUse: (sourceId: string) => void
}

/**
 * Der Vorrat an Wiederholungswürfen und Zusatzwürfeln. Farbboni tauchen hier
 * nicht auf – die werden sofort verarbeitet. Die Füchse stehen daneben: Sie
 * werden nicht eingelöst, aber man will wissen, wie viele man hat.
 */
export function BonusPanel({ player, onUse }: Props) {
  const earned = earnedBonuses(player)
  const used = new Set(player.usedBonuses)

  return (
    <div className="panel">
      <h2>Vorrat</h2>
      {SUPPLY_BONUSES.map((bonus) => (
        <SupplyTrack
          key={bonus}
          bonus={bonus}
          entries={earned.filter((entry) => entry.bonus === bonus)}
          used={used}
          onUse={onUse}
        />
      ))}

      <div className="supply-track fox-track">
        <BonusChip bonus="fox" />
        <span className="fox-label">Füchse</span>
        <strong className="supply-count" title="gesammelte Füchse">
          {foxCount(player)}
        </strong>
      </div>
    </div>
  )
}
