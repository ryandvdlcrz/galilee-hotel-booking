import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import RoomCard from '../components/RoomCard'
import { getRoomTypes } from '../api/rooms'
import { formatDate } from '../utils/formatDate'

export default function RoomListPage() {
  const [searchParams] = useSearchParams()
  const checkIn = searchParams.get('check_in') || ''
  const checkOut = searchParams.get('check_out') || ''
  const adults = searchParams.get('adults') || '1'
  const children = searchParams.get('children') || '0'

  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setError('')

    getRoomTypes({ checkIn, checkOut })
      .then((data) => {
        if (isMounted) setRooms(data)
      })
      .catch(() => {
        if (isMounted) setError('Could not load rooms right now. Please try again.')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => { isMounted = false }
  }, [checkIn, checkOut])

  const hasDates = Boolean(checkIn && checkOut)
  const bookingQuery = hasDates
  ? `?check_in=${checkIn}&check_out=${checkOut}&adults=${adults}&children=${children}`
  : ''

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-bold text-[#16264c]">Available Rooms</h1>

      {/* Search summary — shows what the customer searched for, if anything */}
      {hasDates ? (
        <p className="mt-2 text-sm text-gray-600">
          {formatDate(checkIn)} – {formatDate(checkOut)} · {adults} Adult{adults !== '1' ? 's' : ''}
          {Number(children) > 0 && `, ${children} Child${children !== '1' ? 'ren' : ''}`}
        </p>
      ) : (
        <p className="mt-2 text-sm text-gray-600">
          Showing all room types. Search specific dates from the homepage to see live availability.
        </p>
      )}

      {loading && (
        <p className="mt-10 text-sm text-gray-500">Loading rooms…</p>
      )}

      {!loading && error && (
        <p className="mt-10 text-sm text-red-600">{error}</p>
      )}

      {!loading && !error && rooms.length === 0 && (
        <p className="mt-10 text-sm text-gray-500">
          No room types are available for these dates. Try different dates.
        </p>
      )}

      {!loading && !error && rooms.length > 0 && (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <div key={room.id}>
              <RoomCard room={room} bookingQuery={bookingQuery}/>
              {hasDates && (
                <p
                  className={`mt-2 text-xs font-medium ${
                    room.available_rooms > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {room.available_rooms > 0
                    ? `${room.available_rooms} room${room.available_rooms > 1 ? 's' : ''} available`
                    : 'Fully booked for these dates'}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}