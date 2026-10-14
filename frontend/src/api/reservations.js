import client from './client'

/**
 * Create a reservation. Works for both guest checkout and logged-in users —
 * if a user is authenticated, the auth token is attached automatically by
 * the client interceptor and the backend links the reservation to them.
 */
export async function createReservation(payload) {
  const config =
    payload instanceof FormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : undefined
  const { data } = await client.post('/reservations/', payload, config)
  return data
}

/** Reservations belonging to the currently logged-in user. */
export async function getMyReservations() {
  const { data } = await client.get('/reservations/my/')
  return data
}

/** Look up a reservation by its code + the email it was booked with.
 * Both must match — a code alone isn't enough to view someone's booking. */
export async function lookupReservation(reservationCode, email) {
  const { data } = await client.post('/reservations/lookup/', {
    reservation_code: reservationCode,
    email,
  })
  return data
}

/** Cancel a reservation (self-service, only for pending/confirmed bookings).
 * Guests (no account) must pass { reservation_code, email } as proof of
 * ownership. Logged-in users can omit it. */
export async function cancelReservation(id, guest = {}) {
  const { data } = await client.post(`/reservations/${id}/cancel/`, guest)
  return data
}