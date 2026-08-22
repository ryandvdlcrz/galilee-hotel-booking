import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

/** The check-in / check-out / guests search bar shown over the hero image. */
export default function SearchBar() {
  const navigate = useNavigate()
  const today = new Date().toISOString().split('T')[0]

  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [adults, setAdults] = useState(1)
  const [children, setChildren] = useState(0)
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()

    // Both dates are required — without them, this button would just
    // duplicate the "Rooms" nav link (same page, no filtering).
    if (!checkIn || !checkOut) {
      setError('Please select both check-in and check-out dates.')
      return
    }

    setError('')
    const params = new URLSearchParams()
    params.set('check_in', checkIn)
    params.set('check_out', checkOut)
    params.set('adults', adults)
    params.set('children', children)
    navigate(`/rooms?${params.toString()}`)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-4 -mt-8 grid grid-cols-1 gap-3 rounded-xl bg-white p-4 shadow-lg sm:mx-auto sm:-mt-10 sm:max-w-2xl sm:gap-4 sm:p-6 md:max-w-4xl md:grid-cols-4 md:items-end"
    >
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-[#16264c]">Check-In</span>
        <input
          type="date"
          required
          min={today}
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-[#16264c]">Check-Out</span>
        <input
          type="date"
          required
          min={checkIn || today}
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-[#16264c]">Guests</span>
        <div className="flex gap-2">
          <select
            value={adults}
            onChange={(e) => setAdults(Number(e.target.value))}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n} Adult{n > 1 ? 's' : ''}</option>
            ))}
          </select>
          <select
            value={children}
            onChange={(e) => setChildren(Number(e.target.value))}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>{n} Child{n !== 1 ? 'ren' : ''}</option>
            ))}
          </select>
        </div>
      </label>

      <div>
        <button
          type="submit"
          className="w-full rounded-md bg-[#16264c] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0f1f3d] md:w-auto"
        >
          Search Availability
        </button>
        {error && <p className="mt-1.5 text-xs text-red-600 md:absolute">{error}</p>}
      </div>
    </form>
  )
}