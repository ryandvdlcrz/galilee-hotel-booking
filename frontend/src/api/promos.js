import client from './client'

/** Active promos, ordered by display_order (set by staff in Django Admin). */
export async function getPromos() {
  const { data } = await client.get('/promos/')
  return data
}