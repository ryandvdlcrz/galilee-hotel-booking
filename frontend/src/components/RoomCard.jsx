import { Link } from 'react-router-dom'

/** Matches the "Deluxe Garden Suite" style card from the Figma design. */
export default function RoomCard({ room, badge, bookingQuery = '' }) {
  const primaryImage = room.images?.find((img) => img.is_primary) ?? room.images?.[0]

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="relative aspect-[4/3] bg-gray-100">
        {primaryImage ? (
          <img src={primaryImage.image} alt={room.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            No image yet
          </div>
        )}
        {badge && (
          <span className="absolute right-3 top-3 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-[#16264c]">
            {badge}
          </span>
        )}
      </div>

      <div className="p-5">
        <h3 className="text-lg font-bold text-[#16264c]">{room.name}</h3>

        <div className="mt-1 flex gap-4 text-xs text-gray-500">
          {room.size_sqm && <span>{room.size_sqm}m²</span>}
          <span>Up to {room.capacity} guests</span>
        </div>

        <div className="mt-4 flex items-end justify-between">
          <div>
            <span className="block text-xs text-gray-500">Starts from</span>
            <span className="text-xl font-bold text-[#a6842f]">
              ₱{Number(room.price_per_night).toLocaleString()}
              <span className="text-xs font-normal text-gray-500">/night</span>
            </span>
          </div>
          <Link
            to={`/rooms/${room.slug}${bookingQuery}`}
            className="text-sm font-semibold text-[#16264c] hover:underline"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  )
}