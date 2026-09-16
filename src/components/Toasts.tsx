import { useEffect } from 'react'
import type { Notification } from '../game/types'

interface Props {
  notifications: Notification[]
  onDismiss: (id: string) => void
}

const VISIBLE_MS = 4500

/** Kurzmeldungen über sofort verarbeitete Boni. */
export function Toasts({ notifications, onDismiss }: Props) {
  useEffect(() => {
    if (notifications.length === 0) return
    const timers = notifications.map((entry) =>
      setTimeout(() => onDismiss(entry.id), VISIBLE_MS),
    )
    return () => timers.forEach(clearTimeout)
  }, [notifications, onDismiss])

  if (notifications.length === 0) return null

  return (
    <div className="toasts" role="status" aria-live="polite">
      {notifications.map((entry) => (
        <button
          key={entry.id}
          className={`toast ${entry.tone}`}
          onClick={() => onDismiss(entry.id)}
          title="Ausblenden"
        >
          {entry.text}
        </button>
      ))}
    </div>
  )
}
