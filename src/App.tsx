import { useCallback, useEffect, useReducer } from 'react'
import { ORANGE_STEPS, PURPLE_STEPS } from './game/layout'
import { areaMode } from './game/bonuses'
import type { AreaMode } from './game/bonuses'
import type { Area } from './game/layout'
import { purpleAllowedValues, scoreSheet } from './game/scoring'
import { createHistory, historyReducer, loadHistory, saveHistory } from './game/history'
import { BlueArea } from './components/BlueArea'
import { BonusPanel } from './components/BonusPanel'
import { BonusQueue } from './components/BonusQueue'
import { ChoiceBanner } from './components/ChoiceBanner'
import { FinalScore } from './components/FinalScore'
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
  // Warten mehrere Boni auf ihre Reihenfolge, ist der Block ebenfalls dicht.
  const queued = state.bonusQueue.length > 0
  const modeFor = (area: Area): AreaMode => (queued ? 'locked' : areaMode(choice, area))

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

      {!choice && queued && (
        <BonusQueue
          queue={state.bonusQueue}
          onResolve={(sourceId) => dispatch({ type: 'resolveBonus', sourceId })}
        />
      )}

      {state.finished && <FinalScore score={score} solo={state.tableSize === 1} />}

      <RoundBar
        round={state.round}
        finished={state.finished}
        tableSize={state.tableSize}
        claimedRounds={state.claimedRounds}
        onSetTableSize={(size) => dispatch({ type: 'setTableSize', size })}
        onComplete={() => dispatch({ type: 'completeRound' })}
        onFinish={() => dispatch({ type: 'finishGame' })}
      />

      <BonusPanel player={player} onUse={(sourceId) => dispatch({ type: 'useBonus', sourceId })} />

      <div className="columns">
        <main className="board">
          <div className="grids">
            <YellowArea
              player={player}
              points={score.yellow}
              mode={modeFor('yellow')}
              onMark={(row, col) => dispatch({ type: 'markYellow', row, col })}
            />
            <BlueArea
              player={player}
              points={score.blue}
              mode={modeFor('blue')}
              onMark={(row, col) => dispatch({ type: 'markBlue', row, col })}
            />
          </div>

          <GreenRow
            player={player}
            points={score.green}
            mode={modeFor('green')}
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
            mode={modeFor('orange')}
            onSet={(index, value) => dispatch({ type: 'setOrange', index, value })}
          />

          <NumberRow
            color="purple"
            label="Lila"
            title="Lila – jeder Wert höher als der vorige, nach einer 6 wieder frei"
            points={score.purple}
            values={player.purple}
            bonuses={PURPLE_BONUSES}
            allowed={purpleAllowedValues(player.purple)}
            mode={modeFor('purple')}
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
