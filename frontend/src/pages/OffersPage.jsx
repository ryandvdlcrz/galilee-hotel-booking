import { useEffect, useState } from 'react'
import { getPromos } from '../api/promos'

export default function OffersPage() {
  const [promos, setPromos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true
    getPromos()
      .then((data) => {
        if (isMounted) setPromos(data)
      })
      .catch(() => {
        if (isMounted) setError('Could not load offers right now.')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => { isMounted = false }
  }, [])

  return (
    <div className="min-h-screen bg-[#faf7f0]">
      <div className="mx-auto max-w-6xl px-6 py-12 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#a6842f]">
          Limited Time
        </p>
        <h1 className="mt-1 text-3xl font-bold text-[#16264c] sm:text-4xl">Our Offers</h1>
        <p className="mt-2 text-sm text-gray-500">
          Explore our current promos and seasonal deals.
        </p>

        {loading && <p className="mt-10 text-sm text-gray-500">Loading offers…</p>}
        {error && <p className="mt-10 text-sm text-red-600">{error}</p>}

        {!loading && !error && promos.length === 0 && (
          <p className="mt-10 text-sm text-gray-500">No offers available right now — check back soon!</p>
        )}

        {!loading && !error && promos.length > 0 && (
          <div className="mt-10 grid grid-cols-1 gap-6 text-left sm:grid-cols-2 lg:grid-cols-3">
            {promos.map((promo) => {
              const card = (
                <div className="aspect-[4/5] overflow-hidden rounded-xl bg-gray-100 shadow-sm transition-transform hover:scale-[1.02]">
                  {promo.image ? (
                    <img
                      src={promo.image}
                      alt={promo.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400">
                      <span className="text-sm font-medium">{promo.title}</span>
                      <span className="text-xs">No image uploaded yet</span>
                    </div>
                  )}
                </div>
              )

              return promo.link_url ? (
                <a key={promo.id} href={promo.link_url} target="_blank" rel="noopener noreferrer">
                  {card}
                </a>
              ) : (
                <div key={promo.id}>{card}</div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}