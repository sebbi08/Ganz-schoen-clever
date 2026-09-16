import { describe, expect, it } from 'vitest'
import { MAX_HISTORY, createHistory, historyReducer } from './history'
import type { HistoryAction, HistoryState } from './history'
import { openBonuses } from './scoring'

function run(...actions: HistoryAction[]): HistoryState {
  return actions.reduce<HistoryState>(
    (state, action) => historyReducer(state, action),
    createHistory(1),
  )
}

const active = (state: HistoryState) => state.present.player

const yellowRow2: HistoryAction[] = [
  { type: 'toggleYellow', row: 1, col: 0 },
  { type: 'toggleYellow', row: 1, col: 1 },
  { type: 'toggleYellow', row: 1, col: 3 },
]

describe('Verlauf', () => {
  it('merkt sich jeden Zug, der den Block verändert', () => {
    const state = run({ type: 'toggleYellow', row: 0, col: 0 }, { type: 'setGreen', count: 1 })
    expect(state.past).toHaveLength(2)
    expect(state.past.map((entry) => entry.label)).toEqual([
      'Gelb Reihe 1, Spalte 1',
      'Grün bis Feld 1',
    ])
  })

  it('nimmt Züge ohne Blockänderung nicht auf', () => {
    const state = run(
      { type: 'toggleYellow', row: 0, col: 0 },
      { type: 'dismissNotification', id: 'gibt-es-nicht' },
    )
    expect(state.past).toHaveLength(1)
  })

  it('macht den letzten Zug rückgängig', () => {
    let state = run({ type: 'toggleYellow', row: 0, col: 0 })
    expect(active(state).yellow[0][0]).toBe(true)
    state = historyReducer(state, { type: 'undo', steps: 1 })
    expect(active(state).yellow[0][0]).toBe(false)
    expect(state.past).toHaveLength(0)
  })

  it('nimmt mehrere Züge auf einmal zurück', () => {
    let state = run(...yellowRow2)
    state = historyReducer(state, { type: 'undo', steps: 3 })
    // Feld 3 der Reihe ist vorgekreuzt und bleibt es auch.
    expect([active(state).yellow[1][0], active(state).yellow[1][1], active(state).yellow[1][3]])
      .toEqual([false, false, false])
    expect(state.past).toHaveLength(0)
  })

  it('macht auch automatisch eingetragene Boni rückgängig', () => {
    let state = run(...yellowRow2) // Gelb Reihe 2 → orange 4 wird gesetzt
    expect(active(state).orange[0]).toBe(4)
    state = historyReducer(state, { type: 'undo', steps: 1 })
    expect(active(state).orange[0]).toBe(null)
    expect(active(state).resolvedBonuses).not.toContain('yellow-row-1')
  })

  it('macht eine offene Zwangsauswahl rückgängig', () => {
    let state = run(
      { type: 'toggleYellow', row: 0, col: 0 },
      { type: 'toggleYellow', row: 0, col: 1 },
      { type: 'toggleYellow', row: 0, col: 2 },
    )
    expect(state.present.pendingChoices).toHaveLength(1)
    state = historyReducer(state, { type: 'undo', steps: 1 })
    expect(state.present.pendingChoices).toHaveLength(0)
    expect(active(state).yellow[0][2]).toBe(false)
  })

  it('bleibt auch bei gesperrtem Block bedienbar', () => {
    // Die Zwangsauswahl sperrt den Reducer, der Verlauf greift trotzdem.
    let state = run(
      { type: 'toggleYellow', row: 0, col: 0 },
      { type: 'toggleYellow', row: 0, col: 1 },
      { type: 'toggleYellow', row: 0, col: 2 },
      { type: 'setGreen', count: 3 },
    )
    expect(active(state).green).toBe(0) // gesperrt, also nicht im Verlauf
    expect(state.past).toHaveLength(3)
    state = historyReducer(state, { type: 'undo', steps: 1 })
    expect(state.present.pendingChoices).toHaveLength(0)
  })

  it('läuft bei leerem Verlauf ins Leere', () => {
    const fresh = createHistory(1)
    expect(historyReducer(fresh, { type: 'undo', steps: 1 })).toBe(fresh)
  })

  it('begrenzt die Länge', () => {
    let state = createHistory(1)
    for (let index = 0; index < MAX_HISTORY + 12; index++) {
      state = historyReducer(state, { type: 'addManualBonus', bonus: 'fox', origin: 'Test' })
    }
    expect(state.past).toHaveLength(MAX_HISTORY)
  })

  it('startet mit einem neuen Spiel ohne Verlauf', () => {
    let state = run(...yellowRow2)
    expect(state.past.length).toBeGreaterThan(0)
    state = historyReducer(state, { type: 'newGame' })
    expect(state.past).toHaveLength(0)
    expect(active(state).orange.every((value) => value === null)).toBe(true)
  })

})

