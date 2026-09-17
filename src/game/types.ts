import type { BonusId, BonusInfo, PickBonus } from './layout'

export interface ManualBonus {
  /** Woher der Bonus kommt, z. B. "Rundenbonus 2". */
  origin: string
  id: string
  bonus: BonusId
}

export interface PlayerState {
  /** 4x4; vorgekreuzte Diagonalfelder sind dauerhaft true. */
  yellow: boolean[][]
  /** 3x4; das nicht existierende Feld oben links ist dauerhaft false. */
  blue: boolean[][]
  /** Anzahl der von links gefüllten grünen Felder. */
  green: number
  /** Eingetragene Würfelwerte, `null` = noch leer. */
  orange: (number | null)[]
  purple: (number | null)[]
  /** Farbboni, die bereits sofort verarbeitet wurden (sourceId). */
  resolvedBonuses: string[]
  /** Eingelöste Vorratsboni: Wiederholungswurf, +1 (sourceId). */
  usedBonuses: string[]
  /** Zusätzlich gutgeschriebene Boni – heute sind das die Rundenboni. */
  manualBonuses: ManualBonus[]
}

/** Ein Farbbonus, der eine freie Wahl im gelben oder blauen Raster verlangt. */
export interface PendingChoice {
  sourceId: string
  bonus: PickBonus
  origin: string
}

export interface Notification {
  id: string
  text: string
  tone: BonusInfo['color']
}

export interface GameState {
  /** Die Seite führt genau einen Block; Mitspieler öffnen sie je selbst. */
  player: PlayerState
  round: number
  /** Nur für die Rundenzahl: wie viele am Tisch sitzen. */
  tableSize: number
  /** Runden, deren Bonus bereits gutgeschrieben wurde. */
  claimedRounds: number[]
  /** Offene Zwangsauswahl; solange etwas darin liegt, ist der Block gesperrt. */
  pendingChoices: PendingChoice[]
  /** Kurzmeldungen über verarbeitete Boni. */
  notifications: Notification[]
}

export interface EarnedBonus {
  /** Stabile Kennung des Bonusfeldes, z. B. "yellow-row-0". */
  sourceId: string
  bonus: BonusId
  /** Woher der Bonus stammt, für die Anzeige. */
  origin: string
}

export interface Score {
  yellow: number
  blue: number
  green: number
  orange: number
  purple: number
  /** Anzahl gesammelter Füchse. */
  foxes: number
  /** Punktwert des schwächsten Farbbereichs. */
  foxValue: number
  foxPoints: number
  total: number
}
