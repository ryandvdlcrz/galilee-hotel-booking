import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import galileeLogo from '../assets/galilee-logo.jpg'

const navLinkClass = ({ isActive }) =>
  isActive ? 'border-b-2 border-[#a6842f] pb-1' : ''

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="10" r="3" />
      <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
    </svg>
  )
}

export default function Navbar() {
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 bg-[#faf7f0]/95 backdrop-blur">
      <nav className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 md:grid md:grid-cols-[1fr_auto_1fr] lg:px-10">
        <Link to="/" className="flex items-center gap-2 justify-self-start" onClick={closeMenu}>
          <img src={galileeLogo} alt="Galilee Wonderland" className="h-8 w-8 rounded-full" />
          <span className="text-base font-bold text-[#16264c] sm:text-lg">Galilee Mansion</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-8 text-sm font-medium text-[#16264c] md:flex">
          <NavLink to="/" className={navLinkClass}>Home</NavLink>
          <NavLink to="/rooms" className={navLinkClass}>Rooms</NavLink>
          <NavLink to="/contact" className={navLinkClass}>Contact</NavLink>
        </div>

        {/* Desktop right side */}
        <div className="hidden items-center gap-4 justify-self-end md:flex">
          {user ? (
            <Link to="/profile" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#16264c]">
              <ProfileIcon />
              Profile
            </Link>
          ) : (
            <>
              <Link to="/find-reservation" className="text-sm font-medium text-[#16264c]">
                Find Booking
              </Link>
              <Link to="/login" className="text-sm font-semibold text-[#16264c]">
                Login
              </Link>
            </>
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
            <NavLink to="/contact" className={navLinkClass} onClick={closeMenu}>Contact</NavLink>

            {user ? (
              <Link to="/profile" onClick={closeMenu} className="inline-flex items-center gap-1.5">
                <ProfileIcon />
                Profile
              </Link>
            ) : (
              <>
                <Link to="/find-reservation" onClick={closeMenu}>Find Booking</Link>
                <Link to="/login" onClick={closeMenu}>Login</Link>
              </>
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