import { BONUSES } from '../game/layout'
import type { PendingChoice } from '../game/types'

interface Props {
  choice: PendingChoice
  remaining: number
  onSkip: () => void
}

/** Fordert die freie Wahl eines gelben oder blauen Kreuzes ein. */
export function ChoiceBanner({ choice, remaining, onSkip }: Props) {
  const info = BONUSES[choice.bonus]
  return (
    <div className={`choice-banner ${info.color}`} role="alert">
      <span className="choice-dot" />
      <span className="choice-text">
        <strong>{info.label} setzen</strong>
        <span>
          {choice.origin}
          {remaining > 1 && ` · noch ${remaining} Boni offen`} · Der Block ist gesperrt, bis das
          Kreuz steht.
        </span>
      </span>
      <button className="btn ghost" onClick={onSkip} title="Diesen Bonus ungenutzt verfallen lassen">
        verfallen lassen
      </button>
    </div>
  )
}
