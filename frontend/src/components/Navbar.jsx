import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import galileeLogo from '../assets/galilee-logo.jpg'

const navLinkClass = ({ isActive }) =>
  isActive ? 'border-b-2 border-[#a6842f] pb-1' : ''

export default function Navbar() {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 bg-[#faf7f0]/95 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <Link to="/" className="flex items-center gap-2" onClick={closeMenu}>
          <img src={galileeLogo} alt="Galilee Wonderland" className="h-8 w-8 rounded-full" />
          <span className="text-base font-bold text-[#16264c] sm:text-lg">Galilee Mansion</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-8 text-sm font-medium text-[#16264c] md:flex">
          <NavLink to="/" className={navLinkClass}>Home</NavLink>
          <NavLink to="/rooms" className={navLinkClass}>Rooms</NavLink>
          <NavLink to="/offers" className={navLinkClass}>Offers</NavLink>
          <NavLink to="/contact" className={navLinkClass}>Contact</NavLink>
        </div>

        {/* Desktop right side */}
        <div className="hidden items-center gap-4 md:flex">
          {user ? (
            <>
              <Link to="/my-reservations" className="text-sm font-medium text-[#16264c]">
                My Bookings
              </Link>
              <button onClick={logout} className="text-sm font-medium text-[#16264c]">
                Sign out
              </button>
            </>
          ) : (
            <Link to="/login" className="text-sm font-semibold text-[#16264c]">
              Login
            </Link>
          )}
          <Link
            to="/rooms"
            className="rounded-md bg-[#a6842f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#8f7028]"
          >
            Book Now
          </Link>
        </div>

        {/* Mobile/tablet hamburger button */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 md:hidden"
        >
          <span className={`h-0.5 w-6 bg-[#16264c] transition-transform ${menuOpen ? 'translate-y-2 rotate-45' : ''}`} />
          <span className={`h-0.5 w-6 bg-[#16264c] transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`h-0.5 w-6 bg-[#16264c] transition-transform ${menuOpen ? '-translate-y-2 -rotate-45' : ''}`} />
        </button>
      </nav>

      {/* Mobile/tablet dropdown panel */}
      {menuOpen && (
        <div className="border-t border-[#16264c]/10 bg-[#faf7f0] px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-3 pt-3 text-sm font-medium text-[#16264c]">
            <NavLink to="/" className={navLinkClass} onClick={closeMenu}>Home</NavLink>
            <NavLink to="/rooms" className={navLinkClass} onClick={closeMenu}>Rooms</NavLink>
            <NavLink to="/offers" className={navLinkClass} onClick={closeMenu}>Offers</NavLink>
            <NavLink to="/contact" className={navLinkClass} onClick={closeMenu}>Contact</NavLink>

            {user ? (
              <>
                <Link to="/my-reservations" onClick={closeMenu}>My Bookings</Link>
                <button onClick={() => { logout(); closeMenu(); }} className="text-left">
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/login" onClick={closeMenu}>Login</Link>
            )}

            <Link
              to="/rooms"
              onClick={closeMenu}
              className="mt-2 rounded-md bg-[#a6842f] px-5 py-2.5 text-center font-semibold text-white hover:bg-[#8f7028]"
            >
              Book Now
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}