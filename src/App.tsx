import { useEffect, useReducer } from 'react'
import { ORANGE_STEPS, PURPLE_STEPS, ROUNDS } from './game/layout'
import type { BonusId } from './game/layout'
import { scoreSheet } from './game/scoring'
import { createGame, loadGame, reducer, saveGame } from './game/state'
import { BlueArea } from './components/BlueArea'
import { BonusPanel } from './components/BonusPanel'
import { GreenRow } from './components/GreenRow'
import { NumberRow } from './components/NumberRow'
import { PlayerTabs } from './components/PlayerTabs'
import { RoundBar } from './components/RoundBar'
import { ScorePanel } from './components/ScorePanel'
import { YellowArea } from './components/YellowArea'

const ORANGE_BONUSES = ORANGE_STEPS.map((step) => step.bonus)
const ORANGE_MULTIPLIERS = ORANGE_STEPS.map((step) => step.multiplier)
const PURPLE_BONUSES = PURPLE_STEPS.map((step) => step.bonus)

export default function App() {
  const [state, dispatch] = useReducer(reducer, null, () => loadGame() ?? createGame(1))
  const player = state.players[state.activePlayer]
  const score = scoreSheet(player)

  useEffect(() => saveGame(state), [state])

  /** Ein geleertes Feld nimmt auch alle Felder dahinter zurück. */
  function setRowValue(row: 'orange' | 'purple', index: number, value: number | null) {
    const type = row === 'orange' ? ('setOrange' as const) : ('setPurple' as const)
    if (value !== null) {
      dispatch({ type, index, value })
      return
    }
    for (let i = player[row].length - 1; i >= index; i--) {
      if (player[row][i] !== null) dispatch({ type, index: i, value: null })
    }
  }

  function addManual(bonus: BonusId, origin = 'Von Hand ergänzt') {
    dispatch({ type: 'addManualBonus', bonus, origin })
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Ganz schön clever · Punkteblock</h1>
        <p>Kreuze setzen, Punkte laufen mit, Boni bleiben im Blick.</p>
      </header>

      <PlayerTabs
        players={state.players}
        activePlayer={state.activePlayer}
        onSelect={(index) => dispatch({ type: 'selectPlayer', index })}
        onRename={(index, name) => dispatch({ type: 'renamePlayer', index, name })}
        onAdd={() => dispatch({ type: 'addPlayer' })}
        onRemove={(index) => dispatch({ type: 'removePlayer', index })}
      />

      <RoundBar
        round={state.round}
        playerCount={state.players.length}
        onSelectRound={(round) => dispatch({ type: 'setRound', round })}
        onClaimBonus={(roundNumber) => {
          const bonus = ROUNDS[roundNumber - 1]?.bonus
          if (bonus) addManual(bonus, `Rundenbonus ${roundNumber}`)
        }}
      />

      <div className="columns">
        <main style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="grids">
            <YellowArea
              player={player}
              points={score.yellow}
              onToggle={(row, col) => dispatch({ type: 'toggleYellow', row, col })}
            />
            <BlueArea
              player={player}
              points={score.blue}
              onToggle={(row, col) => dispatch({ type: 'toggleBlue', row, col })}
            />
          </div>

          <GreenRow
            player={player}
            points={score.green}
            onSet={(count) => dispatch({ type: 'setGreen', count })}
          />

          <NumberRow
            color="orange"
            label="Orange"
            title="Orange – Würfelwert eintragen, ×2 und ×3 beachten"
            points={score.orange}
            values={player.orange}
            bonuses={ORANGE_BONUSES}
            multipliers={ORANGE_MULTIPLIERS}
            onSet={(index, value) => setRowValue('orange', index, value)}
          />

          <NumberRow
            color="purple"
            label="Lila"
            title="Lila – jeder Wert höher als der vorige, nach einer 6 wieder frei"
            points={score.purple}
            values={player.purple}
            bonuses={PURPLE_BONUSES}
            onSet={(index, value) => setRowValue('purple', index, value)}
          />
        </main>

        <aside className="sidebar">
          <ScorePanel score={score} />
          <BonusPanel
            player={player}
            onToggleUsed={(sourceId) => dispatch({ type: 'toggleBonusUsed', sourceId })}
            onAddManual={(bonus) => addManual(bonus)}
            onRemoveManual={(id) => dispatch({ type: 'removeManualBonus', id })}
          />
        </aside>
      </div>

      <footer className="footer">
        <span>Der Spielstand wird im Browser gespeichert.</span>
        <span style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn danger"
            onClick={() => {
              if (confirm('Alle Blöcke leeren? Die Spieler bleiben erhalten.')) {
                dispatch({ type: 'resetSheets' })
              }
            }}
          >
            Blöcke leeren
          </button>
          <button
            className="btn danger"
            onClick={() => {
              if (confirm('Neues Spiel starten? Der aktuelle Stand geht verloren.')) {
                dispatch({ type: 'newGame', playerCount: state.players.length })
              }
            }}
          >
            Neues Spiel
          </button>
        </span>
      </footer>
    </div>
  )
}
