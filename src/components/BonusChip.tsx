import { BONUSES } from '../game/layout'
import type { BonusId } from '../game/layout'

interface Props {
  bonus: BonusId
  small?: boolean
}

export function BonusChip({ bonus, small }: Props) {
  const info = BONUSES[bonus]
  return (
    <span className={`chip ${info.color}${small ? ' sm' : ''}`} title={info.label}>
      {info.short}
    </span>
  )
}
