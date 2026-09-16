import { BONUSES, ROUNDS, roundsFor } from './layout'
import type { BonusId } from './layout'
import { resolveBonuses } from './bonuses'
import { createPlayer, earnedBonuses } from './scoring'
import type { GameState, PlayerState } from './types'

const DEFAULT_NAMES = ['Spieler 1', 'Spieler 2', 'Spieler 3', 'Spieler 4', 'Spieler 5', 'Spieler 6']

let idCounter = 0
function nextId(prefix: string): string {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`
}

export function createGame(playerCount = 1): GameState {
  return {
    players: Array.from({ length: playerCount }, (_, index) =>
      createPlayer(nextId('p'), DEFAULT_NAMES[index] ?? `Spieler ${index + 1}`),
    ),
    activePlayer: 0,
    round: 1,
    claimedRounds: [],
    pendingChoices: [],
    notifications: [],
  }
}

export type Action =
  | { type: 'toggleYellow'; row: number; col: number }
  | { type: 'toggleBlue'; row: number; col: number }
  | { type: 'setGreen'; count: number }
  | { type: 'setOrange'; index: number; value: number | null }
  | { type: 'setPurple'; index: number; value: number | null }
  | { type: 'toggleBonusUsed'; sourceId: string }
  | { type: 'addManualBonus'; bonus: BonusId; origin: string }
  | { type: 'removeManualBonus'; id: string }
  | { type: 'addPlayer' }
  | { type: 'removePlayer'; index: number }
  | { type: 'renamePlayer'; index: number; name: string }
  | { type: 'selectPlayer'; index: number }
  | { type: 'setRound'; round: number }
  | { type: 'completeRound' }
  | { type: 'skipChoice' }
  | { type: 'dismissNotification'; id: string }
  | { type: 'resetSheets' }
  | { type: 'newGame'; playerCount: number }
  | { type: 'replace'; state: GameState }

function updateActive(
  state: GameState,
  update: (player: PlayerState) => PlayerState,
): GameState {
  return {
    ...state,
    players: state.players.map((player, index) =>
      index === state.activePlayer ? update(player) : player,
    ),
  }
}

/** Aktionen, die auch bei offener Zwangsauswahl erlaubt bleiben. */
const ALWAYS_ALLOWED: Action['type'][] = [
  'toggleYellow',
  'toggleBlue',
  'skipChoice',
  'dismissNotification',
  'renamePlayer',
  'resetSheets',
  'newGame',
  'replace',
]

export function reducer(state: GameState, action: Action): GameState {
  // Solange ein Farbbonus auf seine Auswahl wartet, ist der Rest gesperrt.
  if (state.pendingChoices.length > 0 && !ALWAYS_ALLOWED.includes(action.type)) {
    return state
  }
  return resolveBonuses(apply(state, action))
}

function apply(state: GameState, action: Action): GameState {
  const choice = state.pendingChoices[0]

  switch (action.type) {
    case 'toggleYellow':
    case 'toggleBlue': {
      const area = action.type === 'toggleYellow' ? 'yellow' : 'blue'
      const marked = state.players[state.activePlayer][area][action.row][action.col]

      if (choice) {
        // Erzwungene Auswahl: nur ein freies Feld im geforderten Bereich.
        if (choice.bonus !== area || marked) return state
        const next = updateActive(state, (player) => ({
          ...player,
          [area]: player[area].map((row, r) =>
            r === action.row ? row.map((cell, c) => (c === action.col ? true : cell)) : row,
          ),
        }))
        return { ...next, pendingChoices: next.pendingChoices.slice(1) }
      }

      return updateActive(state, (player) => ({
        ...player,
        [area]: player[area].map((row, r) =>
          r === action.row ? row.map((cell, c) => (c === action.col ? !cell : cell)) : row,
        ),
      }))
    }

    case 'setGreen':
      return updateActive(state, (player) => ({ ...player, green: action.count }))

    case 'setOrange':
      return updateActive(state, (player) => ({
        ...player,
        orange: player.orange.map((value, index) => (index === action.index ? action.value : value)),
      }))

    case 'setPurple':
      return updateActive(state, (player) => ({
        ...player,
        purple: player.purple.map((value, index) => (index === action.index ? action.value : value)),
      }))

    case 'toggleBonusUsed':
      return updateActive(state, (player) => ({
        ...player,
        usedBonuses: player.usedBonuses.includes(action.sourceId)
          ? player.usedBonuses.filter((id) => id !== action.sourceId)
          : [...player.usedBonuses, action.sourceId],
      }))

    case 'addManualBonus':
      return updateActive(state, (player) => ({
        ...player,
        manualBonuses: [
          ...player.manualBonuses,
          { id: nextId('manual'), bonus: action.bonus, origin: action.origin },
        ],
      }))

    case 'removeManualBonus':
      return updateActive(state, (player) => ({
        ...player,
        manualBonuses: player.manualBonuses.filter((entry) => entry.id !== action.id),
        usedBonuses: player.usedBonuses.filter((id) => id !== action.id),
      }))

    case 'addPlayer': {
      if (state.players.length >= 6) return state
      const index = state.players.length
      return {
        ...state,
        players: [
          ...state.players,
          createPlayer(nextId('p'), DEFAULT_NAMES[index] ?? `Spieler ${index + 1}`),
        ],
        activePlayer: index,
      }
    }

    case 'removePlayer': {
      if (state.players.length <= 1) return state
      const players = state.players.filter((_, index) => index !== action.index)
      return {
        ...state,
        players,
        activePlayer: Math.min(state.activePlayer, players.length - 1),
      }
    }

    case 'renamePlayer':
      return {
        ...state,
        players: state.players.map((player, index) =>
          index === action.index ? { ...player, name: action.name } : player,
        ),
      }

    case 'selectPlayer':
      return { ...state, activePlayer: action.index }

    case 'setRound':
      return { ...state, round: Math.max(1, action.round) }

    case 'completeRound': {
      const total = roundsFor(state.players.length)
      const info = ROUNDS[state.round - 1]
      const next = Math.min(total, state.round + 1)
      // Jeder Rundenbonus wird nur einmal verteilt.
      if (!info?.bonus || state.claimedRounds.includes(state.round)) {
        return { ...state, round: next }
      }
      const origin = `Rundenbonus ${state.round}`
      return {
        ...state,
        round: next,
        claimedRounds: [...state.claimedRounds, state.round],
        // Am Ende der Runde bekommt ihn jeder Spieler.
        players: state.players.map((player) => {
          const id = nextId('round')
          return {
            ...player,
            manualBonuses: [...player.manualBonuses, { id, bonus: info.bonus!, origin }],
            // Gleich als verarbeitet markieren, sonst meldet er sich später
            // noch einmal, sobald der Spieler an der Reihe ist.
            resolvedBonuses: [...player.resolvedBonuses, id],
          }
        }),
        notifications: [
          ...state.notifications,
          {
            id: nextId('n'),
            text: `${origin}: ${BONUSES[info.bonus].label} für alle`,
            tone: BONUSES[info.bonus].color,
          },
        ],
      }
    }

    case 'skipChoice':
      return { ...state, pendingChoices: state.pendingChoices.slice(1) }

    case 'dismissNotification':
      return {
        ...state,
        notifications: state.notifications.filter((entry) => entry.id !== action.id),
      }

    case 'resetSheets':
      return {
        ...state,
        round: 1,
        claimedRounds: [],
        pendingChoices: [],
        notifications: [],
        players: state.players.map((player) => createPlayer(player.id, player.name)),
      }

    case 'newGame':
      return createGame(action.playerCount)

    case 'replace':
      return action.state

    default:
      return state
  }
}

/* ------------------------------------------------------ Ältere Spielstände */

/** Füllt fehlende Felder auf und macht einen geladenen Stand benutzbar. */
export function migrateState(parsed: GameState): GameState {
  return {
    ...parsed,
    activePlayer: Math.min(parsed.activePlayer ?? 0, parsed.players.length - 1),
    round: parsed.round ?? 1,
    claimedRounds: parsed.claimedRounds ?? [],
    pendingChoices: parsed.pendingChoices ?? [],
    notifications: [],
    players: parsed.players.map((player) => {
      const migrated = {
        ...player,
        usedBonuses: player.usedBonuses ?? [],
        manualBonuses: player.manualBonuses ?? [],
        resolvedBonuses: player.resolvedBonuses ?? [],
      }
      // Stände von vor der Sofortverarbeitung: bereits freigeschaltete Boni
      // gelten als erledigt, sonst würden sie beim ersten Klick alle
      // nachträglich auslösen.
      if (player.resolvedBonuses === undefined) {
        migrated.resolvedBonuses = earnedBonuses(migrated).map((entry) => entry.sourceId)
      }
      return migrated
    }),
  }
}
