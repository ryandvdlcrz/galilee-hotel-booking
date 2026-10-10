import { useEffect, useRef } from 'react'
import { AlertTriangle, X, XCircle } from 'lucide-react'

/**
 * Confirmation popup for cancelling a reservation.
 * Closes with the X, the "No" button, the Escape key, or a click outside it
 * (all disabled while the cancellation is being sent).
 */
export default function CancelReservationModal({
  open,
  roomName,
  cancelling,
  error,
  onConfirm,
  onClose,
}) {
  const keepRef = useRef(null)
  const cancellingRef = useRef(cancelling)
  const onCloseRef = useRef(onClose)

  // Keep the latest values available to the key handler without re-running the effect below.
  useEffect(() => {
    cancellingRef.current = cancelling
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return undefined

    const previouslyFocused = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    keepRef.current?.focus() // focus the safe option first

    function handleKeyDown(e) {
      if (e.key === 'Escape' && !cancellingRef.current) onCloseRef.current()
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus?.()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#16264c]/50 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !cancelling) onClose()
      }}
    >
      <button
        type="button"
        onClick={onClose}
        disabled={cancelling}
        aria-label="Close"
        className="absolute right-4 top-4 rounded-full p-2 text-white hover:bg-white/10 disabled:opacity-50 sm:right-6 sm:top-6"
      >
        <X className="h-7 w-7" />
      </button>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-reservation-title"
        aria-describedby="cancel-reservation-text"
        className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>

        <h2 id="cancel-reservation-title" className="mt-4 text-2xl font-bold text-gray-900">
          Cancel Reservation?
        </h2>

        <p id="cancel-reservation-text" className="mt-3 text-sm text-gray-600">
          Are you sure you want to cancel your stay
          {roomName && (
            <>
              {' '}at the <span className="font-semibold text-gray-800">{roomName}</span>
            </>
          )}
          ? This action cannot be undone.
        </p>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={cancelling}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 py-3.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
          >
            <XCircle className="h-5 w-5" />
            {cancelling ? 'Cancelling…' : 'Yes, Cancel Reservation'}
          </button>
          <button
            ref={keepRef}
            type="button"
            onClick={onClose}
            disabled={cancelling}
            className="w-full rounded-xl border border-gray-200 bg-gray-100 py-3.5 text-sm font-semibold text-gray-900 hover:bg-gray-200 disabled:opacity-60"
          >
            No, Keep My Booking
          </button>
        </div>
      </div>
    </div>
  )
}