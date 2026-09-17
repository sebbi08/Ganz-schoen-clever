import { describe, expect, it } from 'vitest'
import { createGame, reducer } from './state'
import type { Action } from './state'
import type { GameState } from './types'
import { earnedBonuses, openBonuses } from './scoring'

function run(...actions: Action[]): GameState {
  return actions.reduce<GameState>((state, action) => reducer(state, action), createGame(1))
}

const active = (state: GameState) => state.player

/** Gelbe Reihe 1 (3–6–5), Reihe 2 (2–1–5) und Reihe 3 (1–2–4) vervollständigen. */
const yellowRow1: Action[] = [
  { type: 'toggleYellow', row: 0, col: 0 },
  { type: 'toggleYellow', row: 0, col: 1 },
  { type: 'toggleYellow', row: 0, col: 2 },
]
const yellowRow2: Action[] = [
  { type: 'toggleYellow', row: 1, col: 0 },
  { type: 'toggleYellow', row: 1, col: 1 },
  { type: 'toggleYellow', row: 1, col: 3 },
]
const yellowRow3: Action[] = [
  { type: 'toggleYellow', row: 2, col: 0 },
  { type: 'toggleYellow', row: 2, col: 2 },
  { type: 'toggleYellow', row: 2, col: 3 },
]

describe('Zahlenboni', () => {
  it('werden sofort in die Reihe geschrieben', () => {
    const state = run(...yellowRow2) // Gelb Reihe 2 → orange 4
    expect(active(state).orange[0]).toBe(4)
    expect(state.pendingChoices).toHaveLength(0)
  })

  it('melden sich per Toast', () => {
    const state = run(...yellowRow2)
    expect(state.notifications.map((n) => n.text)).toContain('Orange 4 eintragen → Feld 1')
  })

  it('verfallen, wenn die Reihe voll ist', () => {
    // Orange von Hand vollschreiben und die dabei fälligen Boni als erledigt
    // markieren, damit sie die Ausgangslage nicht stören.
    const fresh = createGame(1)
    const filled = { ...fresh.player, orange: fresh.player.orange.map(() => 1) }
    let state: GameState = {
      ...fresh,
      player: { ...filled, resolvedBonuses: earnedBonuses(filled).map((entry) => entry.sourceId) },
    }
    state = yellowRow2.reduce<GameState>((s, a) => reducer(s, a), state)
    expect(state.notifications.map((n) => n.text)).toContain(
      'Orange 4 eintragen: Reihe ist voll, Bonus verfällt',
    )
    expect(active(state).orange.every((value: number | null) => value === 1)).toBe(true)
  })
})

describe('grünes Kreuz', () => {
  it('rückt die grüne Reihe automatisch weiter', () => {
    const state = run(...yellowRow3) // Gelb Reihe 3 → grünes Kreuz
    expect(active(state).green).toBe(1)
    expect(state.notifications.map((n) => n.text)).toContain('Grünes Kreuz → Feld 1')
  })

  it('löst Folgeboni aus', () => {
    // Grün bis Feld 5 füllen, dann schiebt das grüne Kreuz auf Feld 6 –
    // und dort wartet ein blaues Kreuz, das gewählt werden muss.
    const state = run({ type: 'setGreen', count: 5 }, ...yellowRow3)
    expect(active(state).green).toBe(6)
    expect(state.pendingChoices).toHaveLength(1)
    expect(state.pendingChoices[0].bonus).toBe('blue')
  })
})

describe('Kreuzboni mit freier Wahl', () => {
  it('stellen eine Zwangsauswahl', () => {
    const state = run(...yellowRow1) // Gelb Reihe 1 → blaues Kreuz
    expect(state.pendingChoices).toHaveLength(1)
    expect(state.pendingChoices[0].bonus).toBe('blue')
    expect(state.pendingChoices[0].origin).toBe('Gelb – Reihe 1')
  })

  it('sperren den übrigen Block', () => {
    const state = run(...yellowRow1)
    const blocked = reducer(state, { type: 'setGreen', count: 4 })
    expect(active(blocked).green).toBe(0)
    expect(reducer(state, { type: 'setOrange', index: 0, value: 6 })).toBe(state)
  })

  it('werden durch einen Klick im geforderten Bereich erledigt', () => {
    let state = run(...yellowRow1)
    state = reducer(state, { type: 'toggleBlue', row: 1, col: 0 }) // blaue 5
    expect(active(state).blue[1][0]).toBe(true)
    expect(state.pendingChoices).toHaveLength(0)
    // Danach ist der Block wieder frei.
    state = reducer(state, { type: 'setGreen', count: 3 })
    expect(active(state).green).toBe(3)
  })

  it('nehmen kein bereits angekreuztes Feld', () => {
    let state = run(...yellowRow1)
    state = reducer(state, { type: 'toggleBlue', row: 1, col: 0 })
    // Dasselbe blaue Feld noch einmal: weder Auswahl erledigt noch Kreuz weg.
    const before = run(...yellowRow1)
    const after = reducer(before, { type: 'toggleYellow', row: 0, col: 0 })
    expect(after).toBe(before)
  })

  it('lassen sich verfallen', () => {
    let state = run(...yellowRow1)
    state = reducer(state, { type: 'skipChoice' })
    expect(state.pendingChoices).toHaveLength(0)
    state = reducer(state, { type: 'setGreen', count: 2 })
    expect(active(state).green).toBe(2)
  })
})

