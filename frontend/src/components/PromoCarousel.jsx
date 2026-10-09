import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Promo image carousel: one promo at a time.
 * - 1 promo: shown on its own, no controls.
 * - 2+ promos: fades between slides, with arrows, dots, swipe, keyboard
 *   arrows and autoplay (pauses on hover/focus, respects reduced motion).
 * Wide (landscape) images fill the whole banner on larger screens.
 * Tall posters are shown in full over a blurred copy of themselves.
 */

const AUTOPLAY_MS = 5000 // set to 0 to turn autoplay off
const SWIPE_PX = 50

function Slide({ promo, index, total, isActive }) {
  // Wide images fill the whole banner on larger screens.
  // Tall posters are shown in full over a blurred copy of themselves.
  const [wide, setWide] = useState(false)

  const layer = `absolute inset-0 transition-opacity duration-500 ease-in-out ${
    isActive ? 'opacity-100' : 'pointer-events-none opacity-0'
  }`

  const content = promo.image ? (
    <>
      <img
        src={promo.image}
        alt=""
        aria-hidden="true"
        draggable={false}
        loading="lazy"
        decoding="async"
        className={`absolute inset-0 h-full w-full scale-125 object-cover opacity-70 blur-2xl ${
          wide ? 'sm:hidden' : ''
        }`}
      />
      <div className={`absolute inset-0 bg-black/10 ${wide ? 'sm:hidden' : ''}`} />
      <div
        className={`relative flex h-full items-center justify-center ${
          wide ? 'p-4 sm:p-0' : 'p-4 sm:p-6'
        }`}
      >
        <img
          src={promo.image}
          alt={promo.title}
          draggable={false}
          loading={index === 0 ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={(e) =>
            setWide(e.currentTarget.naturalWidth >= e.currentTarget.naturalHeight * 1.4)
          }
          className={`max-h-full max-w-full rounded-xl object-contain shadow-2xl ${
            wide
              ? 'sm:h-full sm:w-full sm:max-w-none sm:rounded-none sm:object-cover sm:shadow-none'
              : ''
          }`}
        />
      </div>
    </>
  ) : (
    <div className="flex h-full flex-col items-center justify-center gap-2 bg-[#16264c] px-6 text-center text-white">
      <span className="text-2xl font-bold">{promo.title}</span>
    </div>
  )

  const shared = {
    role: 'group',
    'aria-roledescription': 'slide',
    'aria-label': `${index + 1} of ${total}`,
    'aria-hidden': !isActive,
  }

  if (promo.link_url) {
    return (
      <a
        {...shared}
        href={promo.link_url}
        target="_blank"
        rel="noopener noreferrer"
        draggable={false}
        tabIndex={isActive ? 0 : -1}
        className={`${layer} block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a6842f]`}
      >
        {content}
      </a>
    )
  }

  return (
    <div {...shared} className={layer}>
      {content}
    </div>
  )
}

export default function PromoCarousel({ promos }) {
  const total = promos.length
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const drag = useRef({ x: 0, swiped: false })

  const current = total ? Math.min(active, total - 1) : 0

  const go = useCallback(
    (i) => {
      if (total) setActive(((i % total) + total) % total)
    },
    [total]
  )

  // Autoplay (only with 2+ promos)
  useEffect(() => {
    if (total < 2 || !AUTOPLAY_MS || paused) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const id = setInterval(() => {
      if (!document.hidden) setActive((i) => (i + 1) % total)
    }, AUTOPLAY_MS)
    return () => clearInterval(id)
  }, [total, paused, current])

  if (total === 0) return null

  const multiple = total > 1

  function handlePointerDown(e) {
    drag.current = { x: e.clientX, swiped: false }
  }

  function handlePointerUp(e) {
    if (!multiple) return
    const dx = e.clientX - drag.current.x
    if (Math.abs(dx) > SWIPE_PX) {
      drag.current.swiped = true
      go(current + (dx < 0 ? 1 : -1))
    }
  }

  // A swipe should not open the promo link
  function handleClickCapture(e) {
    if (drag.current.swiped) {
      e.preventDefault()
      e.stopPropagation()
      drag.current.swiped = false
    }
  }

  function handleKeyDown(e) {
    if (!multiple) return
    if (e.key === 'ArrowLeft') go(current - 1)
    if (e.key === 'ArrowRight') go(current + 1)
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Promotions"
      className="w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        tabIndex={multiple ? 0 : -1}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onClickCapture={handleClickCapture}
        onKeyDown={handleKeyDown}
        className="relative aspect-[4/5] touch-pan-y select-none overflow-hidden rounded-3xl bg-[#f1ead8] shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a6842f] sm:aspect-[16/9]"
      >
        {promos.map((promo, index) => (
          <Slide
            key={promo.id}
            promo={promo}
            index={index}
            total={total}
            isActive={index === current}
          />
        ))}

        {multiple && (
          <>
            <button
              type="button"
              onClick={() => go(current - 1)}
              aria-label="Previous promo"
              className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md hover:bg-white sm:h-10 sm:w-10"
            >
              <ChevronLeft className="h-5 w-5 text-[#16264c]" />
            </button>
            <button
              type="button"
              onClick={() => go(current + 1)}
              aria-label="Next promo"
              className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md hover:bg-white sm:h-10 sm:w-10"
            >
              <ChevronRight className="h-5 w-5 text-[#16264c]" />
            </button>

            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2 rounded-full bg-black/30 px-3 py-2">
              {promos.map((promo, i) => (
                <button
                  key={promo.id}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Go to promo ${i + 1}`}
                  aria-current={i === current ? 'true' : undefined}
                  className={`h-2.5 rounded-full transition-all ${
                    i === current ? 'w-6 bg-white' : 'w-2.5 bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}