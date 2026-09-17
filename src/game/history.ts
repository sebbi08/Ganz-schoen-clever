import { BLUE_GRID, BONUSES } from './layout'
import { earnedBonuses } from './scoring'
import type { BonusInfo } from './layout'
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
  /** Farbe des Bereichs, den der Zug betraf. */
  tone: BonusInfo['color']
}

export interface HistoryState {
  present: GameState
  past: HistoryEntry[]
  /**
   * Zurückgenommene Züge, ältester zuerst – bereit zum Wiederholen.
   * Ihr `state` ist der Zustand *nach* dem jeweiligen Zug. Sobald ein
   * echter Zug kommt, ist der Stapel hinfällig.
   */
  future: HistoryEntry[]
}

export type HistoryAction =
  | Action
  | { type: 'undo'; steps: number }
  | { type: 'redo'; steps: number }

type Described = Pick<HistoryEntry, 'label' | 'tone'>

/** Beschreibung und Farbe eines Zuges, gebildet aus dem Zustand davor. */
export function describe(state: GameState, action: Action): Described {
  switch (action.type) {
    case 'markYellow':
      return { label: `Gelbes Kreuz · Reihe ${action.row + 1}, Spalte ${action.col + 1}`, tone: 'yellow' }
    case 'markBlue': {
      const value = BLUE_GRID[action.row][action.col]
      return { label: `Blaues Kreuz · ${value ?? ''}`, tone: 'blue' }
    }
    case 'setGreen':
      return { label: `Grünes Kreuz · Feld ${action.count}`, tone: 'green' }
    case 'setOrange':
      return action.value === null
        ? { label: `Orange Feld ${action.index + 1} geleert`, tone: 'orange' }
        : { label: `Orange ${action.value} · Feld ${action.index + 1}`, tone: 'orange' }
    case 'setPurple':
      return action.value === null
        ? { label: `Lila Feld ${action.index + 1} geleert`, tone: 'purple' }
        : { label: `Lila ${action.value} · Feld ${action.index + 1}`, tone: 'purple' }
    case 'useBonus': {
      const bonus = earnedBonuses(state.player).find(
        (entry) => entry.sourceId === action.sourceId,
      )?.bonus
      return {
        label: bonus ? `${BONUSES[bonus].label} eingelöst` : 'Bonus eingelöst',
        tone: 'neutral',
      }
    }
    case 'resolveBonus': {
      const entry = state.bonusQueue.find((candidate) => candidate.sourceId === action.sourceId)
      if (!entry) return { label: 'Bonus eingetragen', tone: 'neutral' }
      const info = BONUSES[entry.bonus]
      return { label: `${info.label} · ${entry.origin}`, tone: info.color }
    }
    case 'skipChoice':
      return { label: 'Bonus verfallen lassen', tone: 'fox' }
    case 'completeRound':
      return { label: `Runde ${state.round} abgeschlossen`, tone: 'neutral' }
    case 'finishGame':
      return { label: 'Spiel beendet', tone: 'neutral' }
    default:
      return { label: 'Zug', tone: 'neutral' }
  }
}

/**
 * Züge, die in den Verlauf gehören. Umbenennen, Spielerwechsel und das
 * Wegklicken einer Meldung sind keine Züge.
 */
const UNDOABLE: Action['type'][] = [
  'markYellow',
  'markBlue',
  'setGreen',
  'setOrange',
  'setPurple',
  'useBonus',
  'skipChoice',
  'resolveBonus',
  'completeRound',
  'finishGame',
]

/** Hat der Zug den Block tatsächlich verändert? */
function changesBoard(before: GameState, after: GameState): boolean {
  return (
    before.player !== after.player ||
    before.pendingChoices !== after.pendingChoices ||
    before.bonusQueue !== after.bonusQueue ||
    before.round !== after.round ||
    before.claimedRounds !== after.claimedRounds ||
    before.finished !== after.finished
  )
}

/** Aktionen, die den Wiederholen-Stapel stehen lassen. */
const KEEPS_FUTURE: Action['type'][] = ['dismissNotification']

/** Alte Meldungen nicht erneut einblenden. */
function quiet(state: GameState): GameState {
  return { ...state, notifications: [] }
}

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  if (action.type === 'undo') {
    const steps = Math.min(Math.max(1, action.steps), state.past.length)
    if (steps === 0) return state
    const cut = state.past.length - steps
    const undone = state.past.slice(cut)
    // Zum Wiederholen brauchen wir den Zustand *nach* jedem Zug. Der steht
    // im jeweils nächsten Eintrag – für den letzten ist es die Gegenwart.
    const future = undone.map((entry, index) => ({
      label: entry.label,
      tone: entry.tone,
      state: index + 1 < undone.length ? undone[index + 1].state : state.present,
    }))
    return {
      present: quiet(state.past[cut].state),
      past: state.past.slice(0, cut),
      future: [...future, ...state.future],
    }
  }

  if (action.type === 'redo') {
    const steps = Math.min(Math.max(1, action.steps), state.future.length)
    if (steps === 0) return state
    const redone = state.future.slice(0, steps)
    // Die wiederholten Züge wandern zurück in den Verlauf; ihr "davor" ist
    // die Gegenwart beziehungsweise der Vorgänger im Stapel.
    const past = redone.map((entry, index) => ({
      label: entry.label,
      tone: entry.tone,
      state: index === 0 ? state.present : redone[index - 1].state,
    }))
    return {
      present: quiet(redone[steps - 1].state),
      past: [...state.past, ...past].slice(-MAX_HISTORY),
      future: state.future.slice(steps),
    }
  }

  const present = reducer(state.present, action)
  if (present === state.present) return state

  // Ein frischer Block startet ohne Verlauf.
  if (action.type === 'newGame') {
    return { present, past: [], future: [] }
  }

  // Jeder echte Zug macht das Wiederholen hinfällig.
  const future = KEEPS_FUTURE.includes(action.type) ? state.future : []

  if (!UNDOABLE.includes(action.type) || !changesBoard(state.present, present)) {
    return { ...state, present, future }
  }

  const entry: HistoryEntry = { state: state.present, ...describe(state.present, action) }
  return {
    present,
    past: [...state.past, entry].slice(-MAX_HISTORY),
    future,
  }
}

/* ------------------------------------------------------------- Persistenz */

export const STORAGE_KEY = 'gsc-punkteblock-v1'

interface StoredShape {
  present?: GameState
  past?: HistoryEntry[]
  future?: HistoryEntry[]
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
    const entries = (list: HistoryEntry[] | undefined) =>
      (list ?? []).map((entry) => ({
        label: entry.label,
        tone: entry.tone ?? 'neutral',
        state: migrateState(entry.state),
      }))
    return {
      present: migrateState(present),
      past: entries(parsed.past),
      future: entries(parsed.future),
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
  return { present: createGame(tableSize), past: [], future: [] }
}
