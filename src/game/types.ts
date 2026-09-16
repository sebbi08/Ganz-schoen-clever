import type { BonusId } from './layout'

export interface ManualBonus {
  /** Woher der Bonus kommt, z. B. "Rundenbonus 2". */
  origin: string
  id: string
  bonus: BonusId
}

export interface PlayerState {
  id: string
  name: string
  /** 4x4; vorgekreuzte Diagonalfelder sind dauerhaft true. */
  yellow: boolean[][]
  /** 3x4; das nicht existierende Feld oben links ist dauerhaft false. */
  blue: boolean[][]
  /** Anzahl der von links gefüllten grünen Felder. */
  green: number
  /** Eingetragene Würfelwerte, `null` = noch leer. */
  orange: (number | null)[]
  purple: (number | null)[]
  /** Bereits eingelöste Boni (sourceId). */
  usedBonuses: string[]
  /** Von Hand ergänzte Boni, z. B. Rundenboni. */
  manualBonuses: ManualBonus[]
}

export interface GameState {
  players: PlayerState[]
  activePlayer: number
  round: number
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
