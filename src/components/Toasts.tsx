import { useEffect } from 'react'
import type { Notification } from '../game/types'

interface Props {
  notifications: Notification[]
  onDismiss: (id: string) => void
}

const VISIBLE_MS = 4500

/**
 * Jede Meldung bringt ihren eigenen Timer mit. Läge er beim Panel, würde
 * jede neue Meldung die Uhren aller anderen neu stellen – bei Bonusketten
 * blieben die ersten Toasts dann deutlich zu lange stehen.
 */
function Toast({ entry, onDismiss }: { entry: Notification; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(entry.id), VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [entry.id, onDismiss])

  return (
    <button className={`toast ${entry.tone}`} onClick={() => onDismiss(entry.id)} title="Ausblenden">
      {entry.text}
    </button>
  )
}

/** Kurzmeldungen über sofort verarbeitete Boni. */
export function Toasts({ notifications, onDismiss }: Props) {
  if (notifications.length === 0) return null

  return (
    <div className="toasts" role="status" aria-live="polite">
      {notifications.map((entry) => (
        <Toast key={entry.id} entry={entry} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
