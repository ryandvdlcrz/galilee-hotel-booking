import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Users,
  Phone,
  Mail,
  ArrowLeft,
  Copy,
  Check,
} from 'lucide-react'
import { cancelReservation } from '../api/reservations'
import { formatDate, nightsBetween } from '../utils/formatDate'
import { CHECK_IN_TIME, CHECK_OUT_TIME } from '../utils/hotelPolicy'
import { getBadge } from '../utils/reservationBadge'
import CancelReservationModal from '../components/CancelReservationModal'

// Display-only for now — matches the amount shown at checkout, but not
// yet part of the backend's actual stored total_price. See BookingCheckoutPage.
const RESORT_FEE_DISPLAY = 500

export default function BookingConfirmationPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state

  const [reservation, setReservation] = useState(state?.reservation || null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const room = state?.room
  const adults = state?.adults
  const children = state?.children
  const fromHistory = Boolean(state?.fromHistory)

  if (!reservation) {
    // Someone navigated here directly without completing a booking.
    navigate('/')
    return null
  }

  const nights = nightsBetween(reservation.check_in_date, reservation.check_out_date)
  const numRooms = reservation.num_rooms ?? 1
  const baseRoomCost = Number(reservation.base_room_cost ?? reservation.total_price)
  const extraGuestCount = reservation.extra_guest_count ?? 0
  const extraGuestFee = Number(reservation.extra_guest_fee_total ?? 0)
  const totalDisplay = Number(reservation.total_price) + RESORT_FEE_DISPLAY
  const badge = getBadge(reservation)
  const isCancelled = reservation.status === 'cancelled'
  const isPending = reservation.status === 'pending'
  const canCancel = ['pending', 'confirmed'].includes(reservation.status)
  const showCopyReference = canCancel
  const primaryImage = room?.images?.find((img) => img.is_primary) ?? room?.images?.[0]
  const code = reservation.reservation_code
  const roomName = reservation.room_type_name || room?.name || ''

  // Heading changes with the situation: cancelled, opened from history, or just booked.
  // For a new booking the wording follows the status staff set in Django Admin.
  const header = isCancelled
    ? {
        Icon: XCircle,
        wrap: 'bg-red-50',
        color: 'text-red-600',
        title: 'Reservation Cancelled',
        text: 'This booking has been cancelled. We hope to welcome you at Galilee Wonderland another time.',
      }
    : fromHistory
    ? {
        Icon: CheckCircle2,
        wrap: 'bg-green-50',
        color: 'text-green-600',
        title: 'Booking Details',
        text: 'Review your reservation and manage your stay.',
      }
    : isPending
    ? {
        Icon: Clock,
        wrap: 'bg-amber-50',
        color: 'text-amber-600',
        title: 'Reservation Received!',
        text: 'Thank you for choosing Galilee Wonderland. Your booking is now waiting for confirmation from our team.',
      }
    : {
        Icon: CheckCircle2,
        wrap: 'bg-green-50',
        color: 'text-green-600',
        title: 'Reservation Confirmed!',
        text: 'Thank you for choosing Galilee Wonderland. Your stay is officially booked.',
      }
  const HeaderIcon = header.Icon

  // "What's Next?" steps depend on the booking status (no email system, so
  // everything points to things the guest can do on the site or by phone).
  const nextStepsByStatus = {
    pending: [
      `Save your booking reference (#${code}). You will need it, along with your email, to find this booking later.`,
      'Our team will review your booking and update its status. Check back anytime to see if it has been confirmed.',
      'Need it sooner? Call our concierge using the number below.',
    ],
    confirmed: [
      `Show your booking reference (#${code}) at the front desk when you arrive.`,
      `Check-in starts at ${CHECK_IN_TIME} and check-out is by ${CHECK_OUT_TIME}.`,
      'Need to make a change? Call our concierge using the number below.',
    ],
    checked_in: [
      'Enjoy your stay at Galilee Wonderland!',
      'Need anything during your stay? Our concierge is just a call away.',
    ],
    checked_out: ['Thank you for staying with us. We hope to welcome you back soon.'],
  }
  const nextSteps = nextStepsByStatus[reservation.status] ?? nextStepsByStatus.confirmed

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked (for example on a non-secure page).
      // The reference is still shown on screen, so nothing else to do.
    }
  }

  function openCancelConfirm() {
    setCancelError('')
    setConfirmOpen(true)
  }

  function closeCancelConfirm() {
    if (cancelling) return
    setConfirmOpen(false)
    setCancelError('')
  }

  async function handleCancel() {
    setCancelling(true)
    setCancelError('')
    try {
      const updated = await cancelReservation(reservation.id)
      setReservation(updated)
      setConfirmOpen(false)
    } catch (err) {
      setCancelError(
        err.response?.data?.detail || 'Could not cancel this reservation. Please contact support.'
      )
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="bg-[#faf7f0]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Header */}
        <div className="text-center">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${header.wrap}`}>
            <HeaderIcon className={`h-9 w-9 ${header.color}`} />
          </div>
          <h1 className="mt-4 text-3xl font-bold text-[#16264c] sm:text-4xl">{header.title}</h1>
          <p className="mt-2 text-sm text-gray-500">{header.text}</p>
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
                  <p className="text-lg font-bold text-white">{roomName || 'Room'}</p>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Booking Reference
                    </p>
                    <p className="text-lg font-bold text-[#16264c]">#{code}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${badge.className}`}>
                    {badge.label}
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
                    <p className="text-xs text-gray-500">
                      Check-in from {CHECK_IN_TIME}, check-out by {CHECK_OUT_TIME}
                    </p>
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
                    <span>
                      Room rate ({numRooms} room{numRooms > 1 ? 's' : ''} × {nights} night{nights !== 1 ? 's' : ''})
                    </span>
                    <span>₱{baseRoomCost.toLocaleString()}</span>
                  </div>
                  {extraGuestCount > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>{extraGuestCount} extra guest{extraGuestCount > 1 ? 's' : ''} ({nights} nights)</span>
                      <span>₱{extraGuestFee.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Taxes &amp; Service Fees</span>
                    <span>₱{RESORT_FEE_DISPLAY.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-[#16264c]">
                    <span>Total Amount</span>
                    <span className={isCancelled ? 'text-gray-400 line-through' : ''}>
                      ₱{totalDisplay.toLocaleString()}
                    </span>
                  </div>
                </div>

                {canCancel ? (
                  <button
                    type="button"
                    onClick={openCancelConfirm}
                    className="mt-5 w-full rounded-lg border border-red-300 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    Cancel Reservation
                  </button>
                ) : (
                  <p className="mt-5 text-center text-xs text-gray-400">
                    {isCancelled
                      ? 'This reservation has been cancelled.'
                      : `This reservation is ${badge.label.toLowerCase()} and can no longer be cancelled here.`}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right: what's next + help */}
          <div className="space-y-4 lg:col-span-1">
            {isCancelled ? (
              <div className="rounded-xl bg-[#16264c] p-6 text-white">
                <p className="font-semibold">Planning another stay?</p>
                <p className="mt-3 text-sm text-white/80">
                  You can book a new room anytime. Your cancelled booking stays in your history.
                </p>
                <Link
                  to="/rooms"
                  className="mt-4 block rounded-lg bg-white/10 py-2.5 text-center text-sm font-semibold hover:bg-white/20"
                >
                  Browse Rooms
                </Link>
              </div>
            ) : (
              <div className="rounded-xl bg-[#16264c] p-6 text-white">
                <p className="font-semibold">What's Next?</p>

                <div className="mt-3 space-y-3">
                  {nextSteps.map((step, index) => (
                    <div key={index} className="flex gap-3 text-sm text-white/80">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>

                {showCopyReference && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/30 py-2.5 text-sm font-semibold hover:bg-white/10"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied!' : 'Copy Booking Reference'}
                  </button>
                )}

                <Link
                  to="/my-reservations"
                  className="mt-3 block rounded-lg bg-white/10 py-2.5 text-center text-sm font-semibold hover:bg-white/20"
                >
                  Manage My Booking
                </Link>
              </div>
            )}

            {!isCancelled && (
              <div className="rounded-xl bg-white p-4 text-xs text-gray-500 shadow-sm">
                Free cancellation is available up to 48 hours before check-in. For questions about our
                policy, please contact our concierge below.
              </div>
            )}

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
          to={fromHistory ? '/my-reservations' : '/'}
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-semibold text-[#16264c] hover:bg-gray-200"
        >
          <ArrowLeft className="h-4 w-4" /> {fromHistory ? 'Back to My Bookings' : 'Back to Home'}
        </Link>
      </div>

      <CancelReservationModal
        open={confirmOpen}
        roomName={roomName}
        cancelling={cancelling}
        error={cancelError}
        onConfirm={handleCancel}
        onClose={closeCancelConfirm}
      />
    </div>
  )
}