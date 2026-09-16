import { useState } from 'react'
import { ALL_BONUS_IDS, BONUSES } from '../game/layout'
import type { BonusId } from '../game/layout'
import { earnedBonuses, openBonuses } from '../game/scoring'
import type { EarnedBonus, PlayerState } from '../game/types'
import { BonusChip } from './BonusChip'

interface Props {
  player: PlayerState
  onToggleUsed: (sourceId: string) => void
  onAddManual: (bonus: BonusId) => void
  onRemoveManual: (id: string) => void
}

function countOf(list: EarnedBonus[], bonus: BonusId): number {
  return list.filter((entry) => entry.bonus === bonus).length
}

export function BonusPanel({ player, onToggleUsed, onAddManual, onRemoveManual }: Props) {
  const [showUsed, setShowUsed] = useState(false)
  const open = openBonuses(player)
  const used = new Set(player.usedBonuses)
  const done = earnedBonuses(player).filter(
    (entry) => entry.bonus !== 'fox' && used.has(entry.sourceId),
  )
  const isManual = (sourceId: string) => player.manualBonuses.some((m) => m.id === sourceId)

  return (
    <div className="panel">
      <h2>Offene Boni</h2>

      <div className="supply">
        <div className="supply-item">
          <BonusChip bonus="reroll" />
          Wurf
          <strong>{countOf(open, 'reroll')}</strong>
        </div>
        <div className="supply-item">
          <BonusChip bonus="plus1" />
          Plus
          <strong>{countOf(open, 'plus1')}</strong>
        </div>
      </div>

      {open.length === 0 ? (
        <p className="empty-hint">Nichts offen – alle Boni eingelöst.</p>
      ) : (
        <div className="bonus-list">
          {open.map((entry) => (
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

      {done.length > 0 && (
        <button
          className="btn ghost"
          style={{ marginTop: 10, width: '100%' }}
          onClick={() => setShowUsed((value) => !value)}
        >
          {done.length} eingelöst {showUsed ? '▲' : '▼'}
        </button>
      )}

      {showUsed && (
        <div className="bonus-list" style={{ marginTop: 8, opacity: 0.6 }}>
          {done.map((entry) => (
            <button
              className="bonus-row"
              key={entry.sourceId}
              onClick={() => onToggleUsed(entry.sourceId)}
              title="Wieder als offen markieren"
            >
              <BonusChip bonus={entry.bonus} />
              <span className="label">
                {BONUSES[entry.bonus].label}
                <span className="origin">{entry.origin}</span>
              </span>
              <span className="tick" aria-hidden>
                ☑
              </span>
            </button>
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
            className="chip"
            style={{ cursor: 'pointer' }}
            onClick={() => onAddManual(bonus)}
            title={BONUSES[bonus].label}
          >
            <BonusChip bonus={bonus} />
          </button>
        ))}
      </div>
    </div>
  )
}
