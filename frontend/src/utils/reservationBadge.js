/** One badge per reservation, based only on the status staff set in Django Admin.
 *  Shared by the booking list and the details page. */
const BADGES = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Upcoming', className: 'bg-blue-100 text-[#16264c]' },
  checked_in: { label: 'Checked In', className: 'bg-green-100 text-green-700' },
  checked_out: { label: 'Checked Out', className: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
}

export function getBadge(r) {
  return BADGES[r.status] || BADGES.pending
}