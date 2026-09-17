import { describe, expect, it } from 'vitest'
import { resolveBonuses } from './bonuses'
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
  { type: 'markYellow', row: 0, col: 0 },
  { type: 'markYellow', row: 0, col: 1 },
  { type: 'markYellow', row: 0, col: 2 },
]
const yellowRow2: Action[] = [
  { type: 'markYellow', row: 1, col: 0 },
  { type: 'markYellow', row: 1, col: 1 },
  { type: 'markYellow', row: 1, col: 3 },
]
const yellowRow3: Action[] = [
  { type: 'markYellow', row: 2, col: 0 },
  { type: 'markYellow', row: 2, col: 2 },
  { type: 'markYellow', row: 2, col: 3 },
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
    state = reducer(state, { type: 'markBlue', row: 1, col: 0 }) // blaue 5
    expect(active(state).blue[1][0]).toBe(true)
    expect(state.pendingChoices).toHaveLength(0)
    // Danach ist der Block wieder frei.
    state = reducer(state, { type: 'setGreen', count: 3 })
    expect(active(state).green).toBe(3)
  })

  it('nehmen kein bereits angekreuztes Feld', () => {
    const state = run(...yellowRow1)
    // Ein schon gesetztes gelbes Kreuz erfüllt die Auswahl nicht.
    expect(reducer(state, { type: 'markYellow', row: 0, col: 0 })).toBe(state)

    // Und ein bereits angekreuztes blaues Feld ebenso wenig.
    const marked = reducer(state, { type: 'markBlue', row: 1, col: 0 })
    expect(marked.pendingChoices).toHaveLength(0)
    expect(reducer(marked, { type: 'markBlue', row: 1, col: 0 })).toBe(marked)
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
    // Feld für Feld bis zum Fuchs auf Feld 7; Feld 6 verlangt unterwegs ein
    // blaues Kreuz.
    let state = createGame(1)
    for (let field = 1; field <= 7; field++) {
      state = reducer(state, { type: 'setGreen', count: field })
      if (state.pendingChoices.length > 0) {
        state = reducer(state, { type: 'markBlue', row: 1, col: 0 })
      }
    }
    expect(active(state).green).toBe(7)
    expect(state.notifications.some((n) => n.text.startsWith('Fuchs'))).toBe(true)
    expect(openBonuses(active(state)).some((entry) => entry.bonus === 'fox')).toBe(false)
  })
})

