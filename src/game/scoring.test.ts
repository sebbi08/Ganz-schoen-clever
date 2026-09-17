import { describe, expect, it } from 'vitest'
import {
  blueScore,
  createPlayer,
  earnedBonuses,
  foxCount,
  greenScore,
  isYellowDiagonalComplete,
  lastFilledIndex,
  nextFreeIndex,
  openBonuses,
  orangeScore,
  purpleAllowedValues,
  purpleScore,
  scoreSheet,
  yellowScore,
} from './scoring'
import { BLUE_GRID, ORANGE_STEPS, YELLOW_GRID, roundsFor, soloRating } from './layout'

function player() {
  return createPlayer()
}

function fillBlue(p: ReturnType<typeof player>) {
  p.blue = p.blue.map((row, r) => row.map((_, c) => BLUE_GRID[r][c] !== null))
}

describe('Startaufstellung', () => {
  it('kreuzt die gelbe Nebendiagonale vor', () => {
    const p = player()
    p.yellow.forEach((row, r) =>
      row.forEach((cell, c) => expect(cell).toBe(YELLOW_GRID[r][c] === null)),
    )
  })

  it('startet mit null Punkten und ohne Boni', () => {
    const p = player()
    expect(scoreSheet(p).total).toBe(0)
    expect(earnedBonuses(p)).toHaveLength(0)
  })
})

describe('gelbe Wertung', () => {
  it('zählt nur vollständige Spalten', () => {
    const p = player()
    // Spalte 1: Reihe 4 ist vorgekreuzt, es fehlen die Reihen 1–3.
    p.yellow[0][0] = true
    p.yellow[1][0] = true
    expect(yellowScore(p)).toBe(0)
    p.yellow[2][0] = true
    expect(yellowScore(p)).toBe(10)
  })

  it('ergibt maximal 60 Punkte', () => {
    const p = player()
    p.yellow = p.yellow.map((row) => row.map(() => true))
    expect(yellowScore(p)).toBe(60)
  })

  it('gibt für Reihe 1 ein blaues Kreuz und für Reihe 4 einen Fuchs', () => {
    const p = player()
    p.yellow[0] = [true, true, true, true]
    p.yellow[3] = [true, true, true, true]
    const bonuses = earnedBonuses(p)
    expect(bonuses.find((b) => b.sourceId === 'yellow-row-0')?.bonus).toBe('blue')
    expect(bonuses.find((b) => b.sourceId === 'yellow-row-3')?.bonus).toBe('fox')
  })

  it('gibt +1 für die Hauptdiagonale 3–1–2–6', () => {
    const p = player()
    expect(isYellowDiagonalComplete(p)).toBe(false)
    p.yellow[0][0] = true
    p.yellow[1][1] = true
    p.yellow[2][2] = true
    p.yellow[3][3] = true
    expect(isYellowDiagonalComplete(p)).toBe(true)
    expect(earnedBonuses(p).find((b) => b.sourceId === 'yellow-diagonal')?.bonus).toBe('plus1')
  })
})

describe('blaue Wertung', () => {
  it('folgt der Punktetabelle', () => {
    const p = player()
    expect(blueScore(p)).toBe(0)
    p.blue[1][0] = true
    expect(blueScore(p)).toBe(1)
    p.blue[2][0] = true
    p.blue[0][1] = true
    p.blue[1][1] = true
    expect(blueScore(p)).toBe(7)
  })

  it('ergibt mit allen elf Kreuzen 56 Punkte', () => {
    const p = player()
    fillBlue(p)
    expect(blueScore(p)).toBe(56)
  })

  it('wertet die kurze erste Spalte (5 und 9) nach zwei Kreuzen', () => {
    const p = player()
    p.blue[1][0] = true
    p.blue[2][0] = true
    expect(earnedBonuses(p).find((b) => b.sourceId === 'blue-col-0')?.bonus).toBe('reroll')
  })

  it('wertet die erste Reihe schon nach drei Kreuzen', () => {
    const p = player()
    p.blue[0] = [false, true, true, true]
    expect(earnedBonuses(p).find((b) => b.sourceId === 'blue-row-0')?.bonus).toBe('orange5')
  })
})

describe('grüne Wertung', () => {
  it('folgt den Dreieckszahlen', () => {
    const p = player()
    p.green = 5
    expect(greenScore(p)).toBe(15)
    p.green = 11
    expect(greenScore(p)).toBe(66)
  })

  it('schaltet die Boni der Felder 4, 6, 7, 9 und 10 frei', () => {
    const p = player()
    p.green = 11
    const ids = earnedBonuses(p)
      .filter((b) => b.sourceId.startsWith('green-'))
      .map((b) => b.sourceId)
    expect(ids).toEqual(['green-3', 'green-5', 'green-6', 'green-8', 'green-9'])
  })
})

