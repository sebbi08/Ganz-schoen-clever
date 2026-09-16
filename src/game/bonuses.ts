import { BONUSES, GREEN_STEPS, NUMBER_BONUS } from './layout'
import type { PickBonus } from './layout'
import {
  earnedBonuses,
  hasFreeBlue,
  hasFreeYellow,
  nextFreeIndex,
} from './scoring'
import type { EarnedBonus, GameState, Notification, PlayerState } from './types'

/**
 * Sofortverarbeitung der Farbboni.
 *
 * Sobald ein Kreuz einen Bonus freischaltet, wird er unmittelbar abgewickelt:
 *
 * - Zahlenboni (orange 4/5/6, lila 6) landen direkt im nächsten freien Feld
 *   der jeweiligen Reihe.
 * - Das grüne Kreuz rückt die grüne Reihe ein Feld weiter – dort gibt es
 *   ohnehin nur ein legales Ziel.
 * - Gelbes und blaues Kreuz sind frei wählbar und werden deshalb als
 *   Zwangsauswahl gestellt: der Block bleibt gesperrt, bis das Feld steht.
 * - Füchse, Wiederholungswürfe und +1 verändern den Block nicht und werden
 *   nur gemeldet beziehungsweise in den Vorrat gelegt.
 *
 * Jeder Schritt kann neue Boni auslösen (Ketten), deshalb läuft die
 * Verarbeitung so lange, bis nichts Neues mehr entsteht.
 */

let counter = 0
function notificationId(): string {
  counter += 1
  return `n-${Date.now().toString(36)}-${counter}`
}

function notify(state: GameState, text: string, tone: Notification['tone']): GameState {
  return {
    ...state,
    notifications: [...state.notifications, { id: notificationId(), text, tone }],
  }
}

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

function markResolved(state: GameState, sourceId: string): GameState {
  return updateActive(state, (player) => ({
    ...player,
    resolvedBonuses: [...player.resolvedBonuses, sourceId],
  }))
}

/** Wickelt genau einen frisch freigeschalteten Bonus ab. */
function applyBonus(state: GameState, entry: EarnedBonus): GameState {
  const info = BONUSES[entry.bonus]
  const player = state.players[state.activePlayer]
  let next = markResolved(state, entry.sourceId)

  const number = NUMBER_BONUS[entry.bonus]
  if (number) {
    const index = nextFreeIndex(player[number.row])
    if (index === null) {
      return notify(next, `${info.label}: Reihe ist voll, Bonus verfällt`, info.color)
    }
    next = updateActive(next, (p) => ({
      ...p,
      [number.row]: p[number.row].map((value, i) => (i === index ? number.value : value)),
    }))
    return notify(next, `${info.label} → Feld ${index + 1}`, info.color)
  }

  switch (entry.bonus) {
    case 'green': {
      if (player.green >= GREEN_STEPS.length) {
        return notify(next, 'Grüne Reihe ist voll, Bonus verfällt', 'green')
      }
      next = updateActive(next, (p) => ({ ...p, green: p.green + 1 }))
      return notify(next, `Grünes Kreuz → Feld ${player.green + 1}`, 'green')
    }

    case 'yellow':
    case 'blue': {
      const free = entry.bonus === 'yellow' ? hasFreeYellow(player) : hasFreeBlue(player)
      if (!free) {
        return notify(next, `${info.label}: kein Feld mehr frei, Bonus verfällt`, info.color)
      }
      return {
        ...next,
        pendingChoices: [
          ...next.pendingChoices,
          { sourceId: entry.sourceId, bonus: entry.bonus as PickBonus, origin: entry.origin },
        ],
      }
    }

    case 'fox':
      return notify(next, `Fuchs aus ${entry.origin}`, 'fox')

    default:
      // Wiederholungswurf, +1 und der mehrdeutige Rundenbonus wandern in den
      // Vorrat und werden dort von Hand abgehakt.
      return notify(next, `${info.label} erhalten`, info.color)
  }
}

/**
 * Arbeitet alle noch nicht verarbeiteten Boni des aktiven Spielers ab und
 * vergisst Boni wieder, deren Auslöser zurückgenommen wurde.
 */
export function resolveBonuses(state: GameState): GameState {
  let current = state

  // Zurückgenommene Kreuze geben ihren Bonus wieder frei.
  const player = current.players[current.activePlayer]
  const earnedIds = new Set(earnedBonuses(player).map((entry) => entry.sourceId))
  if (player.resolvedBonuses.some((id) => !earnedIds.has(id))) {
    current = updateActive(current, (p) => ({
      ...p,
      resolvedBonuses: p.resolvedBonuses.filter((id) => earnedIds.has(id)),
    }))
  }
  if (current.pendingChoices.some((choice) => !earnedIds.has(choice.sourceId))) {
    current = {
      ...current,
      pendingChoices: current.pendingChoices.filter((choice) => earnedIds.has(choice.sourceId)),
    }
  }

  // Ketten auflösen; die Obergrenze ist eine reine Notbremse.
  for (let guard = 0; guard < 60; guard++) {
    const active = current.players[current.activePlayer]
    const resolved = new Set(active.resolvedBonuses)
    const pending = new Set(current.pendingChoices.map((choice) => choice.sourceId))
    const entry = earnedBonuses(active).find(
      (candidate) => !resolved.has(candidate.sourceId) && !pending.has(candidate.sourceId),
    )
    if (!entry) break
    current = applyBonus(current, entry)
  }

  return current
}
