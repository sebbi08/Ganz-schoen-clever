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
  { type: 'markYellow', row: 1, col: 0 },
  { type: 'markYellow', row: 1, col: 1 },
  { type: 'markYellow', row: 1, col: 3 },
]

describe('Verlauf', () => {
  it('merkt sich jeden Zug, der den Block verändert', () => {
    const state = run({ type: 'markYellow', row: 0, col: 0 }, { type: 'setGreen', count: 1 })
    expect(state.past).toHaveLength(2)
    expect(state.past.map((entry) => `${entry.tone}:${entry.label}`)).toEqual([
      'yellow:Gelbes Kreuz · Reihe 1, Spalte 1',
      'green:Grünes Kreuz · Feld 1',
    ])
  })

  it('nimmt Züge ohne Blockänderung nicht auf', () => {
    const state = run(
      { type: 'markYellow', row: 0, col: 0 },
      { type: 'dismissNotification', id: 'gibt-es-nicht' },
    )
    expect(state.past).toHaveLength(1)
  })

  it('macht den letzten Zug rückgängig', () => {
    let state = run({ type: 'markYellow', row: 0, col: 0 })
    expect(active(state).yellow[0][0]).toBe(true)
    state = historyReducer(state, { type: 'undo', steps: 1 })
    expect(active(state).yellow[0][0]).toBe(false)
    expect(state.past).toHaveLength(0)
  })

  it('nimmt mehrere Züge auf einmal zurück', () => {
    let state = run(...yellowRow2)
    state = historyReducer(state, { type: 'undo', steps: 3 })
    // Feld 3 der Reihe ist vorgekreuzt und bleibt es auch.
    expect([
      active(state).yellow[1][0],
      active(state).yellow[1][1],
      active(state).yellow[1][3],
    ]).toEqual([false, false, false])
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
      { type: 'markYellow', row: 0, col: 0 },
      { type: 'markYellow', row: 0, col: 1 },
      { type: 'markYellow', row: 0, col: 2 },
    )
    expect(state.present.pendingChoices).toHaveLength(1)
    state = historyReducer(state, { type: 'undo', steps: 1 })
    expect(state.present.pendingChoices).toHaveLength(0)
    expect(active(state).yellow[0][2]).toBe(false)
  })

  it('bleibt auch bei gesperrtem Block bedienbar', () => {
    // Die Zwangsauswahl sperrt den Reducer, der Verlauf greift trotzdem.
    let state = run(
      { type: 'markYellow', row: 0, col: 0 },
      { type: 'markYellow', row: 0, col: 1 },
      { type: 'markYellow', row: 0, col: 2 },
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
    const fresh = createHistory(1)
    // Ein voller Verlauf von Hand: ein Kreuz laesst sich nicht mehr
    // wegklicken, so viele echte Zuege gibt der Block nicht her.
    const full: HistoryState = {
      ...fresh,
      past: Array.from({ length: MAX_HISTORY }, (_, index) => ({
        state: fresh.present,
        label: `Zug ${index + 1}`,
        tone: 'neutral' as const,
      })),
    }
    const state = historyReducer(full, { type: 'markYellow', row: 0, col: 0 })
    expect(state.past).toHaveLength(MAX_HISTORY)
    // Der aelteste Eintrag faellt hinten raus, der neue steht vorne.
    expect(state.past[0].label).toBe('Zug 2')
    expect(state.past[MAX_HISTORY - 1].label).toBe('Gelbes Kreuz · Reihe 1, Spalte 1')
  })

  it('startet mit einem neuen Spiel ohne Verlauf', () => {
    let state = run(...yellowRow2)
    expect(state.past.length).toBeGreaterThan(0)
    state = historyReducer(state, { type: 'newGame' })
    expect(state.past).toHaveLength(0)
    expect(active(state).orange.every((value) => value === null)).toBe(true)
    // Das neue Spiel startet wieder mit dem Bonus aus Runde 1.
    expect(active(state).manualBonuses).toHaveLength(1)
  })
})

describe('Rundenbonus', () => {
  it('liegt schon zu Beginn von Runde 1 im Vorrat', () => {
    const state = createHistory(1)
    expect(active(state).manualBonuses.map((entry) => `${entry.bonus}:${entry.origin}`)).toEqual([
      'reroll:Rundenbonus 1',
    ])
    expect(state.present.claimedRounds).toEqual([1])
    expect(openBonuses(active(state)).map((entry) => entry.bonus)).toEqual(['reroll'])
  })

  it('kommt beim Abschließen mit der neuen Runde dazu', () => {
    const state = run({ type: 'completeRound' })
    expect(state.present.round).toBe(2)
    expect(active(state).manualBonuses.map((entry) => `${entry.bonus}:${entry.origin}`)).toEqual([
      'reroll:Rundenbonus 1',
      'plus1:Rundenbonus 2',
    ])
    expect(state.present.claimedRounds).toEqual([1, 2])
  })

  it('meldet sich per Toast', () => {
    const state = run({ type: 'completeRound' })
    expect(state.present.notifications.map((n) => n.text)).toContain(
      'Zusatzwürfel (+1) · Rundenbonus 2',
    )
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
    expect(active(state).manualBonuses).toHaveLength(2)
  })

  it('verteilt die Boni der Runden 1 bis 4, danach keine mehr', () => {
    let state = createHistory(1) // ein Spieler → sechs Runden
    for (let index = 0; index < 6; index++) {
      state = historyReducer(state, { type: 'completeRound' })
      // Runde 4 verlangt ein Kreuz; erst danach geht es weiter.
      if (state.present.pendingChoices.length > 0) {
        state = historyReducer(state, { type: 'markYellow', row: 0, col: 0 })
      }
    }
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
    expect(active(state).manualBonuses).toHaveLength(4)
    // Die letzte Runde verlangt noch ihr Kreuz.
    expect(state.present.pendingChoices[0]?.bonus).toBe('anyCrossOr6')
  })

  it('lässt sich über den Verlauf zurücknehmen', () => {
    let state = run({ type: 'completeRound' })
    expect(active(state).manualBonuses).toHaveLength(2)
    state = historyReducer(state, { type: 'undo', steps: 1 })
    expect(active(state).manualBonuses).toHaveLength(1)
    expect(state.present.round).toBe(1)
    expect(state.present.claimedRounds).toEqual([1])
  })
})