describe('orange Wertung', () => {
  it('berücksichtigt die Multiplikatoren ×2 und ×3', () => {
    const p = player()
    p.orange = p.orange.map(() => 6)
    const expected = ORANGE_STEPS.reduce((sum, step) => sum + 6 * step.multiplier, 0)
    expect(orangeScore(p)).toBe(expected)
    expect(expected).toBe(96)
  })

  it('zählt leere Felder als 0', () => {
    const p = player()
    p.orange[0] = 5
    expect(orangeScore(p)).toBe(5)
  })
})

describe('lila Wertung', () => {
  it('summiert die eingetragenen Werte', () => {
    const p = player()
    p.purple[0] = 2
    p.purple[1] = 4
    p.purple[2] = 6
    expect(purpleScore(p)).toBe(12)
  })
})

describe('Füchse', () => {
  it('werden aus allen Bereichen zusammengezählt', () => {
    const p = player()
    p.yellow[3] = [true, true, true, true] // gelbe Reihe 4
    p.green = 7 // grünes Feld 7
    expect(foxCount(p)).toBe(2)
  })

  it('multiplizieren den schwächsten Farbbereich', () => {
    const p = player()
    p.yellow = p.yellow.map((row) => row.map(() => true)) // 60
    fillBlue(p) // 56
    p.green = 11 // 66
    p.orange = p.orange.map(() => 6) // 96
    p.purple = p.purple.map(() => 6) // 66
    const score = scoreSheet(p)
    expect(score.foxValue).toBe(56)
    expect(score.foxPoints).toBe(score.foxes * 56)
    expect(score.total).toBe(60 + 56 + 66 + 96 + 66 + score.foxPoints)
  })
})

describe('offene Boni', () => {
  it('führt nur den Vorrat, keine Farbboni und keine Füchse', () => {
    const p = player()
    // Grün bis Feld 7: +1 (Vorrat), blaues Kreuz (Farbbonus) und ein Fuchs.
    p.green = 7
    const open = openBonuses(p)
    expect(open.map((entry) => entry.bonus)).toEqual(['plus1'])
    p.usedBonuses = ['green-3']
    expect(openBonuses(p)).toHaveLength(0)
  })

  it('nimmt gutgeschriebene Rundenboni auf', () => {
    const p = player()
    p.manualBonuses = [{ id: 'm1', bonus: 'plus1', origin: 'Rundenbonus 2' }]
    expect(openBonuses(p)).toHaveLength(1)
    expect(openBonuses(p)[0].origin).toBe('Rundenbonus 2')
  })
})

describe('lila Reihenfolge', () => {
  it('lässt am Anfang jeden Wert zu', () => {
    expect(purpleAllowedValues([null, null])).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('verlangt danach einen höheren Wert', () => {
    expect(purpleAllowedValues([3, null])).toEqual([4, 5, 6])
    expect(purpleAllowedValues([5, null])).toEqual([6])
  })

  it('gibt die Reihe nach einer 6 wieder frei', () => {
    expect(purpleAllowedValues([2, 5, 6, null])).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('nimmt in einer vollen Reihe nichts mehr an', () => {
    expect(purpleAllowedValues([1, 2])).toEqual([])
  })
})

describe('Reihen-Hilfsfunktionen', () => {
  it('finden das nächste freie und das letzte gefüllte Feld', () => {
    expect(nextFreeIndex([1, 2, null, null])).toBe(2)
    expect(nextFreeIndex([1, 2])).toBe(null)
    expect(lastFilledIndex([1, 2, null])).toBe(1)
    expect(lastFilledIndex([null, null])).toBe(null)
    expect(lastFilledIndex([1, 2])).toBe(1)
  })
})

describe('Solobewertung', () => {
  it('ordnet die Punktstufen zu', () => {
    expect(soloRating(300).label).toBe('Ganz schön clever!')
    expect(soloRating(281).label).toBe('Ganz schön clever!')
    expect(soloRating(280).label).toBe('Beinahe Einstein')
    expect(soloRating(139).label).toBe('Da ist noch Luft nach oben')
    expect(soloRating(0).label).toBe('Da ist noch Luft nach oben')
  })
})

describe('Rundenzahl', () => {
  it('hängt an der Spieleranzahl', () => {
    expect(roundsFor(1)).toBe(6)
    expect(roundsFor(2)).toBe(6)
    expect(roundsFor(3)).toBe(5)
    expect(roundsFor(4)).toBe(4)
  })
})
