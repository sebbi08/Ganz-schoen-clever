interface Props {
  onPick: (value: number) => void
  onClear?: () => void
  onClose: () => void
}

/** Kleines Auswahlfeld 1–6 für die orange und die lila Reihe. */
export function ValuePicker({ onPick, onClear, onClose }: Props) {
  return (
    <>
      <div className="picker-backdrop" onClick={onClose} />
      <div className="picker" role="dialog" aria-label="Wert eintragen">
        {[1, 2, 3, 4, 5, 6].map((value) => (
          <button key={value} onClick={() => onPick(value)}>
            {value}
          </button>
        ))}
        {onClear && (
          <button className="clear" onClick={onClear}>
            löschen
          </button>
        )}
      </div>
    </>
  )
}
