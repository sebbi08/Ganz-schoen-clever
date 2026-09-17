import { BONUSES, GREEN_STEPS, NUMBER_BONUS } from './layout'
import type { Area, PickBonus } from './layout'
import {
  earnedBonuses,
  hasFreeBlue,
  hasFreeYellow,
  isBlueGap,
  nextFreeIndex,
} from './scoring'
import type { Action } from './state'
import type {
  EarnedBonus,
  GameState,
  Notification,
  PendingChoice,
  PlayerState,
} from './types'

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
 * - Füchse, Wiederholungswürfe und Zusatzwürfel verändern den Block nicht und werden
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

function updatePlayer(
  state: GameState,
  update: (player: PlayerState) => PlayerState,
): GameState {
  return { ...state, player: update(state.player) }
}

function markResolved(state: GameState, sourceId: string): GameState {
  return updatePlayer(state, (player) => ({
    ...player,
    resolvedBonuses: [...player.resolvedBonuses, sourceId],
  }))
}

/** Gibt es für diesen Bonus überhaupt noch ein freies Ziel? */
function hasTarget(player: PlayerState, bonus: PickBonus): boolean {
  if (bonus === 'yellow') return hasFreeYellow(player)
  if (bonus === 'blue') return hasFreeBlue(player)
  return (
    hasFreeYellow(player) ||
    hasFreeBlue(player) ||
    player.green < GREEN_STEPS.length ||
    nextFreeIndex(player.orange) !== null ||
    nextFreeIndex(player.purple) !== null
  )
}

/** Wickelt genau einen frisch freigeschalteten Bonus ab. */
function applyBonus(state: GameState, entry: EarnedBonus): GameState {
  const info = BONUSES[entry.bonus]
  const player = state.player
  let next = markResolved(state, entry.sourceId)

  const number = NUMBER_BONUS[entry.bonus]
  if (number) {
    const index = nextFreeIndex(player[number.row])
    if (index === null) {
      return notify(next, `${info.label}: Reihe ist voll, Bonus verfällt`, info.color)
    }
    next = updatePlayer(next, (p) => ({
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
      next = updatePlayer(next, (p) => ({ ...p, green: p.green + 1 }))
      return notify(next, `Grünes Kreuz → Feld ${player.green + 1}`, 'green')
    }

    case 'yellow':
    case 'blue':
    case 'anyCrossOr6': {
      if (!hasTarget(player, entry.bonus)) {
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
      return notify(next, `Fuchs · ${entry.origin}`, 'fox')

    default:
      // Wiederholungswurf und Zusatzwürfel wandern in den Vorrat.
      return notify(next, `${info.label} · ${entry.origin}`, info.color)
  }
}

/**
 * Arbeitet alle noch nicht verarbeiteten Boni ab und vergisst Boni wieder,
 * deren Auslöser zurückgenommen wurde.
 */
export function resolveBonuses(state: GameState): GameState {
  let current = state

  // Zurückgenommene Kreuze geben ihren Bonus wieder frei.
  const player = current.player
  const earnedIds = new Set(earnedBonuses(player).map((entry) => entry.sourceId))
  if (player.resolvedBonuses.some((id) => !earnedIds.has(id))) {
    current = updatePlayer(current, (p) => ({
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
    const active = current.player
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

/* --------------------------------------------------------- Zwangsauswahl */

export type AreaMode = 'normal' | 'pick' | 'locked'

/**
 * Wie ein Bereich auf Klicks reagiert, solange eine Auswahl offen ist.
 * `pick` heißt bei Gelb und Blau "nur freie Felder", bei Grün "nur das
 * nächste Feld" und bei Orange und Lila "nur eine 6".
 */
export function areaMode(choice: PendingChoice | null, area: Area): AreaMode {
  if (!choice) return 'normal'
  if (choice.bonus === 'anyCrossOr6') return 'pick'
  return choice.bonus === area ? 'pick' : 'locked'
}

/** Erfüllt dieser Zug die offene Auswahl? */
export function satisfiesChoice(
  state: GameState,
  choice: PendingChoice,
  action: Action,
): boolean {
  const player = state.player
  const any = choice.bonus === 'anyCrossOr6'

  switch (action.type) {
    case 'toggleYellow':
      return (
        (any || choice.bonus === 'yellow') && !player.yellow[action.row][action.col]
      )
    case 'toggleBlue':
      return (
        (any || choice.bonus === 'blue') &&
        !isBlueGap(action.row, action.col) &&
        !player.blue[action.row][action.col]
      )
    case 'setGreen':
      return any && action.count === player.green + 1
    case 'setOrange':
      return any && action.value === 6 && action.index === nextFreeIndex(player.orange)
    case 'setPurple':
      return any && action.value === 6 && action.index === nextFreeIndex(player.purple)
    default:
      return false
  }
}
