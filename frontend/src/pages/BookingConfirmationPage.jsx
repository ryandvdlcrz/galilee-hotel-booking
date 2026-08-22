import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { CheckCircle2, Calendar, Users, Phone, Mail, ArrowLeft } from 'lucide-react'
import { cancelReservation } from '../api/reservations'
import { formatDate, nightsBetween } from '../utils/formatDate'

// Display-only for now — matches the amount shown at checkout, but not
// yet part of the backend's actual stored total_price. See BookingCheckoutPage.
const RESORT_FEE_DISPLAY = 500

const STATUS_STYLES = {
  pending: { label: 'Pending Confirmation', className: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmed', className: 'bg-green-100 text-green-700' },
  checked_in: { label: 'Checked In', className: 'bg-blue-100 text-blue-700' },
  checked_out: { label: 'Checked Out', className: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
}

export default function BookingConfirmationPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state

  const [reservation, setReservation] = useState(state?.reservation || null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')

  const room = state?.room
  const adults = state?.adults
  const children = state?.children

  if (!reservation) {
    // Someone navigated here directly without completing a booking.
    navigate('/')
    return null
  }

  const nights = nightsBetween(reservation.check_in_date, reservation.check_out_date)
  const roomRate = Number(reservation.total_price)
  const totalDisplay = roomRate + RESORT_FEE_DISPLAY
  const statusInfo = STATUS_STYLES[reservation.status] || STATUS_STYLES.pending
  const primaryImage = room?.images?.find((img) => img.is_primary) ?? room?.images?.[0]

  async function handleCancel() {
    if (!confirm('Are you sure you want to cancel this reservation? This cannot be undone.')) {
      return
    }
    setCancelling(true)
    setCancelError('')
    try {
      const updated = await cancelReservation(reservation.id)
      setReservation(updated)
    } catch (err) {
      setCancelError(
        err.response?.data?.detail || 'Could not cancel this reservation. Please contact support.'
      )
    } finally {
      setCancelling(false)
    }
  }

  const canCancel = ['pending', 'confirmed'].includes(reservation.status)

  return (
    <div className="bg-[#faf7f0]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Success header */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <CheckCircle2 className="h-9 w-9 text-green-600" />
          </div>
          <h1 className="mt-4 text-3xl font-bold text-[#16264c] sm:text-4xl">
            Reservation Confirmed!
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Thank you for choosing Galilee Wonderland. Your stay is officially booked.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: booking details card */}
          <div className="overflow-hidden rounded-xl bg-white shadow-sm lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2">
              <div className="relative aspect-[4/3] bg-gray-100 sm:aspect-auto">
                {primaryImage ? (
                  <img src={primaryImage.image} alt={room?.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">
                    No image yet
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  <p className="text-lg font-bold text-white">{room?.name || 'Room'}</p>
                </div>
              </div>

              <div className="p-6">
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

                <div className="mt-5 flex gap-3">
                  <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Check-In / Check-Out
                    </p>
                    <p className="text-sm font-semibold text-[#16264c]">
                      {formatDate(reservation.check_in_date)} – {formatDate(reservation.check_out_date)}
                    </p>
                    <p className="text-xs text-gray-500">{nights} Night{nights !== 1 ? 's' : ''} total duration</p>
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  <Users className="h-4 w-4 shrink-0 text-gray-400" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Guests</p>
                    <p className="text-sm font-semibold text-[#16264c]">
                      {adults != null
                        ? `${adults} Adult${adults !== 1 ? 's' : ''}${children ? `, ${children} Child${children !== 1 ? 'ren' : ''}` : ''}`
                        : `${reservation.num_guests} guest${reservation.num_guests !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-1.5 border-t border-gray-100 pt-4 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Payment Summary
                  </p>
                  <div className="flex justify-between text-gray-600">
                    <span>Room rate ({nights} nights)</span>
                    <span>₱{roomRate.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Taxes &amp; Service Fees</span>
                    <span>₱{RESORT_FEE_DISPLAY.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-[#16264c]">
                    <span>Total Amount Paid</span>
                    <span>₱{totalDisplay.toLocaleString()}</span>
                  </div>
                </div>

                {cancelError && <p className="mt-3 text-sm text-red-600">{cancelError}</p>}

                {canCancel ? (
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="mt-5 w-full rounded-lg border border-red-300 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {cancelling ? 'Cancelling…' : 'Cancel Reservation'}
                  </button>
                ) : (
                  <p className="mt-5 text-center text-xs text-gray-400">
                    This reservation is {statusInfo.label.toLowerCase()} and can no longer be cancelled here.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right: what's next + help */}
          <div className="space-y-4 lg:col-span-1">
            <div className="rounded-xl bg-[#16264c] p-6 text-white">
              <p className="font-semibold">What's Next?</p>
              <div className="mt-3 flex gap-3 text-sm text-white/80">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs">
                  1
                </span>
                <span>Check your email for the digital voucher and QR code.</span>
              </div>
              <Link
                to="/my-reservations"
                className="mt-4 block rounded-lg bg-white/10 py-2.5 text-center text-sm font-semibold hover:bg-white/20"
              >
                Manage My Booking
              </Link>
            </div>

            <div className="rounded-xl bg-white p-4 text-xs text-gray-500 shadow-sm">
              Free cancellation is available up to 48 hours before check-in. Please review our full
              policy in your confirmation email.
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm">
              <p className="font-semibold text-[#16264c]">Need Help?</p>
              <p className="mt-1 text-sm text-gray-500">
                Our concierge team is available 24/7 to assist with your stay.
              </p>
              <a href="tel:09123456789" className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#16264c]">
                <Phone className="h-4 w-4" /> 09123456789
              </a>
              <a
                href="mailto:support@galileewonderland.com"
                className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#16264c]"
              >
                <Mail className="h-4 w-4" /> support@galileewonderland.com
              </a>
            </div>
          </div>
        </div>

        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-semibold text-[#16264c] hover:bg-gray-200"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
      </div>
    </div>
  )
}