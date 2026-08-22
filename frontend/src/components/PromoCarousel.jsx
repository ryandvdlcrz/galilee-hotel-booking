import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Horizontally-scrolling promo carousel. Works for any number of promos —
 * 1, 2, or many — since it's just a scroll container, not a fixed grid.
 * Supports mouse-drag/touch swipe natively (via scroll-snap) plus arrow
 * buttons for desktop users.
 */
export default function PromoCarousel({ promos }) {
  const scrollRef = useRef(null)

  function scrollByCard(direction) {
    const container = scrollRef.current
    if (!container) return
    const card = container.querySelector('[data-promo-card]')
    const cardWidth = card ? card.offsetWidth + 24 /* gap-6 */ : container.clientWidth
    container.scrollBy({ left: direction * cardWidth, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {promos.map((promo) => {
          const card = (
            <div
              data-promo-card
              className="aspect-[4/5] w-[85%] shrink-0 snap-center overflow-hidden rounded-xl bg-gray-100 sm:w-[48%] lg:w-[31%]"
            >
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
            <a key={promo.id} href={promo.link_url} target="_blank" rel="noopener noreferrer" className="contents">
              {card}
            </a>
          ) : (
            <div key={promo.id} className="contents">
              {card}
            </div>
          )
        })}
      </div>

      {/* Prev/Next arrows — only useful once there's more than one promo */}
      {promos.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            aria-label="Previous promo"
            className="absolute left-0 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-50 sm:flex"
          >
            <ChevronLeft className="h-5 w-5 text-[#16264c]" />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            aria-label="Next promo"
            className="absolute right-0 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-50 sm:flex"
          >
            <ChevronRight className="h-5 w-5 text-[#16264c]" />
          </button>
        </>
      )}
    </div>
  )
}