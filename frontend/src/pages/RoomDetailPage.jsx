import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Wifi, Snowflake, Tv, Info, Clock, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { getRoomTypeBySlug, getRoomTypes } from '../api/rooms'
import { nightsBetween } from '../utils/formatDate'

const AMENITY_ICONS = {
  wifi: Wifi,
  aircon: Snowflake,
  ac: Snowflake,
  tv: Tv,
}

const CHECK_IN_OUT_POLICY = 'Check-in from 3:00 PM. Check-out by 11:00 AM. Late check-out subject to availability.'

export default function RoomDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()

  const [room, setRoom] = useState(null)
  const [otherRooms, setOtherRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeImage, setActiveImage] = useState(0)

  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setNotFound(false)

    getRoomTypeBySlug(slug)
      .then((data) => {
        if (isMounted) setRoom(data)
      })
      .catch(() => {
        if (isMounted) setNotFound(true)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    getRoomTypes()
      .then((data) => {
        if (isMounted) setOtherRooms(data.filter((r) => r.slug !== slug).slice(0, 2))
      })
      .catch(() => {})

    return () => { isMounted = false }
  }, [slug])

  const nights = nightsBetween(checkIn, checkOut)
  const totalGuests = adults + children
  const includedGuests = room ? room.capacity : 0
  const extraGuests = Math.max(totalGuests - includedGuests, 0)
  const baseRoomCost = room ? nights * Number(room.price_per_night) : 0
  const extraGuestFee = room ? extraGuests * Number(room.extra_pax_fee) * nights : 0
  const total = baseRoomCost + extraGuestFee

  function nextImage() {
    if (!room?.images?.length) return
    setActiveImage((i) => (i + 1) % room.images.length)
  }
  function prevImage() {
    if (!room?.images?.length) return
    setActiveImage((i) => (i - 1 + room.images.length) % room.images.length)
  }

  async function handleReserve(e) {
    e.preventDefault()
    setError('')

    if (!checkIn || !checkOut) {
      setError('Please select your check-in and check-out dates.')
      return
    }

    navigate('/booking/checkout', {
      state: {
        roomId: room.id,
        roomSlug: room.slug,
        checkIn,
        checkOut,
        adults,
        children,
      },
    })
  }

  if (loading) {
    return <div className="mx-auto max-w-6xl px-6 py-20 text-center text-gray-500">Loading room…</div>
  }

  if (notFound || !room) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-20 text-center">
        <p className="text-gray-600">We couldn't find that room.</p>
        <Link to="/rooms" className="mt-4 inline-block text-sm font-semibold text-[#16264c] hover:underline">
          ← Back to all rooms
        </Link>
      </div>
    )
  }

  const images = room.images?.length ? room.images : [null]

  return (
    <div className="bg-[#faf7f0]">
      {/* Dynamic image viewer container that scales to image natural proportions */}
      <section className="relative w-full bg-gray-950">
        <div className="mx-auto max-w-6xl">
          {images[activeImage] ? (
            <img
              src={images[activeImage].image}
              alt={room.name}
              className="h-auto w-full max-h-[80vh] object-contain mx-auto block"
            />
          ) : (
            <div className="flex h-64 items-center justify-center text-gray-400">No image yet</div>
          )}
        </div>

        {/* Floating overlays for title and controls */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 sm:p-8">
          <div className="mx-auto max-w-6xl flex items-end justify-between">
            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              {room.name}
            </h1>

            {images.length > 1 && (
              <div className="flex gap-2">
                <button
                  onClick={prevImage}
                  aria-label="Previous photo"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md hover:bg-white"
                >
                  <ChevronLeft className="h-5 w-5 text-[#16264c]" />
                </button>
                <button
                  onClick={nextImage}
                  aria-label="Next photo"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md hover:bg-white"
                >
                  <ChevronRight className="h-5 w-5 text-[#16264c]" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Details + booking widget */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          {/* Left: details */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-[#16264c]">Unrivaled Comfort &amp; Elegance</h2>
            <p className="mt-3 text-sm text-gray-600">{room.description}</p>

            {room.amenities?.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-[#16264c]">Amenities</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {room.amenities.map((amenity) => {
                    const Icon = AMENITY_ICONS[amenity.icon?.toLowerCase()] || Sparkles
                    return (
                      <span
                        key={amenity.id}
                        className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-[#16264c]"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {amenity.name}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="mt-8 grid grid-cols-1 gap-6 rounded-xl bg-white p-6 sm:grid-cols-2">
              <h3 className="col-span-full text-base font-semibold text-[#16264c]">
                Capacity &amp; Policies
              </h3>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-[#16264c]">
                  <Info className="h-4 w-4" /> Guest Capacity
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Includes up to {room.capacity} guest{room.capacity !== 1 ? 's' : ''}.
                  {Number(room.extra_pax_fee) > 0 && (
                    <> Additional guests are ₱{Number(room.extra_pax_fee).toLocaleString()} per person, per night.</>
                  )}
                </p>
                {room.bed_configuration && (
                  <p className="mt-1 text-sm text-gray-600">{room.bed_configuration}</p>
                )}
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-[#16264c]">
                  <Clock className="h-4 w-4" /> Check-in / Out
                </p>
                <p className="mt-1 text-sm text-gray-600">{CHECK_IN_OUT_POLICY}</p>
              </div>
            </div>
          </div>

          {/* Right: booking widget */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl bg-white p-6 shadow-lg">
              <form onSubmit={handleReserve} className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Starting from
                  </p>
                  <p className="text-3xl font-bold text-[#16264c]">
                    ₱{Number(room.price_per_night).toLocaleString()}
                    <span className="text-sm font-normal text-gray-500"> / night</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-[#16264c]">Check-In</span>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-[#16264c]">Check-Out</span>
                    <input
                      type="date"
                      required
                      min={checkIn || new Date().toISOString().split('T')[0]}
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-sm"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-[#16264c]">Guests</span>
                  <div className="flex gap-2">
                    <select
                      value={adults}
                      onChange={(e) => setAdults(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-sm"
                    >
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n} Adult{n > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                    <select
                      value={children}
                      onChange={(e) => setChildren(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-sm"
                    >
                      {[0, 1, 2, 3, 4].map((n) => (
                        <option key={n} value={n}>{n} Child{n !== 1 ? 'ren' : ''}</option>
                      ))}
                    </select>
                  </div>
                </label>

                {nights > 0 && (
                  <div className="space-y-1 border-t border-gray-100 pt-3 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>₱{Number(room.price_per_night).toLocaleString()} × {nights} night{nights > 1 ? 's' : ''}</span>
                      <span>₱{baseRoomCost.toLocaleString()}</span>
                    </div>
                    {extraGuests > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>
                          {extraGuests} extra guest{extraGuests > 1 ? 's' : ''} × ₱{Number(room.extra_pax_fee).toLocaleString()} × {nights} night{nights > 1 ? 's' : ''}
                        </span>
                        <span>₱{extraGuestFee.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 text-base font-bold text-[#16264c]">
                      <span>Total</span>
                      <span>₱{total.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  className="w-full rounded-lg bg-[#a6842f] py-3 text-sm font-semibold text-white hover:bg-[#8f7028]"
                >
                  Reserve Now
                </button>
                <p className="text-center text-xs text-gray-400">No charge until confirmation</p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Discover more rooms */}
      {otherRooms.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-16">
          <h2 className="text-2xl font-bold text-[#16264c]">Discover More Wonders</h2>
          <p className="mt-1 text-sm text-gray-500">Explore other exclusive accommodations.</p>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {otherRooms.map((r) => {
              const img = r.images?.find((i) => i.is_primary) ?? r.images?.[0]
              return (
                <Link
                  key={r.id}
                  to={`/rooms/${r.slug}`}
                  className="overflow-hidden rounded-xl bg-white shadow-sm"
                >
                  <div className="aspect-[16/9] bg-gray-100">
                    {img ? (
                      <img
                        src={img.image}
                        alt={r.name}
                        className="h-full w-full object-cover object-center"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-gray-400">
                        No image yet
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-[#16264c]">{r.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">{r.description}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-semibold text-[#a6842f]">
                        ₱{Number(r.price_per_night).toLocaleString()}
                        <span className="text-xs font-normal text-gray-500">/night</span>
                      </span>
                      <span className="text-sm font-semibold text-[#16264c]">Explore →</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}