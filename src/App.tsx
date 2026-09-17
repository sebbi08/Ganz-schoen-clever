import { useCallback, useEffect, useReducer } from 'react'
import { ORANGE_STEPS, PURPLE_STEPS } from './game/layout'
import { areaMode } from './game/bonuses'
import { scoreSheet } from './game/scoring'
import { createHistory, historyReducer, loadHistory, saveHistory } from './game/history'
import { BlueArea } from './components/BlueArea'
import { BonusPanel } from './components/BonusPanel'
import { ChoiceBanner } from './components/ChoiceBanner'
import { GreenRow } from './components/GreenRow'
import { HistoryPanel } from './components/HistoryPanel'
import { NumberRow } from './components/NumberRow'
import { RoundBar } from './components/RoundBar'
import { ScorePanel } from './components/ScorePanel'
import { Toasts } from './components/Toasts'
import { YellowArea } from './components/YellowArea'

const ORANGE_BONUSES = ORANGE_STEPS.map((step) => step.bonus)
const ORANGE_MULTIPLIERS = ORANGE_STEPS.map((step) => step.multiplier)
const PURPLE_BONUSES = PURPLE_STEPS.map((step) => step.bonus)

export default function App() {
  const [history, dispatch] = useReducer(historyReducer, null, () => loadHistory() ?? createHistory(1))
  const state = history.present
  const player = state.player
  const score = scoreSheet(player)
  const choice = state.pendingChoices[0] ?? null

  const undo = useCallback((steps: number) => dispatch({ type: 'undo', steps }), [])
  const redo = useCallback((steps: number) => dispatch({ type: 'redo', steps }), [])
  const dismiss = useCallback((id: string) => dispatch({ type: 'dismissNotification', id }), [])

  useEffect(() => saveHistory(history), [history])

  // Strg+Z / Cmd+Z nimmt den letzten Zug zurück.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return
      event.preventDefault()
      // Umschalt dazu wiederholt, wie überall sonst auch.
      if (event.shiftKey) redo(1)
      else undo(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Ganz schön clever · Punkteblock</h1>
          <p>Ein Block pro Gerät – Mitspieler öffnen die Seite selbst.</p>
        </div>
        <div className="total-badge" title="Gesamtpunkte">
          {score.total}
        </div>
      </header>

      {choice && (
        <ChoiceBanner
          choice={choice}
          remaining={state.pendingChoices.length}
          onSkip={() => dispatch({ type: 'skipChoice' })}
        />
      )}

      <RoundBar
        round={state.round}
        tableSize={state.tableSize}
        claimedRounds={state.claimedRounds}
        onSetTableSize={(size) => dispatch({ type: 'setTableSize', size })}
        onComplete={() => dispatch({ type: 'completeRound' })}
      />

      <BonusPanel player={player} onUse={(sourceId) => dispatch({ type: 'useBonus', sourceId })} />

      <div className="columns">
        <main style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="grids">
            <YellowArea
              player={player}
              points={score.yellow}
              mode={areaMode(choice, 'yellow')}
              onToggle={(row, col) => dispatch({ type: 'toggleYellow', row, col })}
            />
            <BlueArea
              player={player}
              points={score.blue}
              mode={areaMode(choice, 'blue')}
              onToggle={(row, col) => dispatch({ type: 'toggleBlue', row, col })}
            />
          </div>

          <GreenRow
            player={player}
            points={score.green}
            mode={areaMode(choice, 'green')}
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
            mode={areaMode(choice, 'orange')}
            onSet={(index, value) => dispatch({ type: 'setOrange', index, value })}
          />

          <NumberRow
            color="purple"
            label="Lila"
            title="Lila – jeder Wert höher als der vorige, nach einer 6 wieder frei"
            points={score.purple}
            values={player.purple}
            bonuses={PURPLE_BONUSES}
            mode={areaMode(choice, 'purple')}
            onSet={(index, value) => dispatch({ type: 'setPurple', index, value })}
          />
        </main>

        <aside className="sidebar">
          <ScorePanel score={score} />
          <HistoryPanel
            past={history.past}
            future={history.future}
            onUndo={undo}
            onRedo={redo}
          />
        </aside>
      </div>

      <footer className="footer">
        <span>Der Spielstand wird im Browser gespeichert.</span>
        <button
          className="btn danger"
          onClick={() => {
            if (confirm('Neues Spiel starten? Der aktuelle Block geht verloren.')) {
              dispatch({ type: 'newGame' })
            }
          }}
        >
          Neues Spiel
        </button>
      </footer>

      <Toasts notifications={state.notifications} onDismiss={dismiss} />
    </div>
  )
}
