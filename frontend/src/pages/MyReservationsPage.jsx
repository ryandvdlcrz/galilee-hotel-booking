import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar, Users } from 'lucide-react'
import { getMyReservations, cancelReservation } from '../api/reservations'
import { useAuth } from '../hooks/useAuth'
import { formatDate, nightsBetween } from '../utils/formatDate'

const STATUS_STYLES = {
  pending: { label: 'Pending Confirmation', className: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmed', className: 'bg-green-100 text-green-700' },
  checked_in: { label: 'Checked In', className: 'bg-blue-100 text-blue-700' },
  checked_out: { label: 'Checked Out', className: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
}

export default function MyReservationsPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancellingId, setCancellingId] = useState(null)

  // Protect this page — only logged-in users can see their reservations.
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
    }
  }, [authLoading, user, navigate])

  useEffect(() => {
    if (!user) return
    let isMounted = true
    getMyReservations()
      .then((data) => {
        if (isMounted) setReservations(data)
      })
      .catch(() => {
        if (isMounted) setError('Could not load your reservations right now.')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => { isMounted = false }
  }, [user])

  async function handleCancel(id) {
    if (!confirm('Are you sure you want to cancel this reservation?')) return
    setCancellingId(id)
    try {
      const updated = await cancelReservation(id)
      setReservations((prev) => prev.map((r) => (r.id === id ? updated : r)))
    } catch (err) {
      alert(err.response?.data?.detail || 'Could not cancel this reservation. Please try again.')
    } finally {
      setCancellingId(null)
    }
  }

  if (authLoading || (loading && user)) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20 text-center text-sm text-gray-500">
        Loading your reservations…
      </div>
    )
  }

  if (!user) return null // redirect is in flight

  return (
    <div className="min-h-screen bg-[#faf7f0]">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold text-[#16264c]">My Reservations</h1>
        <p className="mt-1 text-sm text-gray-500">Manage and review your upcoming and past stays.</p>

        {error && <p className="mt-8 text-sm text-red-600">{error}</p>}

        {!error && reservations.length === 0 && (
          <div className="mt-10 rounded-xl bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-gray-500">You don't have any reservations yet.</p>
            <Link
              to="/rooms"
              className="mt-4 inline-block rounded-lg bg-[#16264c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0f1f3d]"
            >
              Browse Rooms
            </Link>
          </div>
        )}

        <div className="mt-8 space-y-4">
          {reservations.map((r) => {
            const nights = nightsBetween(r.check_in_date, r.check_out_date)
            const statusInfo = STATUS_STYLES[r.status] || STATUS_STYLES.pending
            const canCancel = ['pending', 'confirmed'].includes(r.status)

            return (
              <div key={r.id} className="rounded-xl bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      #{r.reservation_code}
                    </p>
                    <h3 className="text-lg font-bold text-[#16264c]">{r.room_type_name}</h3>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusInfo.className}`}>
                    {statusInfo.label}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {formatDate(r.check_in_date)} – {formatDate(r.check_out_date)} ({nights} night{nights !== 1 ? 's' : ''})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" /> {r.num_guests} guest{r.num_guests !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                  <span className="text-lg font-bold text-[#a6842f]">
                    ₱{Number(r.total_price).toLocaleString()}
                  </span>
                  {canCancel && (
                    <button
                      onClick={() => handleCancel(r.id)}
                      disabled={cancellingId === r.id}
                      className="rounded-lg border border-red-300 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {cancellingId === r.id ? 'Cancelling…' : 'Cancel'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}