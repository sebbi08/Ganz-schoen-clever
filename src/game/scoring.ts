import {
  BLUE_COLUMN_BONUS,
  BLUE_GRID,
  BLUE_POINTS,
  BLUE_ROW_BONUS,
  GREEN_POINTS,
  GREEN_STEPS,
  ORANGE_STEPS,
  PURPLE_STEPS,
  YELLOW_COLUMN_POINTS,
  YELLOW_DIAGONAL_BONUS,
  YELLOW_GRID,
  YELLOW_ROW_BONUS,
} from './layout'
import type { EarnedBonus, PlayerState, Score } from './types'

/* ------------------------------------------------------------ Grundgerüst */

export function createPlayer(id: string, name: string): PlayerState {
  return {
    id,
    name,
    // Die Nebendiagonale ist von Anfang an angekreuzt.
    yellow: YELLOW_GRID.map((row) => row.map((cell) => cell === null)),
    blue: BLUE_GRID.map((row) => row.map(() => false)),
    green: 0,
    orange: ORANGE_STEPS.map(() => null),
    purple: PURPLE_STEPS.map(() => null),
    usedBonuses: [],
    manualBonuses: [],
  }
}

/** Vorgekreuzte Diagonalfelder lassen sich nicht abwählen. */
export function isYellowLocked(row: number, col: number): boolean {
  return YELLOW_GRID[row][col] === null
}

/** Das Feld oben links im blauen Raster existiert nicht. */
export function isBlueGap(row: number, col: number): boolean {
  return BLUE_GRID[row][col] === null
}

/** Nächstes freies Feld einer Reihe, oder `null` wenn die Reihe voll ist. */
export function nextFreeIndex(values: readonly (number | null)[]): number | null {
  const index = values.findIndex((value) => value === null)
  return index === -1 ? null : index
}

/** Letztes gefülltes Feld einer Reihe, oder `null` wenn sie leer ist. */
export function lastFilledIndex(values: readonly (number | null)[]): number | null {
  const next = nextFreeIndex(values)
  const index = next === null ? values.length - 1 : next - 1
  return index < 0 ? null : index
}

/* ------------------------------------------------------------------ Punkte */

export function yellowScore(player: PlayerState): number {
  let points = 0
  for (let col = 0; col < YELLOW_COLUMN_POINTS.length; col++) {
    if (player.yellow.every((row) => row[col])) points += YELLOW_COLUMN_POINTS[col]
  }
  return points
}

export function blueMarkCount(player: PlayerState): number {
  return player.blue.flat().filter(Boolean).length
}

export function blueScore(player: PlayerState): number {
  return BLUE_POINTS[blueMarkCount(player)] ?? 0
}

export function greenScore(player: PlayerState): number {
  return GREEN_POINTS[player.green] ?? 0
}

export function orangeScore(player: PlayerState): number {
  return player.orange.reduce<number>(
    (sum, value, index) => sum + (value ?? 0) * ORANGE_STEPS[index].multiplier,
    0,
  )
}

export function purpleScore(player: PlayerState): number {
  return player.purple.reduce<number>((sum, value) => sum + (value ?? 0), 0)
}

/* ------------------------------------------------------------------- Boni */

/** Ist die gelbe Hauptdiagonale (3–1–2–6) komplett? */
export function isYellowDiagonalComplete(player: PlayerState): boolean {
  return player.yellow.every((row, index) => row[index])
}

/**
 * Alle freigeschalteten Boni – immer frisch aus dem Blockzustand berechnet.
 * Dadurch verschwindet ein Bonus automatisch wieder, wenn ein Kreuz
 * zurückgenommen wird.
 */
export function earnedBonuses(player: PlayerState): EarnedBonus[] {
  const result: EarnedBonus[] = []

  player.yellow.forEach((row, index) => {
    if (!row.every(Boolean)) return
    const sourceId = `yellow-row-${index}`
    result.push({
      sourceId,
      bonus: YELLOW_ROW_BONUS[index],
      origin: `Gelb – Reihe ${index + 1}`,
    })
  })

  if (isYellowDiagonalComplete(player)) {
    const sourceId = 'yellow-diagonal'
    result.push({
      sourceId,
      bonus: YELLOW_DIAGONAL_BONUS,
      origin: 'Gelb – Diagonale',
    })
  }

  player.blue.forEach((row, index) => {
    const complete = row.every((cell, col) => isBlueGap(index, col) || cell)
    if (!complete) return
    const sourceId = `blue-row-${index}`
    result.push({
      sourceId,
      bonus: BLUE_ROW_BONUS[index],
      origin: `Blau – Reihe ${index + 1}`,
    })
  })

  for (let col = 0; col < BLUE_COLUMN_BONUS.length; col++) {
    const complete = player.blue.every((row, rowIndex) => isBlueGap(rowIndex, col) || row[col])
    if (!complete) continue
    const sourceId = `blue-col-${col}`
    result.push({
      sourceId,
      bonus: BLUE_COLUMN_BONUS[col],
      origin: `Blau – Spalte ${col + 1}`,
    })
  }

  GREEN_STEPS.forEach((step, index) => {
    if (!step.bonus || player.green <= index) return
    const sourceId = `green-${index}`
    result.push({
      sourceId,
      bonus: step.bonus,
      origin: `Grün – Feld ${index + 1}`,
    })
  })

  ORANGE_STEPS.forEach((step, index) => {
    if (!step.bonus || player.orange[index] === null) return
    const sourceId = `orange-${index}`
    result.push({
      sourceId,
      bonus: step.bonus,
      origin: `Orange – Feld ${index + 1}`,
    })
  })

  PURPLE_STEPS.forEach((step, index) => {
    if (!step.bonus || player.purple[index] === null) return
    const sourceId = `purple-${index}`
    result.push({
      sourceId,
      bonus: step.bonus,
      origin: `Lila – Feld ${index + 1}`,
    })
  })

  player.manualBonuses.forEach((manual) => {
    result.push({
      sourceId: manual.id,
      bonus: manual.bonus,
      origin: manual.origin,
    })
  })

  return result
}

export function foxCount(player: PlayerState): number {
  return earnedBonuses(player).filter((entry) => entry.bonus === 'fox').length
}

/**
 * Offene Boni: alles außer Füchsen, das noch nicht abgehakt wurde.
 * Füchse zählen automatisch und tauchen hier nicht auf.
 */
export function openBonuses(player: PlayerState): EarnedBonus[] {
  const used = new Set(player.usedBonuses)
  return earnedBonuses(player).filter(
    (entry) => entry.bonus !== 'fox' && !used.has(entry.sourceId),
  )
}

/* ---------------------------------------------------------------- Wertung */

export function scoreSheet(player: PlayerState): Score {
  const yellow = yellowScore(player)
  const blue = blueScore(player)
  const green = greenScore(player)
  const orange = orangeScore(player)
  const purple = purpleScore(player)
  const foxes = foxCount(player)
  const foxValue = Math.min(yellow, blue, green, orange, purple)
  const foxPoints = foxes * foxValue
  return {
    yellow,
    blue,
    green,
    orange,
    purple,
    foxes,
    foxValue,
    foxPoints,
    total: yellow + blue + green + orange + purple + foxPoints,
  }
}