describe('Rundenbonus', () => {
  it('wird beim Abschließen gutgeschrieben', () => {
    const state = run({ type: 'completeRound' })
    expect(active(state).manualBonuses.map((entry) => `${entry.bonus}:${entry.origin}`)).toEqual([
      'reroll:Rundenbonus 1',
    ])
    expect(state.present.round).toBe(2)
    expect(state.present.claimedRounds).toEqual([1])
  })

  it('wird pro Runde nur einmal verteilt', () => {
    let state = run({ type: 'completeRound' })
    // Über die Oberfläche kommt man nicht zurück; der Riegel sichert den
    // Fall trotzdem ab.
    state = historyReducer(state, {
      type: 'replace',
      state: { ...state.present, round: 1 },
    })
    state = historyReducer(state, { type: 'completeRound' })
    expect(active(state).manualBonuses).toHaveLength(1)
    expect(state.present.claimedRounds).toEqual([1])
  })

  it('landet direkt in der Vorratsleiste', () => {
    const state = run({ type: 'completeRound' })
    expect(openBonuses(active(state)).map((entry) => entry.bonus)).toEqual(['reroll'])
  })

  it('meldet sich per Toast', () => {
    const state = run({ type: 'completeRound' })
    expect(state.present.notifications.map((n) => n.text)).toContain(
      'Rundenbonus 1: Wiederholungswurf',
    )
  })

  it('verteilt die Boni der Runden 1 bis 4, danach keine mehr', () => {
    let state = createHistory(1)
    for (let i = 0; i < 6; i++) state = historyReducer(state, { type: 'completeRound' })
    expect(active(state).manualBonuses.map((entry) => entry.bonus)).toEqual([
      'reroll',
      'plus1',
      'reroll',
      'anyCrossOr6',
    ])
    expect(state.present.round).toBe(6)
  })

  it('schaltet immer nur eine Runde weiter und bleibt am Ende stehen', () => {
    let state = createHistory(4) // vier Spieler → vier Runden
    const verlauf: number[] = []
    for (let index = 0; index < 6; index++) {
      state = historyReducer(state, { type: 'completeRound' })
      verlauf.push(state.present.round)
    }
    expect(verlauf).toEqual([2, 3, 4, 4, 4, 4])
    // Der Bonus der letzten Runde wird trotzdem nur einmal verteilt.
    expect(active(state).manualBonuses.filter((e) => e.origin === 'Rundenbonus 4')).toHaveLength(1)
  })

  it('lässt sich über den Verlauf zurücknehmen', () => {
    let state = run({ type: 'completeRound' })
    expect(active(state).manualBonuses).toHaveLength(1)
    state = historyReducer(state, { type: 'undo', steps: 1 })
    expect(active(state).manualBonuses).toHaveLength(0)
    expect(state.present.round).toBe(1)
    expect(state.present.claimedRounds).toEqual([])
  })
})
