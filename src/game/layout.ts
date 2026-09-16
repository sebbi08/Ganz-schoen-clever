/**
 * Layout des Wertungsblocks von "Ganz schön clever" (Schmidt Spiele),
 * abgelesen vom Originalblock.
 *
 * Diese Datei ist die einzige Stelle, an der der Block beschrieben wird –
 * Zahlen, Bonusfelder, Multiplikatoren und Punktetabellen. Wer eine Variante
 * abbilden will, ändert nur hier.
 *
 * Was tatsächlich gewürfelt wird, interessiert die App nicht: Es gibt keine
 * Würfel und keine Regelprüfung, nur den Block und die Auswertung.
 */

export type BonusId =
  | 'reroll'
  | 'plus1'
  | 'fox'
  | 'yellow'
  | 'blue'
  | 'green'
  | 'orange4'
  | 'orange5'
  | 'orange6'
  | 'purple6'
  | 'anyCrossOr6'

export interface BonusInfo {
  /** Ausgeschriebene Bedeutung. */
  label: string
  /** Kurzzeichen für die Bonus-Chips. */
  short: string
  /**
   * fox    = wird automatisch gezählt
   * action = Vorrat, wird später eingelöst (Wiederholungswurf, +1)
   * mark   = Farbbonus, wird sofort verarbeitet
   * manual = mehrdeutig, bleibt zum Abhaken in der Liste
   */
  kind: 'fox' | 'action' | 'mark' | 'manual'
  /** Farbgebung des Chips. */
  color: 'neutral' | 'fox' | 'yellow' | 'blue' | 'green' | 'orange' | 'purple'
}

export const BONUSES: Record<BonusId, BonusInfo> = {
  reroll: { label: 'Wiederholungswurf', short: '↻', kind: 'action', color: 'neutral' },
  plus1: { label: '+1 auf einen Würfel', short: '+1', kind: 'action', color: 'neutral' },
  fox: { label: 'Fuchs', short: '🦊', kind: 'fox', color: 'fox' },
  yellow: { label: 'Gelbes Kreuz (frei wählbar)', short: '✗', kind: 'mark', color: 'yellow' },
  blue: { label: 'Blaues Kreuz (frei wählbar)', short: '✗', kind: 'mark', color: 'blue' },
  green: { label: 'Grünes Kreuz', short: '✗', kind: 'mark', color: 'green' },
  orange4: { label: 'Orange 4 eintragen', short: '4', kind: 'mark', color: 'orange' },
  orange5: { label: 'Orange 5 eintragen', short: '5', kind: 'mark', color: 'orange' },
  orange6: { label: 'Orange 6 eintragen', short: '6', kind: 'mark', color: 'orange' },
  purple6: { label: 'Lila 6 eintragen', short: '6', kind: 'mark', color: 'purple' },
  anyCrossOr6: {
    label: 'Beliebiges Kreuz oder eine 6',
    short: '✗/6',
    kind: 'manual',
    color: 'neutral',
  },
}

export const ALL_BONUS_IDS = Object.keys(BONUSES) as BonusId[]

/* ------------------------------------------------------------------ gelb */

/**
 * 4x4-Raster. `null` = Feld ist von Anfang an angekreuzt (Nebendiagonale).
 * Die übrigen zwölf Felder tragen die Ziffern 1–6 je zweimal.
 */
export const YELLOW_GRID: readonly (readonly (number | null)[])[] = [
  [3, 6, 5, null],
  [2, 1, null, 5],
  [1, null, 2, 4],
  [null, 3, 4, 6],
]

/** Bonus für eine komplett angekreuzte waagerechte Reihe (oben → unten). */
export const YELLOW_ROW_BONUS: readonly BonusId[] = ['blue', 'orange4', 'green', 'fox']

/** Siegpunkte für eine komplett angekreuzte Spalte (links → rechts). */
export const YELLOW_COLUMN_POINTS: readonly number[] = [10, 14, 16, 20]

/** Bonus für die Hauptdiagonale 3–1–2–6 (oben links → unten rechts). */
export const YELLOW_DIAGONAL_BONUS: BonusId = 'plus1'

/* ------------------------------------------------------------------ blau */

/**
 * 3x4-Raster mit den Summen 2–12; das Feld oben links existiert nicht
 * (dort steht auf dem Block das Symbol "blauer + weißer Würfel").
 */
