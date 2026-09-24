import { useState } from 'react'
import { Search, Calendar, Users } from 'lucide-react'
import { lookupReservation } from '../api/reservations'
import { formatDate, nightsBetween } from '../utils/formatDate'

const STATUS_STYLES = {
  pending: { label: 'Pending Confirmation', className: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmed', className: 'bg-green-100 text-green-700' },
  checked_in: { label: 'Checked In', className: 'bg-blue-100 text-blue-700' },
  checked_out: { label: 'Checked Out', className: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
}

export default function FindReservationPage() {
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [reservation, setReservation] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setReservation(null)
    setLoading(true)
    try {
      const data = await lookupReservation(code.trim(), email.trim())
      setReservation(data)
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Could not find a reservation with that code and email.'
      )
    } finally {
      setLoading(false)
    }
  }

  const statusInfo = reservation ? (STATUS_STYLES[reservation.status] || STATUS_STYLES.pending) : null
  const nights = reservation ? nightsBetween(reservation.check_in_date, reservation.check_out_date) : 0

  return (
    <div className="min-h-screen bg-[#faf7f0]">
      <div className="mx-auto max-w-xl px-6 py-16">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#a6842f]">
            Manage Booking
          </p>
          <h1 className="mt-1 text-3xl font-bold text-[#16264c] sm:text-4xl">Find My Reservation</h1>
          <p className="mt-2 text-sm text-gray-500">
            Enter your reservation code and the email you booked with to view your booking status.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-xl bg-white p-6 shadow-sm sm:p-8">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#16264c]">Reservation Code</span>
            <input
              type="text"
              required
              placeholder="e.g. A1B2C3D4"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm uppercase placeholder:text-gray-400 placeholder:normal-case focus:border-[#16264c] focus:outline-none focus:ring-1 focus:ring-[#16264c]"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#16264c]">Email Address</span>
            <input
              type="email"
              required
              placeholder="The email you booked with"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-[#16264c] focus:outline-none focus:ring-1 focus:ring-[#16264c]"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#16264c] py-3 text-sm font-semibold text-white hover:bg-[#0f1f3d] disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            {loading ? 'Searching…' : 'Find Reservation'}
          </button>
        </form>

        {reservation && (
          <div className="mt-6 rounded-xl bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Booking Reference
                </p>
                <p className="text-lg font-bold text-[#16264c]">#{reservation.reservation_code}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusInfo.className}`}>
                {statusInfo.label}
              </span>
            </div>

            <h3 className="mt-3 font-semibold text-[#16264c]">{reservation.room_type_name}</h3>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatDate(reservation.check_in_date)} – {formatDate(reservation.check_out_date)}
                {' '}({nights} night{nights !== 1 ? 's' : ''})
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" /> {reservation.num_guests} guest{reservation.num_guests !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
              <span className="text-sm text-gray-500">Total Amount</span>
              <span className="text-lg font-bold text-[#a6842f]">
                ₱{Number(reservation.total_price).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}