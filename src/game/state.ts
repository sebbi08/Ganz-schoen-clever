import type { BonusId } from './layout'
import { createPlayer } from './scoring'
import type { GameState, PlayerState } from './types'

export const STORAGE_KEY = 'gsc-punkteblock-v1'

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

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'toggleYellow':
      return updateActive(state, (player) => ({
        ...player,
        yellow: player.yellow.map((row, r) =>
          r === action.row ? row.map((cell, c) => (c === action.col ? !cell : cell)) : row,
        ),
      }))

    case 'toggleBlue':
      return updateActive(state, (player) => ({
        ...player,
        blue: player.blue.map((row, r) =>
          r === action.row ? row.map((cell, c) => (c === action.col ? !cell : cell)) : row,
        ),
      }))

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

    case 'resetSheets':
      return {
        ...state,
        round: 1,
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

/* ------------------------------------------------------------- Persistenz */

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GameState
    if (!Array.isArray(parsed.players) || parsed.players.length === 0) return null
    // Gegen ältere Stände absichern: fehlende Felder auffüllen.
    return {
      ...parsed,
      activePlayer: Math.min(parsed.activePlayer ?? 0, parsed.players.length - 1),
      round: parsed.round ?? 1,
      players: parsed.players.map((player) => ({
        ...player,
        usedBonuses: player.usedBonuses ?? [],
        manualBonuses: player.manualBonuses ?? [],
      })),
    }
  } catch {
    return null
  }
}

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Privater Modus o. Ä. – dann läuft die App eben ohne Speicherung.
  }
}