export const BLUE_GRID: readonly (readonly (number | null)[])[] = [
  [null, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
]

/** Bonus für eine komplette waagerechte Reihe (oben → unten). */
export const BLUE_ROW_BONUS: readonly BonusId[] = ['orange5', 'yellow', 'fox']

/** Bonus für eine komplette Spalte (links → rechts). */
export const BLUE_COLUMN_BONUS: readonly BonusId[] = ['reroll', 'green', 'purple6', 'plus1']

/** Siegpunkte nach Anzahl der Kreuze (Index = Anzahl, 0–11). */
export const BLUE_POINTS: readonly number[] = [0, 1, 2, 4, 7, 11, 16, 22, 29, 37, 46, 56]

/* ------------------------------------------------------------------ grün */

export interface GreenStep {
  /** Aufdruck des Feldes: der grüne Würfel muss mindestens so hoch sein. */
  min: number
  bonus?: BonusId
}

export const GREEN_STEPS: readonly GreenStep[] = [
  { min: 1 },
  { min: 2 },
  { min: 3 },
  { min: 4, bonus: 'plus1' },
  { min: 5 },
  { min: 1, bonus: 'blue' },
  { min: 2, bonus: 'fox' },
  { min: 3 },
  { min: 4, bonus: 'purple6' },
  { min: 5, bonus: 'reroll' },
  { min: 6 },
]

/** Siegpunkte nach Anzahl gefüllter Felder (Index = Anzahl, 0–11). */
export const GREEN_POINTS: readonly number[] = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66]

/* ---------------------------------------------------------------- orange */

export interface OrangeStep {
  /** Der eingetragene Wert zählt ×1, ×2 oder ×3. */
  multiplier: 1 | 2 | 3
  bonus?: BonusId
}

export const ORANGE_STEPS: readonly OrangeStep[] = [
  { multiplier: 1 },
  { multiplier: 1 },
  { multiplier: 1, bonus: 'reroll' },
  { multiplier: 2 },
  { multiplier: 1, bonus: 'yellow' },
  { multiplier: 1, bonus: 'plus1' },
  { multiplier: 2 },
  { multiplier: 1, bonus: 'fox' },
  { multiplier: 2 },
  { multiplier: 1, bonus: 'purple6' },
  { multiplier: 3 },
]

/* ------------------------------------------------------------------ lila */

export interface PurpleStep {
  bonus?: BonusId
}

export const PURPLE_STEPS: readonly PurpleStep[] = [
  {},
  {},
  { bonus: 'reroll' },
  { bonus: 'blue' },
  { bonus: 'plus1' },
  { bonus: 'yellow' },
  { bonus: 'fox' },
  { bonus: 'reroll' },
  { bonus: 'green' },
  { bonus: 'orange6' },
  { bonus: 'plus1' },
]

/* ---------------------------------------------------------------- Runden */

export interface RoundInfo {
  /** Rundenbonus, den jeder Spieler am Ende der Runde erhält. */
  bonus?: BonusId
  /** Bis zu wie vielen Spielern diese Runde noch gespielt wird. */
  maxPlayers: number
}

export const ROUNDS: readonly RoundInfo[] = [
  { bonus: 'reroll', maxPlayers: 4 },
  { bonus: 'plus1', maxPlayers: 4 },
  { bonus: 'reroll', maxPlayers: 4 },
  { bonus: 'anyCrossOr6', maxPlayers: 4 },
  { maxPlayers: 3 },
  { maxPlayers: 2 },
]

/** Runden 1–4 immer, Runde 5 bis 3 Spieler, Runde 6 bis 2 Spieler. */
export function roundsFor(playerCount: number): number {
  return ROUNDS.filter((round) => playerCount <= round.maxPlayers).length
}

/** Farbboni, die eine freie Wahl im Raster verlangen. */
export type PickBonus = 'yellow' | 'blue'

/** Zahlenboni: Wert, der direkt in die jeweilige Reihe geschrieben wird. */
export const NUMBER_BONUS: Partial<Record<BonusId, { row: 'orange' | 'purple'; value: number }>> = {
  orange4: { row: 'orange', value: 4 },
  orange5: { row: 'orange', value: 5 },
  orange6: { row: 'orange', value: 6 },
  purple6: { row: 'purple', value: 6 },
}
