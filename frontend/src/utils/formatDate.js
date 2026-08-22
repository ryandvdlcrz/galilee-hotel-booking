/** Format an ISO date string ("2026-08-09") as "Aug 9, 2026". */
export function formatDate(isoDate) {
  if (!isoDate) return ''
  const date = new Date(`${isoDate}T00:00:00`)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Number of nights between two ISO date strings. */
export function nightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0
  const msPerNight = 1000 * 60 * 60 * 24
  const diff = new Date(checkOut) - new Date(checkIn)
  return Math.max(Math.round(diff / msPerNight), 0)
}