interface Props {
  /** Kurze Erklärung des Bereichs. */
  text: string
  points: number
  /** Hier hängen die Füchse: der Bereich mit den wenigsten Punkten. */
  weakest?: boolean
  foxes?: number
}

/** Kopfzeile eines Farbbereichs: Erklärung, Fuchsmarke, Punkte. */
export function AreaHead({ text, points, weakest, foxes = 0 }: Props) {
  return (
    <div className="area-head">
      <span className="area-text">{text}</span>
      {weakest && (
        <span
          className="weakest"
          title={`Schwächster Bereich – ${foxes} × ${points} = ${foxes * points} Fuchspunkte`}
        >
          🦊 schwächster
        </span>
      )}
      <span className="points">{points}</span>
    </div>
  )
}
