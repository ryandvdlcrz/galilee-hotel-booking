import client from './client'

/**
 * Fetch room types. Pass checkIn/checkOut (YYYY-MM-DD) to get real-time
 * availability back in each room's `available_rooms` field.
 */
export async function getRoomTypes({ checkIn, checkOut } = {}) {
  const { data } = await client.get('/room-types/', {
    params: { check_in: checkIn, check_out: checkOut },
  })
  return data
}

export async function getRoomTypeBySlug(slug, { checkIn, checkOut } = {}) {
  const { data } = await client.get(`/room-types/${slug}/`, {
    params: { check_in: checkIn, check_out: checkOut },
  })
  return data
}