import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import RoomListPage from './pages/RoomListPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import RoomDetailPage from './pages/RoomDetailPage'
import BookingCheckoutPage from './pages/BookingCheckoutPage'
import BookingConfirmationPage from './pages/BookingConfirmationPage'
import MyReservationsPage from './pages/MyReservationsPage'
import OffersPage from './pages/OffersPage'

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/rooms" element={<RoomListPage />} />
        <Route path="/rooms/:slug" element={<RoomDetailPage />} />
        <Route path="/booking/checkout" element={<BookingCheckoutPage />} />
        <Route path="/booking/confirmation" element={<BookingConfirmationPage />} />
        <Route path="/my-reservations" element={<MyReservationsPage />} />
        <Route path="/offers" element={<OffersPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
      <Footer />
    </>
  )
}

export default App