describe('Wiederholen', () => {
  const gelb = (col: number): HistoryAction => ({ type: 'markYellow', row: 0, col })

  it('legt zurückgenommene Züge auf den Stapel', () => {
    let state = run(gelb(0), gelb(1))
    state = historyReducer(state, { type: 'undo', steps: 1 })
    expect(state.future.map((entry) => entry.label)).toEqual(['Gelbes Kreuz · Reihe 1, Spalte 2'])
    expect(active(state).yellow[0][1]).toBe(false)
  })

  it('stellt den Zug wieder her', () => {
    let state = run(gelb(0), gelb(1))
    state = historyReducer(state, { type: 'undo', steps: 1 })
    state = historyReducer(state, { type: 'redo', steps: 1 })
    expect(active(state).yellow[0][1]).toBe(true)
    expect(state.future).toHaveLength(0)
    expect(state.past.map((entry) => entry.label)).toEqual([
      'Gelbes Kreuz · Reihe 1, Spalte 1',
      'Gelbes Kreuz · Reihe 1, Spalte 2',
    ])
  })

  it('sammelt mehrere Rücknahmen in der richtigen Reihenfolge', () => {
    let state = run(gelb(0), gelb(1), gelb(2))
    state = historyReducer(state, { type: 'undo', steps: 1 })
    state = historyReducer(state, { type: 'undo', steps: 1 })
    expect(state.future.map((entry) => entry.label)).toEqual([
      'Gelbes Kreuz · Reihe 1, Spalte 2',
      'Gelbes Kreuz · Reihe 1, Spalte 3',
    ])
    // Wiederholen arbeitet den Stapel von vorn ab.
    state = historyReducer(state, { type: 'redo', steps: 1 })
    expect(active(state).yellow[0][1]).toBe(true)
    expect(active(state).yellow[0][2]).toBe(false)
    state = historyReducer(state, { type: 'redo', steps: 1 })
    expect(active(state).yellow[0][2]).toBe(true)
    expect(state.future).toHaveLength(0)
  })

  it('führt auch Boni wieder mit', () => {
    // Gelbe Reihe 2 trägt automatisch eine orange 4 ein.
    let state = run(...yellowRow2)
    expect(active(state).orange[0]).toBe(4)
    state = historyReducer(state, { type: 'undo', steps: 1 })
    expect(active(state).orange[0]).toBe(null)
    state = historyReducer(state, { type: 'redo', steps: 1 })
    expect(active(state).orange[0]).toBe(4)
  })

  it('verfällt, sobald ein anderer Zug kommt', () => {
    let state = run(gelb(0), gelb(1))
    state = historyReducer(state, { type: 'undo', steps: 1 })
    expect(state.future).toHaveLength(1)
    state = historyReducer(state, gelb(2))
    expect(state.future).toHaveLength(0)
  })

  it('überlebt das Wegklicken einer Meldung', () => {
    let state = run(...yellowRow2)
    state = historyReducer(state, { type: 'undo', steps: 1 })
    const toast = state.present.notifications[0]?.id ?? 'x'
    state = historyReducer(state, { type: 'dismissNotification', id: toast })
    expect(state.future).toHaveLength(1)
  })

  it('läuft bei leerem Stapel ins Leere', () => {
    const fresh = createHistory(1)
    expect(historyReducer(fresh, { type: 'redo', steps: 1 })).toBe(fresh)
  })
})

describe('Spielende', () => {
  /** Bis zur letzten Runde durchschalten. */
  function lastRound(tableSize: number): HistoryState {
    let state = createHistory(tableSize)
    for (let index = 0; index < 6; index++) {
      state = historyReducer(state, { type: 'completeRound' })
      if (state.present.pendingChoices.length > 0) {
        state = historyReducer(state, { type: 'markYellow', row: 0, col: 0 })
      }
    }
    return state
  }

  it('lässt sich erst in der letzten Runde beenden', () => {
    const early = createHistory(1)
    expect(historyReducer(early, { type: 'finishGame' })).toBe(early)

    const state = historyReducer(lastRound(1), { type: 'finishGame' })
    expect(state.present.finished).toBe(true)
    expect(state.past[state.past.length - 1].label).toBe('Spiel beendet')
  })

  it('beendet nur einmal', () => {
    const state = historyReducer(lastRound(4), { type: 'finishGame' })
    expect(historyReducer(state, { type: 'finishGame' })).toBe(state)
  })

  it('lässt sich zurücknehmen', () => {
    let state = historyReducer(lastRound(1), { type: 'finishGame' })
    state = historyReducer(state, { type: 'undo', steps: 1 })
    expect(state.present.finished).toBe(false)
  })

  it('startet ein neues Spiel unbeendet', () => {
    let state = historyReducer(lastRound(1), { type: 'finishGame' })
    state = historyReducer(state, { type: 'newGame' })
    expect(state.present.finished).toBe(false)
  })
})
