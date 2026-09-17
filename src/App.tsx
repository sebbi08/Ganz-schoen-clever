import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { ORANGE_STEPS, PURPLE_STEPS, entriesPerRound } from './game/layout'
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
import { NewGameDialog } from './components/NewGameDialog'
import { RoundBar } from './components/RoundBar'
import { Toasts } from './components/Toasts'
import { YellowArea } from './components/YellowArea'

const ORANGE_BONUSES = ORANGE_STEPS.map((step) => step.bonus)
const ORANGE_MULTIPLIERS = ORANGE_STEPS.map((step) => step.multiplier)
const PURPLE_BONUSES = PURPLE_STEPS.map((step) => step.bonus)

export default function App() {
  // Einmal aus dem Browser lesen: einmal als Startzustand, einmal für die
  // Frage, ob wir beim ersten Besuch nach der Spielerzahl fragen.
  const [stored] = useState(loadHistory)
  const [history, dispatch] = useReducer(
    historyReducer,
    stored,
    (saved) => saved ?? createHistory(1),
  )
  const [asking, setAsking] = useState(stored === null)
  const state = history.present
  const player = state.player
  const score = scoreSheet(player)
  const choice = state.pendingChoices[0] ?? null
  // Warten mehrere Boni auf ihre Reihenfolge, ist der Block ebenfalls dicht.
  const queued = state.bonusQueue.length > 0
  const modeFor = (area: Area): AreaMode => (queued ? 'locked' : areaMode(choice, area))
  // Die Füchse hängen am schwächsten Bereich; solange keiner da ist, gibt es
  // nichts zu markieren.
  const weakest = (points: number) => score.foxes > 0 && points === score.foxValue
  // So viele Würfel gehören in diese Runde – eingelöste Zusatzwürfel dazu.
  const expected = entriesPerRound(state.tableSize) + state.roundExtraDice

  const undo = useCallback((steps: number) => dispatch({ type: 'undo', steps }), [])
  const redo = useCallback((steps: number) => dispatch({ type: 'redo', steps }), [])
  const dismiss = useCallback((id: string) => dispatch({ type: 'dismissNotification', id }), [])

  useEffect(() => saveHistory(history), [history])

  // Sobald die Rundenleiste nach oben aus dem Bild gescrollt ist, übernimmt
  // eine kompakte Ausgabe am oberen Rand. Der Fühler steht direkt unter der
  // Leiste und meldet genau diesen Moment.
  const sentinelRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef<HTMLDivElement>(null)
  const [pinned, setPinned] = useState(false)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(([entry]) => setPinned(!entry.isIntersecting))
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  /*
   * Die angeheftete Leiste liegt über dem Block, statt im Textfluss zu
   * stehen: Eine Leiste, die beim Anheften schrumpft, würde die Seite
   * kürzer machen, und der Browser zöge die Scrollposition mit. Genau das
   * fühlte sich am Telefon an, als ließe sich nicht richtig scrollen.
   *
   * Banner und Seitenspalte müssen dafür wissen, wie hoch sie gerade ist.
   */
  useEffect(() => {
    const node = pinnedRef.current
    const root = document.documentElement
    if (!node) {
      root.style.setProperty('--pinned-h', '0px')
      return
    }
    const publish = () => root.style.setProperty('--pinned-h', `${node.offsetHeight}px`)
    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(node)
    return () => {
      observer.disconnect()
      root.style.setProperty('--pinned-h', '0px')
    }
  }, [pinned])

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

      <RoundBar
        round={state.round}
        finished={state.finished}
        tableSize={state.tableSize}
        claimedRounds={state.claimedRounds}
        entries={state.roundEntries}
        expected={expected}
        compact={false}
        onComplete={() => dispatch({ type: 'completeRound' })}
        onFinish={() => dispatch({ type: 'finishGame' })}
      />

      <div ref={sentinelRef} className="round-sentinel" aria-hidden />

      {pinned && (
        <div ref={pinnedRef} className="round-bar-pinned">
          <div className="round-bar-pinned-inner">
            <RoundBar
              round={state.round}
              finished={state.finished}
              tableSize={state.tableSize}
              claimedRounds={state.claimedRounds}
              entries={state.roundEntries}
              expected={expected}
              compact
              onComplete={() => dispatch({ type: 'completeRound' })}
              onFinish={() => dispatch({ type: 'finishGame' })}
            />
          </div>
        </div>
      )}

      {state.finished && <FinalScore score={score} solo={state.tableSize === 1} />}

      <BonusPanel player={player} onUse={(sourceId) => dispatch({ type: 'useBonus', sourceId })} />

      <div className="columns">
        <main className="board">
          <div className="grids">
            <YellowArea
              player={player}
              points={score.yellow}
              weakest={weakest(score.yellow)}
              foxes={score.foxes}
              mode={modeFor('yellow')}
              onMark={(row, col) => dispatch({ type: 'markYellow', row, col })}
            />
            <BlueArea
              player={player}
              points={score.blue}
              weakest={weakest(score.blue)}
              foxes={score.foxes}
              mode={modeFor('blue')}
              onMark={(row, col) => dispatch({ type: 'markBlue', row, col })}
            />
          </div>

          <GreenRow
            player={player}
            points={score.green}
            weakest={weakest(score.green)}
            foxes={score.foxes}
            mode={modeFor('green')}
            onSet={(count) => dispatch({ type: 'setGreen', count })}
          />

          <NumberRow
            color="orange"
            label="Orange"
            title="Orange – Würfelwert eintragen, ×2 und ×3 beachten"
            points={score.orange}
            weakest={weakest(score.orange)}
            foxes={score.foxes}
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
            weakest={weakest(score.purple)}
            foxes={score.foxes}
            values={player.purple}
            bonuses={PURPLE_BONUSES}
            allowed={purpleAllowedValues(player.purple)}
            mode={modeFor('purple')}
            onSet={(index, value) => dispatch({ type: 'setPurple', index, value })}
          />
        </main>

        <aside className="sidebar">
          <HistoryPanel past={history.past} future={history.future} onUndo={undo} onRedo={redo} />
        </aside>
      </div>

      <footer className="footer">
        <span>Der Spielstand wird im Browser gespeichert.</span>
        <button className="btn danger" onClick={() => setAsking(true)}>
          Neues Spiel
        </button>
      </footer>

      {asking && (
        <NewGameDialog
          tableSize={state.tableSize}
          fresh={history.past.length === 0}
          onStart={(size) => {
            dispatch({ type: 'newGame', size })
            setAsking(false)
          }}
          onCancel={() => setAsking(false)}
        />
      )}

      <Toasts notifications={state.notifications} onDismiss={dismiss} />
    </div>
  )
}
