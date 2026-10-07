/** One badge style for a reservation, shared by the booking list and the details page. */
export function getBadge(r) {
  if (r.status === 'cancelled') return { label: 'Cancelled', className: 'bg-red-100 text-red-700' }
  if (r.status === 'checked_in') return { label: 'Checked In', className: 'bg-blue-100 text-blue-700' }
  if (r.status === 'checked_out') return { label: 'Checked Out', className: 'bg-gray-100 text-gray-600' }

  // pending / confirmed
  const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time
  if (r.check_in_date >= today) {
    return { label: 'Upcoming', className: 'bg-blue-100 text-[#16264c]' }
  }
  return {
    label: r.status === 'pending' ? 'Pending' : 'Confirmed',
    className: 'bg-gray-100 text-gray-600',
  }
}