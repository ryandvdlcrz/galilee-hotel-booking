import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Promo carousel.
 * - 1 promo: centered poster, no controls.
 * - A few promos that all fit: centered row, no controls.
 * - More promos than fit: snap-scrolling carousel with arrows (desktop),
 *   swipe (touch) and dots.
 * Images are shown in full (never cropped). No extra library needed.
 */

function getMetrics(el) {
  const first = el.querySelector('[data-promo-card]')
  if (!first) return null
  const gap = parseFloat(getComputedStyle(el).columnGap) || 0
  return { step: first.offsetWidth + gap, gap }
}

function Slide({ promo, index, total, widthClass }) {
  const classes = `${widthClass} relative aspect-[4/5] shrink-0 snap-start overflow-hidden rounded-2xl bg-[#f1ead8] shadow-lg`

  const content = promo.image ? (
    <img
      src={promo.image}
      alt={promo.title}
      loading="lazy"
      decoding="async"
      draggable={false}
      className="h-full w-full object-contain"
    />
  ) : (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-gray-500">
      <span className="text-sm font-medium">{promo.title}</span>
      <span className="text-xs">No image uploaded yet</span>
    </div>
  )

  const shared = {
    'data-promo-card': true,
    role: 'group',
    'aria-roledescription': 'slide',
    'aria-label': `${index + 1} of ${total}`,
  }

  if (promo.link_url) {
    return (
      <a
        {...shared}
        href={promo.link_url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${classes} transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a6842f]`}
      >
        {content}
      </a>
    )
  }

  return (
    <div {...shared} className={classes}>
      {content}
    </div>
  )
}

export default function PromoCarousel({ promos }) {
  const scrollRef = useRef(null)
  const [view, setView] = useState({
    canScroll: false,
    positions: 1,
    active: 0,
    atStart: true,
    atEnd: true,
  })

  const total = promos.length
  const single = total === 1

  // Measure the scroller and work out what the controls should show.
  const update = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const metrics = getMetrics(el)
    if (!metrics) return
    const { step, gap } = metrics

    const canScroll = el.scrollWidth > el.clientWidth + 1
    const visible = Math.max(1, Math.floor((el.clientWidth + gap) / step + 0.05))
    const positions = Math.max(1, total - visible + 1)
    const atStart = el.scrollLeft <= 1
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1

    let active = Math.min(Math.max(Math.round(el.scrollLeft / step), 0), positions - 1)
    if (atStart) active = 0
    if (atEnd) active = positions - 1

    setView((prev) =>
      prev.canScroll === canScroll &&
      prev.positions === positions &&
      prev.active === active &&
      prev.atStart === atStart &&
      prev.atEnd === atEnd
        ? prev
        : { canScroll, positions, active, atStart, atEnd }
    )
  }, [total])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return undefined

    let frame = 0
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }

    update()
    el.addEventListener('scroll', schedule, { passive: true })
    const observer = new ResizeObserver(schedule)
    observer.observe(el)

    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('scroll', schedule)
      observer.disconnect()
    }
  }, [update])

  function goTo(index) {
    const el = scrollRef.current
    if (!el) return
    const metrics = getMetrics(el)
    if (!metrics) return
    const target = Math.min(Math.max(index, 0), view.positions - 1)
    el.scrollTo({ left: target * metrics.step, behavior: 'smooth' })
  }

  if (total === 0) return null

  const slideWidth = single ? 'w-[85%] max-w-[420px]' : 'w-[85%] sm:w-[46%] lg:w-[31%]'
  const scrollerClass = [
    'relative flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth py-4',
    '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
    view.canScroll ? '' : 'justify-center',
  ].join(' ')

  return (
    <div role="region" aria-roledescription="carousel" aria-label="Promotions">
      <div className="relative">
        <div ref={scrollRef} className={scrollerClass}>
          {promos.map((promo, index) => (
            <Slide
              key={promo.id}
              promo={promo}
              index={index}
              total={total}
              widthClass={slideWidth}
            />
          ))}
        </div>

        {view.canScroll && !view.atStart && (
          <button
            type="button"
            onClick={() => goTo(view.active - 1)}
            aria-label="Previous promo"
            className="absolute left-0 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-50 sm:flex"
          >
            <ChevronLeft className="h-5 w-5 text-[#16264c]" />
          </button>
        )}

        {view.canScroll && !view.atEnd && (
          <button
            type="button"
            onClick={() => goTo(view.active + 1)}
            aria-label="Next promo"
            className="absolute right-0 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-50 sm:flex"
          >
            <ChevronRight className="h-5 w-5 text-[#16264c]" />
          </button>
        )}
      </div>

      {view.canScroll && view.positions > 1 && (
        <div className="mt-3 flex justify-center gap-2">
          {Array.from({ length: view.positions }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === view.active ? 'true' : undefined}
              className={`h-2.5 rounded-full transition-all ${
                i === view.active
                  ? 'w-6 bg-[#16264c]'
                  : 'w-2.5 bg-[#16264c]/25 hover:bg-[#16264c]/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}