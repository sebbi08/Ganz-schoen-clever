import { SUPPLY_BONUSES } from '../game/layout'
import { earnedBonuses } from '../game/scoring'
import type { PlayerState } from '../game/types'
import { SupplyTrack } from './SupplyTrack'

interface Props {
  player: PlayerState
  onUse: (sourceId: string) => void
}

/**
 * Der Vorrat an Wiederholungswürfen und +1. Farbboni tauchen hier nicht
 * auf – die werden sofort verarbeitet.
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
    </div>
  )
}
