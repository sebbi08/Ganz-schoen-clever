import { scoreSheet } from '../game/scoring'
import type { PlayerState } from '../game/types'

interface Props {
  players: PlayerState[]
  activePlayer: number
  onSelect: (index: number) => void
  onRename: (index: number, name: string) => void
  onAdd: () => void
  onRemove: (index: number) => void
}

export function PlayerTabs({ players, activePlayer, onSelect, onRename, onAdd, onRemove }: Props) {
  return (
    <div className="players">
      {players.map((player, index) => {
        const active = index === activePlayer
        return (
          <div
            key={player.id}
            className={`player-tab${active ? ' active' : ''}`}
            onClick={() => onSelect(index)}
          >
            {active ? (
              <input
                value={player.name}
                onChange={(event) => onRename(index, event.target.value)}
                aria-label="Spielername"
              />
            ) : (
              <span>{player.name}</span>
            )}
            <span className="score">{scoreSheet(player).total}</span>
            {active && players.length > 1 && (
              <button
                style={{ background: 'none', border: 'none', color: 'var(--muted)', padding: 0 }}
                title="Spieler entfernen"
                onClick={(event) => {
                  event.stopPropagation()
                  onRemove(index)
                }}
              >
                ✕
              </button>
            )}
          </div>
        )
      })}
      {players.length < 6 && (
        <button className="btn ghost" onClick={onAdd}>
          + Spieler
        </button>
      )}
    </div>
  )
}
