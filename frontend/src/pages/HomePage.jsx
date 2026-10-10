import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SearchBar from '../components/SearchBar'
import RoomCard from '../components/RoomCard'
import { getRoomTypes } from '../api/rooms'
import { getPromos } from '../api/promos'
import PromoCarousel from '../components/PromoCarousel'
import heroImage from '../assets/galilee-home.png'

const SERVICES = [
  { title: '24/7 Concierge', description: 'Professional assistance for all your needs, from local recommendations to transport.' },
  { title: 'Gourmet Dining', description: 'Exquisite culinary experiences prepared by award-winning chefs.' },
  { title: 'Exclusive Guided Tours', description: 'Discover the hidden gems of the Galilee region with our expert local guides.' },
  { title: 'Wellness Center', description: 'Premium spa and fitness facilities for your rejuvenation.' },
]

export default function HomePage() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [promos, setPromos] = useState([])
  const [promosLoading, setPromosLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    getRoomTypes()
      .then((data) => {
        if (isMounted) setRooms(data)
      })
      .catch(() => {
        if (isMounted) setError('Could not load rooms right now.')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    let isMounted = true
    getPromos()
      .then((data) => {
        if (isMounted) setPromos(data)
      })
      .catch(() => {
        // Fail quietly — promos are a nice-to-have, not critical to the page.
      })
      .finally(() => {
        if (isMounted) setPromosLoading(false)
      })
    return () => { isMounted = false }
  }, [])

  return (
    <div className="bg-[#faf7f0]">
      {/* --- Hero --- */}
      <section className="relative">
        <div
          className="h-[320px] bg-cover bg-center sm:h-[380px] md:h-[420px]"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="flex h-full flex-col justify-center bg-black/40 px-4 sm:px-8 md:px-16">
            <div className="mt-8 max-w-lg text-white sm:mt-12 md:mt-16">
              <p className="max-w-xs text-xs sm:max-w-sm sm:text-sm md:max-w-lg md:text-base">
                Experience the ultimate fusion of luxury hospitality and high-octane
                aquatic adventure at the Galilee Wonderland Resort.
              </p>
              <Link
                to="/offers"
                className="mt-3 inline-block rounded-md border border-white px-4 py-2 text-xs font-semibold hover:bg-white hover:text-[#16264c] sm:mt-4 sm:px-5 sm:py-2.5 sm:text-sm"
              >
                View Promos
              </Link>
            </div>
          </div>
        </div>

        <SearchBar />
      </section>

      {/* --- Rooms --- */}
      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#a6842f]">
          Refined Comfort
        </p>
        <h2 className="mt-1 text-3xl font-bold text-[#16264c]">Luxurious Accommodations</h2>

        {loading && <p className="mt-8 text-sm text-gray-500">Loading rooms…</p>}
        {error && <p className="mt-8 text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="mt-10 grid grid-cols-1 gap-6 text-left sm:grid-cols-2 md:grid-cols-3">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        )}

        {!loading && !error && rooms.length === 0 && (
          <p className="mt-8 text-sm text-gray-500">
            No room types available yet — add some in Django Admin.
          </p>
        )}
      </section>

      {/* --- Services --- */}
      <section className="mx-auto max-w-6xl px-6 pb-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#a6842f]">
          Premium Experience
        </p>
        <h2 className="mt-1 text-3xl font-bold text-[#16264c]">Our Signature Services</h2>

        <div className="mt-10 grid grid-cols-1 gap-6 text-left sm:grid-cols-2 md:grid-cols-4">
          {SERVICES.map((service) => (
            <div key={service.title} className="rounded-xl bg-gray-50 p-6">
              <h3 className="font-bold text-[#16264c]">{service.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{service.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- Promos --- */}
      {!promosLoading && promos.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-16 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#a6842f]">
            Limited Time
          </p>
          <h2 className="mt-1 text-3xl font-bold text-[#16264c]">Our Promos</h2>

          <div className="mt-10">
            <PromoCarousel promos={promos} />
          </div>
        </section>
      )}

    </div>
  )
}