describe('Gesetzt ist gesetzt', () => {
  it('nimmt ein Kreuz nicht wieder zurück', () => {
    const state = run(...yellowRow2)
    expect(active(state).yellow[1][0]).toBe(true)
    // Derselbe Klick noch einmal: der Zustand bleibt, wie er ist.
    const again = reducer(state, { type: 'markYellow', row: 1, col: 0 })
    expect(again).toBe(state)
    expect(active(again).yellow[1][0]).toBe(true)
  })

  it('bleibt auch nach dem Verfallen einer Auswahl stehen', () => {
    let state = run(...yellowRow1)
    expect(state.pendingChoices).toHaveLength(1)
    state = reducer(state, { type: 'skipChoice' })
    state = reducer(state, { type: 'markYellow', row: 0, col: 0 })
    expect(active(state).yellow[0][0]).toBe(true)
    expect(active(state).resolvedBonuses).toContain('yellow-row-0')
  })

  it('gibt einen Bonus wieder frei, wenn sein Auslöser verschwindet', () => {
    // Genau das macht der Verlauf beim Zurücknehmen: Er setzt den Block auf
    // einen früheren Stand, der Bonus muss dann wieder als offen gelten.
    const state = run(...yellowRow2)
    expect(active(state).resolvedBonuses).toContain('yellow-row-1')
    const yellow = active(state).yellow.map((row, r) =>
      row.map((cell, c) => (r === 1 && c === 0 ? false : cell)),
    )
    const rolled = resolveBonuses({ ...state, player: { ...active(state), yellow } })
    expect(rolled.player.resolvedBonuses).not.toContain('yellow-row-1')
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
      ['gelb', { type: 'markYellow', row: 0, col: 0 }],
      ['blau', { type: 'markBlue', row: 1, col: 0 }],
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

describe('Mehrere Boni auf einmal', () => {
  /**
   * Das blaue Feld 6 schließt Reihe 2 (gelbes Kreuz) und Spalte 2 (grünes
   * Kreuz) im selben Zug ab.
   */
  const blueRowAndColumn: Action[] = [
    { type: 'markBlue', row: 1, col: 0 },
    { type: 'markBlue', row: 1, col: 2 },
    { type: 'markBlue', row: 1, col: 3 },
    { type: 'markBlue', row: 0, col: 1 },
    { type: 'markBlue', row: 2, col: 1 },
    { type: 'markBlue', row: 1, col: 1 },
  ]

  it('legt sie zur Auswahl, statt selbst zu entscheiden', () => {
    const state = run(...blueRowAndColumn)
    expect(state.bonusQueue.map((entry) => entry.bonus)).toEqual(['yellow', 'green'])
    // Noch ist nichts passiert.
    expect(active(state).green).toBe(0)
    expect(state.pendingChoices).toHaveLength(0)
  })

  it('sperrt den Block, bis sie abgearbeitet sind', () => {
    const state = run(...blueRowAndColumn)
    expect(reducer(state, { type: 'setOrange', index: 0, value: 4 })).toBe(state)
    expect(reducer(state, { type: 'completeRound' })).toBe(state)
  })

  it('führt den gewählten zuerst aus und den letzten dann von selbst', () => {
    let state = run(...blueRowAndColumn)
    // Erst das grüne Kreuz, danach bleibt nur noch das gelbe – das braucht
    // keine Rückfrage mehr und wird direkt zur Zwangsauswahl.
    state = reducer(state, { type: 'resolveBonus', sourceId: 'blue-col-1' })
    expect(active(state).green).toBe(1)
    expect(state.bonusQueue).toHaveLength(0)
    expect(state.pendingChoices.map((choice) => choice.bonus)).toEqual(['yellow'])
  })

  it('nimmt nur Boni aus der Liste an', () => {
    const state = run(...blueRowAndColumn)
    expect(reducer(state, { type: 'resolveBonus', sourceId: 'gibt-es-nicht' })).toBe(state)
  })
})

describe('Lila nimmt nur gültige Werte', () => {
  it('weist einen Wert ab, der nicht höher ist', () => {
    const state = run({ type: 'setPurple', index: 0, value: 4 })
    expect(reducer(state, { type: 'setPurple', index: 1, value: 4 })).toBe(state)
    expect(reducer(state, { type: 'setPurple', index: 1, value: 3 })).toBe(state)
    expect(reducer(state, { type: 'setPurple', index: 1, value: 5 }).player.purple[1]).toBe(5)
  })

  it('lässt nach einer 6 wieder alles zu', () => {
    let state = run({ type: 'setPurple', index: 0, value: 6 })
    state = reducer(state, { type: 'setPurple', index: 1, value: 1 })
    expect(active(state).purple[1]).toBe(1)
  })

  it('lässt den Bonus \u201elila 6\u201c ungehindert durch', () => {
    // Gelbe Reihe 2 schreibt eine orange 4; fuer Lila nehmen wir die blaue
    // Spalte 3, die eine 6 eintraegt.
    const state = run(
      { type: 'setPurple', index: 0, value: 6 },
      { type: 'markBlue', row: 0, col: 2 },
      { type: 'markBlue', row: 1, col: 2 },
      { type: 'markBlue', row: 2, col: 2 },
    )
    expect(active(state).purple[1]).toBe(6)
  })
})

describe('Würfel pro Runde zählen', () => {
  it('zählt, was der Spieler selbst einträgt', () => {
    const state = run(
      { type: 'markYellow', row: 3, col: 1 },
      { type: 'setOrange', index: 0, value: 3 },
    )
    expect(state.roundEntries).toBe(2)
  })

  it('zählt Felder nicht mit, die ein Bonus schreibt', () => {
    // Gelb Reihe 2 sind drei Kreuze und trägt automatisch eine orange 4 ein.
    const state = run(...yellowRow2)
    expect(active(state).orange[0]).toBe(4)
    expect(state.roundEntries).toBe(3)
  })

  it('zählt ein Kreuz aus der Zwangsauswahl nicht mit', () => {
    // Gelb Reihe 1 sind drei Kreuze und verlangt danach ein blaues.
    let state = run(...yellowRow1)
    expect(state.roundEntries).toBe(3)
    state = reducer(state, { type: 'markBlue', row: 1, col: 0 })
    expect(active(state).blue[1][0]).toBe(true)
    expect(state.roundEntries).toBe(3)
  })

  it('hebt das Soll um jeden eingelösten Zusatzwürfel', () => {
    // Runde 2 bringt den Zusatzwürfel mit.
    let state = run({ type: 'completeRound' })
    expect(state.roundExtraDice).toBe(0)
    const extra = openBonuses(active(state)).find((entry) => entry.bonus === 'plus1')!
    state = reducer(state, { type: 'useBonus', sourceId: extra.sourceId })
    expect(state.roundExtraDice).toBe(1)
    expect(state.roundEntries).toBe(0)
  })

  it('lässt den Wiederholungswurf außen vor', () => {
    let state = createGame(1)
    const reroll = openBonuses(state.player).find((entry) => entry.bonus === 'reroll')!
    state = reducer(state, { type: 'useBonus', sourceId: reroll.sourceId })
    expect(state.roundExtraDice).toBe(0)
  })

  it('fängt mit jeder Runde von vorn an', () => {
    let state = run({ type: 'markYellow', row: 3, col: 1 })
    expect(state.roundEntries).toBe(1)
    state = reducer(state, { type: 'completeRound' })
    expect(state.roundEntries).toBe(0)
    expect(state.roundExtraDice).toBe(0)
  })
})
