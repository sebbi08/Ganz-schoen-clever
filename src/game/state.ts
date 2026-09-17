import { ROUNDS, roundsFor } from './layout'
import { resolveBonuses, satisfiesChoice } from './bonuses'
import { createPlayer, earnedBonuses } from './scoring'
import type { GameState, PlayerState } from './types'

let idCounter = 0
function nextId(prefix: string): string {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`
}

export function createGame(tableSize = 1): GameState {
  // Runde 1 läuft schon, ihr Bonus gehört also sofort gutgeschrieben.
  return resolveBonuses(
    startRound({
      player: createPlayer(),
      round: 1,
      tableSize,
      claimedRounds: [],
      pendingChoices: [],
      notifications: [],
    }),
  )
}

/**
 * Schreibt den Bonus der laufenden Runde gut. Der steht dem Spieler zu
 * Beginn der Runde zu – wer Runde 1 beginnt, hat also schon einen
 * Wiederholungswurf im Vorrat.
 */
function startRound(state: GameState): GameState {
  const info = ROUNDS[state.round - 1]
  if (!info?.bonus || state.claimedRounds.includes(state.round)) return state
  // Der Bonus läuft durch die normale Verarbeitung: Meldung, Vorrat oder –
  // wie in Runde 4 – eine Zwangsauswahl.
  return {
    ...state,
    claimedRounds: [...state.claimedRounds, state.round],
    player: {
      ...state.player,
      manualBonuses: [
        ...state.player.manualBonuses,
        { id: nextId('round'), bonus: info.bonus, origin: `Rundenbonus ${state.round}` },
      ],
    },
  }
}

export type Action =
  | { type: 'toggleYellow'; row: number; col: number }
  | { type: 'toggleBlue'; row: number; col: number }
  | { type: 'setGreen'; count: number }
  | { type: 'setOrange'; index: number; value: number | null }
  | { type: 'setPurple'; index: number; value: number | null }
  | { type: 'useBonus'; sourceId: string }
  | { type: 'setTableSize'; size: number }
  | { type: 'completeRound' }
  | { type: 'skipChoice' }
  | { type: 'dismissNotification'; id: string }
  | { type: 'newGame' }
  | { type: 'replace'; state: GameState }

function updatePlayer(
  state: GameState,
  update: (player: PlayerState) => PlayerState,
): GameState {
  return { ...state, player: update(state.player) }
}

/** Aktionen, die auch bei offener Zwangsauswahl durchgehen. */
const ALWAYS_ALLOWED: Action['type'][] = [
  'skipChoice',
  'dismissNotification',
  'newGame',
  'replace',
]

export function reducer(state: GameState, action: Action): GameState {
  const choice = state.pendingChoices[0]
  if (!choice) return resolveBonuses(apply(state, action))

  // Der Zug erfüllt die Auswahl: ausführen und den Bonus abhaken.
  if (satisfiesChoice(state, choice, action)) {
    const next = apply(state, action)
    return resolveBonuses({ ...next, pendingChoices: next.pendingChoices.slice(1) })
  }

  // Sonst ist der Block gesperrt, bis die Auswahl steht.
  if (!ALWAYS_ALLOWED.includes(action.type)) return state
  return resolveBonuses(apply(state, action))
}

function apply(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'toggleYellow':
    case 'toggleBlue': {
      const area = action.type === 'toggleYellow' ? 'yellow' : 'blue'
      return updatePlayer(state, (player) => ({
        ...player,
        [area]: player[area].map((row, r) =>
          r === action.row ? row.map((cell, c) => (c === action.col ? !cell : cell)) : row,
        ),
      }))
    }

    case 'setGreen':
      return updatePlayer(state, (player) => ({ ...player, green: action.count }))

    case 'setOrange':
      return updatePlayer(state, (player) => ({
        ...player,
        orange: player.orange.map((value, index) => (index === action.index ? action.value : value)),
      }))

    case 'setPurple':
      return updatePlayer(state, (player) => ({
        ...player,
        purple: player.purple.map((value, index) => (index === action.index ? action.value : value)),
      }))

    case 'useBonus':
      // Einbahnstraße: zurück geht es nur über den Verlauf.
      if (state.player.usedBonuses.includes(action.sourceId)) return state
      return updatePlayer(state, (player) => ({
        ...player,
        usedBonuses: [...player.usedBonuses, action.sourceId],
      }))

    case 'setTableSize':
      return { ...state, tableSize: Math.min(4, Math.max(1, action.size)) }

    case 'completeRound': {
      const total = roundsFor(state.tableSize)
      if (state.round >= total) return state
      // Die neue Runde beginnt, damit kommt ihr Bonus dazu.
      return startRound({ ...state, round: state.round + 1 })
    }

    case 'skipChoice':
      return { ...state, pendingChoices: state.pendingChoices.slice(1) }

    case 'dismissNotification':
      return {
        ...state,
        notifications: state.notifications.filter((entry) => entry.id !== action.id),
      }

    case 'newGame':
      return createGame(state.tableSize)

    case 'replace':
      return action.state

    default:
      return state
  }
}

/* ------------------------------------------------------ Ältere Spielstände */

/** Stände aus der Zeit, als die Seite mehrere Blöcke führen konnte. */
interface LegacyGameState extends Partial<GameState> {
  players?: PlayerState[]
  activePlayer?: number
}

function migratePlayer(player: PlayerState | undefined): PlayerState {
  if (!player) return createPlayer()
  const migrated: PlayerState = {
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
}

/** Füllt fehlende Felder auf und macht einen geladenen Stand benutzbar. */
export function migrateState(parsed: LegacyGameState): GameState {
  // Aus einem alten Mehrspieler-Stand wird der zuletzt gewählte Block.
  const player = parsed.player ?? parsed.players?.[parsed.activePlayer ?? 0] ?? parsed.players?.[0]
  return {
    round: parsed.round ?? 1,
    tableSize: parsed.tableSize ?? parsed.players?.length ?? 1,
    claimedRounds: parsed.claimedRounds ?? [],
    pendingChoices: parsed.pendingChoices ?? [],
    notifications: [],
    player: migratePlayer(player),
  }
}
