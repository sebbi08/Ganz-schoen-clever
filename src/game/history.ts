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
  const player = state.players[state.activePlayer]
  const who = state.players.length > 1 ? `${player.name} · ` : ''

  switch (action.type) {
    case 'toggleYellow':
      return `${who}Gelb Reihe ${action.row + 1}, Spalte ${action.col + 1}`
    case 'toggleBlue':
      return `${who}Blau Reihe ${action.row + 1}, Spalte ${action.col + 1}`
    case 'setGreen':
      return `${who}Grün bis Feld ${action.count}`
    case 'setOrange':
      return `${who}Orange Feld ${action.index + 1}${action.value === null ? ' geleert' : ` = ${action.value}`}`
    case 'setPurple':
      return `${who}Lila Feld ${action.index + 1}${action.value === null ? ' geleert' : ` = ${action.value}`}`
    case 'toggleBonusUsed':
      return `${who}Bonus abgehakt`
    case 'addManualBonus':
      return `${who}${BONUSES[action.bonus].label} ergänzt`
    case 'removeManualBonus':
      return `${who}Bonus entfernt`
    case 'skipChoice':
      return `${who}Bonus verfallen lassen`
    case 'setRound':
      return `Runde ${action.round}`
    case 'addPlayer':
      return 'Spieler hinzugefügt'
    case 'removePlayer':
      return `${state.players[action.index]?.name ?? 'Spieler'} entfernt`
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
  'setRound',
  'addPlayer',
  'removePlayer',
]

/** Hat der Zug den Block tatsächlich verändert? */
function changesBoard(before: GameState, after: GameState): boolean {
  return (
    before.players !== after.players ||
    before.pendingChoices !== after.pendingChoices ||
    before.round !== after.round
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
  if (action.type === 'newGame' || action.type === 'resetSheets') {
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
  players?: GameState['players']
}

export function loadHistory(): HistoryState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredShape
    const present = parsed.present ?? (parsed.players ? (parsed as unknown as GameState) : null)
    if (!present || !Array.isArray(present.players) || present.players.length === 0) return null
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

export function createHistory(playerCount = 1): HistoryState {
  return { present: createGame(playerCount), past: [] }
}