describe('Vorrat und Füchse', () => {
  it('legt Wiederholungswurf und Zusatzwürfel in den Vorrat', () => {
    const state = run({ type: 'setGreen', count: 4 }) // grünes Feld 4 → +1
    expect(openBonuses(active(state)).map((entry) => entry.bonus)).toContain('plus1')
  })

  it('zählt Füchse ohne Zutun', () => {
    const state = run({ type: 'setGreen', count: 7 }) // grünes Feld 7 → Fuchs
    expect(state.notifications.some((n) => n.text.startsWith('Fuchs'))).toBe(true)
    expect(openBonuses(active(state)).some((entry) => entry.bonus === 'fox')).toBe(false)
  })
})

describe('Zurücknehmen', () => {
  it('gibt einen Bonus wieder frei, wenn sein Auslöser verschwindet', () => {
    let state = run(...yellowRow2)
    expect(active(state).resolvedBonuses).toContain('yellow-row-1')
    state = reducer(state, { type: 'toggleYellow', row: 1, col: 0 })
    expect(active(state).resolvedBonuses).not.toContain('yellow-row-1')
    // Erneut vervollständigen löst den Bonus wieder aus.
    state = reducer(state, { type: 'toggleYellow', row: 1, col: 0 })
    expect(active(state).orange[1]).toBe(4)
  })

  it('lässt sich erst nach dem Verfallen zurücknehmen', () => {
    let state = run(...yellowRow1)
    expect(state.pendingChoices).toHaveLength(1)
    // Solange die Auswahl offen ist, ist auch der Auslöser gesperrt.
    state = reducer(state, { type: 'toggleYellow', row: 0, col: 0 })
    expect(active(state).yellow[0][0]).toBe(true)
    expect(state.pendingChoices).toHaveLength(1)

    state = reducer(state, { type: 'skipChoice' })
    state = reducer(state, { type: 'toggleYellow', row: 0, col: 0 })
    expect(active(state).yellow[0][0]).toBe(false)
    expect(active(state).resolvedBonuses).not.toContain('yellow-row-0')
  })
})

describe('Rundenbonus "Kreuz oder 6"', () => {
  /** Bis zum Beginn von Runde 4 durchschalten. */
  function round4(): GameState {
    let state = createGame(1)
    for (let index = 0; index < 3; index++) {
      state = reducer(state, { type: 'completeRound' })
    }
    return state
  }

  it('verlangt zu Beginn von Runde 4 eine Auswahl', () => {
    const state = round4()
    expect(state.round).toBe(4)
    expect(state.pendingChoices).toHaveLength(1)
    expect(state.pendingChoices[0].bonus).toBe('anyCrossOr6')
  })

  it('nimmt ein Kreuz in jedem Farbbereich an', () => {
    for (const [name, action] of [
      ['gelb', { type: 'toggleYellow', row: 0, col: 0 }],
      ['blau', { type: 'toggleBlue', row: 1, col: 0 }],
      ['grün', { type: 'setGreen', count: 1 }],
    ] as const) {
      const state = reducer(round4(), action)
      expect(state.pendingChoices, name).toHaveLength(0)
    }
  })

  it('nimmt in Orange und Lila nur eine 6', () => {
    const fuenf = reducer(round4(), { type: 'setOrange', index: 0, value: 5 })
    expect(fuenf.pendingChoices).toHaveLength(1)
    expect(fuenf.player.orange[0]).toBe(null)

    const sechs = reducer(round4(), { type: 'setOrange', index: 0, value: 6 })
    expect(sechs.pendingChoices).toHaveLength(0)
    expect(sechs.player.orange[0]).toBe(6)

    const lila = reducer(round4(), { type: 'setPurple', index: 0, value: 6 })
    expect(lila.pendingChoices).toHaveLength(0)
    expect(lila.player.purple[0]).toBe(6)
  })

  it('sperrt alles andere, bis die Auswahl steht', () => {
    const state = round4()
    // Ein Feld, das nicht das nächste freie ist, zählt nicht.
    expect(reducer(state, { type: 'setOrange', index: 3, value: 6 })).toBe(state)
    expect(reducer(state, { type: 'setGreen', count: 3 })).toBe(state)
  })
})

describe('Vorrat einlösen', () => {
  it('geht nur in eine Richtung', () => {
    let state = createGame(1) // Rundenbonus 1 liegt im Vorrat
    const [bonus] = openBonuses(state.player)
    expect(bonus.bonus).toBe('reroll')

    state = reducer(state, { type: 'useBonus', sourceId: bonus.sourceId })
    expect(openBonuses(state.player)).toHaveLength(0)

    // Erneutes Drücken aktiviert ihn nicht wieder.
    const after = reducer(state, { type: 'useBonus', sourceId: bonus.sourceId })
    expect(after).toBe(state)
    expect(openBonuses(after.player)).toHaveLength(0)
  })
})
