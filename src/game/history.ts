import { BONUSES } from './layout'
import type { Action } from './state'
import { createGame, migrateState, reducer } from './state'
import type { GameState } from './types'

/**
 * Globaler Verlauf über alle Spieler.
 *
 * Gesetzte Felder lassen sich nicht mehr einzeln zurücknehmen – ein Kreuz
 * oder eine Zahl steht, sobald sie steht. Korrigiert wird ausschließlich
 * über diesen Verlauf, der ganze Züge samt ausgelöster Boni zurücknimmt.
 */

export const MAX_HISTORY = 30

export interface HistoryEntry {
  /** Zustand *vor* dem Zug. */
  state: GameState
  label: string
}

export interface HistoryState {
  present: GameState
  past: HistoryEntry[]
}

export type HistoryAction = Action | { type: 'undo'; steps: number }

/** Kurzbeschreibung eines Zuges, gebildet aus dem Zustand davor. */
export function describe(state: GameState, action: Action): string {
  switch (action.type) {
    case 'toggleYellow':
      return `Gelb Reihe ${action.row + 1}, Spalte ${action.col + 1}`
    case 'toggleBlue':
      return `Blau Reihe ${action.row + 1}, Spalte ${action.col + 1}`
    case 'setGreen':
      return `Grün bis Feld ${action.count}`
    case 'setOrange':
      return `Orange Feld ${action.index + 1}${action.value === null ? ' geleert' : ` = ${action.value}`}`
    case 'setPurple':
      return `Lila Feld ${action.index + 1}${action.value === null ? ' geleert' : ` = ${action.value}`}`
    case 'toggleBonusUsed':
      return `Bonus abgehakt`
    case 'addManualBonus':
      return `${BONUSES[action.bonus].label} ergänzt`
    case 'removeManualBonus':
      return `Bonus entfernt`
    case 'skipChoice':
      return `Bonus verfallen lassen`
    case 'completeRound':
      return `Runde ${state.round} abgeschlossen`
    default:
      return 'Zug'
  }
}

/**
 * Züge, die in den Verlauf gehören. Umbenennen, Spielerwechsel und das
 * Wegklicken einer Meldung sind keine Züge.
 */
const UNDOABLE: Action['type'][] = [
  'toggleYellow',
  'toggleBlue',
  'setGreen',
  'setOrange',
  'setPurple',
  'toggleBonusUsed',
  'addManualBonus',
  'removeManualBonus',
  'skipChoice',
  'completeRound',
]

/** Hat der Zug den Block tatsächlich verändert? */
function changesBoard(before: GameState, after: GameState): boolean {
  return (
    before.player !== after.player ||
    before.pendingChoices !== after.pendingChoices ||
    before.round !== after.round ||
    before.claimedRounds !== after.claimedRounds
  )
}

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  if (action.type === 'undo') {
    const steps = Math.min(Math.max(1, action.steps), state.past.length)
    if (steps === 0) return state
    const target = state.past[state.past.length - steps]
    return {
      // Alte Meldungen nicht erneut einblenden.
      present: { ...target.state, notifications: [] },
      past: state.past.slice(0, state.past.length - steps),
    }
  }

  const present = reducer(state.present, action)
  if (present === state.present) return state

  // Ein frischer Block startet ohne Verlauf.
  if (action.type === 'newGame') {
    return { present, past: [] }
  }

  if (!UNDOABLE.includes(action.type) || !changesBoard(state.present, present)) {
    return { ...state, present }
  }

  const entry: HistoryEntry = { state: state.present, label: describe(state.present, action) }
  return {
    present,
    past: [...state.past, entry].slice(-MAX_HISTORY),
  }
}

/* ------------------------------------------------------------- Persistenz */

export const STORAGE_KEY = 'gsc-punkteblock-v1'

interface StoredShape {
  present?: GameState
  past?: HistoryEntry[]
  /** Ältere Stände speicherten den Spielzustand direkt. */
  player?: GameState['player']
  players?: GameState['player'][]
  activePlayer?: number
}

export function loadHistory(): HistoryState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredShape
    const present = parsed.present ?? (parsed.player || parsed.players ? parsed : null)
    if (!present) return null
    return {
      present: migrateState(present),
      past: (parsed.past ?? []).map((entry) => ({
        label: entry.label,
        state: migrateState(entry.state),
      })),
    }
  } catch {
    return null
  }
}

export function saveHistory(state: HistoryState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Privater Modus o. Ä. – dann läuft die App eben ohne Speicherung.
  }
}

export function createHistory(tableSize = 1): HistoryState {
  return { present: createGame(tableSize), past: [] }
}
