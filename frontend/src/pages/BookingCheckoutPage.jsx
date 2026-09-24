import { useEffect, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { User, ArrowLeft, ArrowRight } from 'lucide-react'
import { getRoomTypeBySlug } from '../api/rooms'
import { createReservation } from '../api/reservations'
import { useAuth } from '../hooks/useAuth'
import { nightsBetween } from '../utils/formatDate'

// Display-only for now — not yet part of the actual charged total.
// See note in handleSubmit() below.
const RESORT_FEE_DISPLAY = 500

export default function BookingCheckoutPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const bookingDetails = location.state
  // roomSlug, checkIn, checkOut, adults, children — handed off from RoomDetailPage.

  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)

  const [firstName, setFirstName] = useState(user?.first_name || '')
  const [lastName, setLastName] = useState(user?.last_name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [specialRequests, setSpecialRequests] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // No booking details means someone navigated here directly rather than
  // through the room detail page's Reserve Now flow — send them back.
  useEffect(() => {
    if (!bookingDetails) {
      navigate('/rooms')
      return
    }
    let isMounted = true
    getRoomTypeBySlug(bookingDetails.roomSlug)
      .then((data) => {
        if (isMounted) setRoom(data)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => { isMounted = false }
  }, [bookingDetails, navigate])

  if (!bookingDetails) return null

  const { checkIn, checkOut, adults, children } = bookingDetails
  const nights = nightsBetween(checkIn, checkOut)
  const subtotal = room ? Number(room.price_per_night) * nights : 0
  const includedGuests = room ? room.capacity : 0
  const totalGuestCount = adults + children
  const extraGuests = Math.max(totalGuestCount - includedGuests, 0)
  const extraGuestFee = room ? extraGuests * Number(room.extra_pax_fee) * nights : 0
  const displayTotal = subtotal + extraGuestFee + RESORT_FEE_DISPLAY

  async function handleSubmit(e) {
  e.preventDefault()
  setError('')
  setSubmitting(true)

    try {
      // NOTE: total_price is calculated server-side as price_per_night x
      // nights only — the Resort Fees & Taxes shown above are for display
      // purposes only right now and are not added to the actual charge.
      const reservation = await createReservation({
        room_type: bookingDetails.roomId,
        check_in_date: checkIn,
        check_out_date: checkOut,
        num_rooms: bookingDetails.roomIds.length,
        num_guests: adults + children,
        guest_name: `${firstName} ${lastName}`.trim(),
        guest_email: email,
        guest_phone: phone,
        special_requests: specialRequests,
        room_ids: bookingDetails.roomIds,
      })
      navigate('/booking/confirmation', { state: { reservation, room, adults, children } })
    } catch (err) {
      const data = err.response?.data
      const message =
        (typeof data === 'object' && Object.values(data || {})[0]?.[0]) ||
        data?.detail ||
        'Could not complete this booking. Please check your details and try again.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const primaryImage = room?.images?.find((img) => img.is_primary) ?? room?.images?.[0]

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Step indicator */}
      <div className="rounded-xl bg-gray-50 px-6 py-4">
        <span className="inline-flex items-center gap-2 border-b-2 border-[#a6842f] pb-1 text-sm font-semibold text-[#16264c]">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#a6842f] text-xs text-white">
            1
          </span>
          GUEST INFO
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: guest info form */}
        <div className="rounded-xl bg-white p-6 shadow-sm lg:col-span-2 sm:p-8">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#16264c]">
            <User className="h-5 w-5" /> Primary Guest Information
          </h2>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[#16264c]">First Name</span>
                <input
                  type="text"
                  required
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-[#16264c] focus:outline-none focus:ring-1 focus:ring-[#16264c]"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[#16264c]">Last Name</span>
                <input
                  type="text"
                  required
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-[#16264c] focus:outline-none focus:ring-1 focus:ring-[#16264c]"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[#16264c]">Email Address</span>
                <input
                  type="email"
                  required
                  placeholder="john.doe@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-[#16264c] focus:outline-none focus:ring-1 focus:ring-[#16264c]"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[#16264c]">Phone Number</span>
                <input
                  type="tel"
                  required
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-[#16264c] focus:outline-none focus:ring-1 focus:ring-[#16264c]"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[#16264c]">
                Special Requests (Optional)
              </span>
              <textarea
                rows={4}
                placeholder="Late check-in, dietary requirements, or special occasions…"
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-[#16264c] focus:outline-none focus:ring-1 focus:ring-[#16264c]"
              />
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-semibold text-[#16264c] hover:bg-gray-200"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                type="submit"
                disabled={submitting || loading}
                className="flex items-center gap-2 rounded-lg bg-[#16264c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0f1f3d] disabled:opacity-50"
              >
                {submitting ? 'Confirming…' : 'Confirm Reservation'}
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </form>
        </div>

        {/* Right: order summary */}
        <div className="lg:col-span-1">
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="aspect-[16/9] bg-gray-100">
              {primaryImage ? (
                <img src={primaryImage.image} alt={room?.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                  {loading ? 'Loading…' : 'No image yet'}
                </div>
              )}
            </div>

            <div className="p-5">
              <h3 className="text-lg font-bold text-[#16264c]">{room?.name || '—'}</h3>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">Check-In</p>
                  <p className="font-semibold text-[#16264c]">{checkIn}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">Check-Out</p>
                  <p className="font-semibold text-[#16264c]">{checkOut}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <span className="text-gray-600">Duration</span>
                <span className="font-semibold text-[#16264c]">
                  {nights} Night{nights !== 1 ? 's' : ''}
                </span>
              </div>

              {room && (
                <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-4 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>₱{Number(room.price_per_night).toLocaleString()} × {nights} nights</span>
                    <span>₱{subtotal.toLocaleString()}</span>
                  </div>
                  {extraGuests > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>
                        {extraGuests} extra guest{extraGuests > 1 ? 's' : ''} × ₱{Number(room.extra_pax_fee).toLocaleString()} × {nights} nights
                      </span>
                      <span>₱{extraGuestFee.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Resort Fees &amp; Taxes</span>
                    <span>₱{RESORT_FEE_DISPLAY.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-base font-bold text-[#16264c]">
                    <span>Total Price</span>
                    <span className="text-[#a6842f]">₱{displayTotal.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {room?.amenities?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {room.amenities.map((a) => (
                    <span
                      key={a.id}
                      className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#16264c]"
                    >
                      {a.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}