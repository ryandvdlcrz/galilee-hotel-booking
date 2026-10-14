import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  User,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Banknote,
  Upload,
  Check,
  CheckCircle2,
  QrCode,
  X,
} from 'lucide-react'
import { getRoomTypeBySlug } from '../api/rooms'
import { createReservation } from '../api/reservations'
import { useAuth } from '../hooks/useAuth'
import { nightsBetween } from '../utils/formatDate'
import { CHECK_IN_TIME, CHECK_OUT_TIME } from '../utils/hotelPolicy'
import { toLocalDigits } from '../utils/phone'
import { GCASH_ACCOUNT, DOWN_PAYMENT_PERCENT, computeDownPayment } from '../utils/hotelPayment'

// Display-only for now — not yet part of the actual charged total.
// See note in handleSubmit() below.
const RESORT_FEE_DISPLAY = 500

const MAX_PROOF_SIZE = 5 * 1024 * 1024 // 5MB, matches the backend check

const peso = (n) =>
  `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

const STEPS = ['Guest Info', 'Payment', 'Confirmation']

export default function BookingCheckoutPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const bookingDetails = location.state
  // roomSlug, checkIn, checkOut, adults, children — handed off from RoomDetailPage.

  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)

  // 1 = guest info, 2 = mode of payment. Step 3 is the confirmation page.
  const [step, setStep] = useState(1)

  const [firstName, setFirstName] = useState(user?.first_name || '')
  const [lastName, setLastName] = useState(user?.last_name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState(toLocalDigits(user?.phone))
  const [specialRequests, setSpecialRequests] = useState('')

  const [paymentMethod, setPaymentMethod] = useState('gcash') // 'gcash' | 'cash'
  const [proofFile, setProofFile] = useState(null)
  const [proofPreview, setProofPreview] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // No booking details means someone navigated here directly rather than
  // through the room detail page's Reserve Now flow — send them back.
  useEffect(() => {
    if (!bookingDetails) {
      navigate('/rooms')
      return
    }
    let isMounted = true
    getRoomTypeBySlug(bookingDetails.roomSlug)
      .then((data) => {
        if (isMounted) setRoom(data)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => { isMounted = false }
  }, [bookingDetails, navigate])

  // Local preview of the chosen receipt. Revoked on change/unmount so the
  // browser doesn't keep the blob in memory.
  useEffect(() => {
    if (!proofFile) {
      setProofPreview('')
      return
    }
    const url = URL.createObjectURL(proofFile)
    setProofPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [proofFile])

  if (!bookingDetails) return null

  const { checkIn, checkOut, adults, children, roomIds } = bookingDetails
  const numRooms = roomIds?.length || 1
  const nights = nightsBetween(checkIn, checkOut)
  const subtotal = room ? Number(room.price_per_night) * numRooms * nights : 0
  const includedGuests = room ? room.capacity * numRooms : 0
  const totalGuestCount = adults + children
  const extraGuests = Math.max(totalGuestCount - includedGuests, 0)
  const extraGuestFee = room ? extraGuests * Number(room.extra_pax_fee) * nights : 0
  const displayTotal = subtotal + extraGuestFee + RESORT_FEE_DISPLAY

  // The amount the backend actually charges (resort fee is NOT included),
  // and the 20% down payment worked out from it.
  const chargedTotal = subtotal + extraGuestFee
  const downPayment = computeDownPayment(chargedTotal)
  const balanceAtCheckIn = chargedTotal - downPayment

  // ---- step 1 -> step 2 ----
  function handleNext(e) {
    e.preventDefault()
    setError('')

    if (!/^9\d{9}$/.test(phone)) {
      setError('Please enter a valid Philippine mobile number (e.g. 9171234567).')
      return
    }
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleBackToGuestInfo() {
    setError('')
    setStep(1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ---- receipt upload helpers ----
  function acceptFile(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, or similar).')
      return
    }
    if (file.size > MAX_PROOF_SIZE) {
      setError('Receipt image must be 5MB or smaller.')
      return
    }
    setError('')
    setProofFile(file)
  }

  function handleFileInput(e) {
    acceptFile(e.target.files?.[0])
    e.target.value = '' // allow re-selecting the same file after removing it
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    acceptFile(e.dataTransfer.files?.[0])
  }

  function selectMethod(method) {
    setPaymentMethod(method)
    setError('')
  }

  // ---- final submit (step 2) ----
  async function handleSubmit() {
    setError('')

    if (paymentMethod === 'gcash' && !proofFile) {
      setError('Please upload your GCash receipt screenshot to continue.')
      return
    }

    setSubmitting(true)

    try {
      // NOTE: total_price is calculated server-side as price_per_night x
      // nights (plus extra guest fees) only — the Resort Fees & Taxes shown
      // above are for display purposes only right now and are not added to
      // the actual charge. The 20% down payment is also worked out
      // server-side from that same total.
      //
      // Sent as multipart/form-data because of the receipt image.
      const formData = new FormData()
      formData.append('room_type', bookingDetails.roomId)
      formData.append('check_in_date', checkIn)
      formData.append('check_out_date', checkOut)
      formData.append('num_rooms', bookingDetails.roomIds.length)
      formData.append('num_guests', adults + children)
      formData.append('guest_name', `${firstName} ${lastName}`.trim())
      formData.append('guest_email', email)
      formData.append('guest_phone', `+63${phone}`)
      formData.append('special_requests', specialRequests)
      bookingDetails.roomIds.forEach((id) => formData.append('room_ids', id))
      formData.append('payment_method', paymentMethod)
      if (paymentMethod === 'gcash' && proofFile) {
        formData.append('payment_proof', proofFile)
      }

      const reservation = await createReservation(formData)
      navigate('/booking/confirmation', { state: { reservation, room, adults, children } })
    } catch (err) {
      const data = err.response?.data
      const message =
        (typeof data === 'object' && Object.values(data || {})[0]?.[0]) ||
        data?.detail ||
        'Could not complete this booking. Please check your details and try again.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const primaryImage = room?.images?.find((img) => img.is_primary) ?? room?.images?.[0]

  const inputClass =
    'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-[#16264c] focus:outline-none focus:ring-1 focus:ring-[#16264c]'

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Step indicator */}
      <div className="rounded-xl bg-gray-50 px-6 py-4">
        <ol className="flex flex-wrap items-center gap-x-8 gap-y-2">
          {STEPS.map((label, index) => {
            const number = index + 1
            const isActive = number === step
            const isDone = number < step
            return (
              <li
                key={label}
                aria-current={isActive ? 'step' : undefined}
                className={`inline-flex items-center gap-2 border-b-2 pb-1 text-sm font-semibold ${
                  isActive
                    ? 'border-[#a6842f] text-[#16264c]'
                    : isDone
                    ? 'border-transparent text-[#16264c]'
                    : 'border-transparent text-gray-400'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                    isActive
                      ? 'bg-[#a6842f] text-white'
                      : isDone
                      ? 'bg-[#16264c] text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isDone ? <Check className="h-3 w-3" /> : number}
                </span>
                {label}
              </li>
            )
          })}
        </ol>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: step content */}
        <div className="lg:col-span-2">
          {step === 1 && (
            <div className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
              <h2 className="flex items-center gap-2 text-lg font-bold text-[#16264c]">
                <User className="h-5 w-5" /> Primary Guest Information
              </h2>

              <form onSubmit={handleNext} className="mt-6 space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[#16264c]">First Name</span>
                    <input
                      type="text"
                      required
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[#16264c]">Last Name</span>
                    <input
                      type="text"
                      required
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className={inputClass}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[#16264c]">Email Address</span>
                    <input
                      type="email"
                      required
                      placeholder="john.doe@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[#16264c]">Phone Number</span>
                    <div className="flex">
                      <span className="flex items-center rounded-l-lg border border-r-0 border-gray-200 bg-gray-100 px-3 text-sm font-medium text-[#16264c]">
                        +63
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        required
                        maxLength={10}
                        placeholder="9171234567"
                        value={phone}
                        onChange={(e) => setPhone(toLocalDigits(e.target.value))}
                        className="w-full rounded-r-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-[#16264c] focus:outline-none focus:ring-1 focus:ring-[#16264c]"
                      />
                    </div>
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[#16264c]">
                    Special Requests (Optional)
                  </span>
                  <textarea
                    rows={4}
                    placeholder="Late check-in, dietary requirements, or special occasions…"
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    className={inputClass}
                  />
                </label>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-semibold text-[#16264c] hover:bg-gray-200"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 rounded-lg bg-[#16264c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0f1f3d] disabled:opacity-50"
                  >
                    Continue to Payment
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {/* Down payment notice + breakdown */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#a6842f] text-white">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-[#16264c]">
                      {DOWN_PAYMENT_PERCENT}% down payment required
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      To protect both guests and Galilee Mansion from fake reservations, a{' '}
                      <span className="font-semibold text-[#16264c]">{DOWN_PAYMENT_PERCENT}% down payment</span>{' '}
                      is required to hold your room. The rest is paid at check-in.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
                    <p className="text-xs text-gray-500">Total rate</p>
                    <p className="mt-1 text-lg font-bold text-[#16264c]">{peso(chargedTotal)}</p>
                  </div>
                  <div className="rounded-lg border border-[#a6842f] bg-amber-100/70 p-3 text-center">
                    <p className="text-xs font-semibold text-[#16264c]">
                      {DOWN_PAYMENT_PERCENT}% down payment (due now)
                    </p>
                    <p className="mt-1 text-lg font-bold text-[#16264c]">{peso(downPayment)}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
                    <p className="text-xs text-gray-500">Balance at check-in</p>
                    <p className="mt-1 text-lg font-bold text-[#16264c]">{peso(balanceAtCheckIn)}</p>
                  </div>
                </div>
              </div>

              {/* Mode of payment */}
              <div className="rounded-xl bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#16264c] text-white">
                      <CreditCard className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-[#16264c]">Mode of payment</h2>
                      <p className="text-xs text-gray-500">
                        Choose how you will pay the {DOWN_PAYMENT_PERCENT}% down payment ({peso(downPayment)})
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
                    Required
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2" role="radiogroup" aria-label="Mode of payment">
                  {/* GCash */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={paymentMethod === 'gcash'}
                    onClick={() => selectMethod('gcash')}
                    className={`rounded-xl border-2 p-4 text-left transition-colors ${
                      paymentMethod === 'gcash'
                        ? 'border-[#16264c] bg-blue-50/40'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold text-white">
                        G
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-[#16264c]">GCash transfer</p>
                          {paymentMethod === 'gcash' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                              <CheckCircle2 className="h-3 w-3" /> Selected
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-600">
                          Pay {DOWN_PAYMENT_PERCENT}% ({peso(downPayment)}) and upload your receipt
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 border-t border-gray-100 pt-2 text-xs text-gray-400">
                      Verified by hotel staff
                    </p>
                  </button>

                  {/* Cash */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={paymentMethod === 'cash'}
                    onClick={() => selectMethod('cash')}
                    className={`rounded-xl border-2 p-4 text-left transition-colors ${
                      paymentMethod === 'cash'
                        ? 'border-[#16264c] bg-blue-50/40'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-[#16264c]">
                        <Banknote className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-[#16264c]">Cash in / counter</p>
                          {paymentMethod === 'cash' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                              <CheckCircle2 className="h-3 w-3" /> Selected
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-600">
                          Pay {DOWN_PAYMENT_PERCENT}% ({peso(downPayment)}) at the front desk
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 border-t border-gray-100 pt-2 text-xs text-gray-400">
                      Verified by hotel staff
                    </p>
                  </button>
                </div>
              </div>

              {/* GCash account + upload */}
              {paymentMethod === 'gcash' ? (
                <>
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50/50 p-5">
                    <div className="flex items-center gap-4">
                      <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-blue-600 text-white">
                        <span className="text-xl font-bold leading-none">G</span>
                        <span className="text-[9px] font-semibold tracking-wide">GCASH</span>
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-blue-700">Official hotel GCash account</p>
                        <p className="mt-0.5 text-base font-bold text-[#16264c]">{GCASH_ACCOUNT.name}</p>
                        <p className="mt-0.5 text-xs text-gray-600">
                          GCash no: <span className="font-bold text-[#16264c]">{GCASH_ACCOUNT.number}</span>
                          <span className="mx-1.5 text-gray-300">|</span>
                          Amount: <span className="font-bold text-blue-700">{peso(downPayment)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="hidden h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white sm:flex">
                      {GCASH_ACCOUNT.qrImage ? (
                        <img src={GCASH_ACCOUNT.qrImage} alt="GCash QR code" className="h-full w-full object-contain" />
                      ) : (
                        <QrCode className="h-9 w-9 text-blue-600" aria-hidden="true" />
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl bg-white p-5 shadow-sm sm:p-6">
                    <p className="flex items-center gap-2 text-sm font-bold text-[#16264c]">
                      <Upload className="h-4 w-4" /> Upload your GCash receipt screenshot *
                    </p>

                    {proofFile ? (
                      <div className="mt-4 flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <img
                          src={proofPreview}
                          alt="Receipt preview"
                          className="h-24 w-24 shrink-0 rounded-lg border border-gray-200 object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#16264c]">{proofFile.name}</p>
                          <p className="text-xs text-gray-500">{(proofFile.size / 1024).toFixed(0)} KB</p>
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-[#16264c] ring-1 ring-gray-200 hover:bg-gray-100"
                            >
                              Replace
                            </button>
                            <button
                              type="button"
                              onClick={() => setProofFile(null)}
                              className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-50"
                            >
                              <X className="h-3 w-3" /> Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => fileInputRef.current?.click()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            fileInputRef.current?.click()
                          }
                        }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          setDragging(true)
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                        className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#16264c] ${
                          dragging ? 'border-[#16264c] bg-blue-50' : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                          <Upload className="h-5 w-5" />
                        </span>
                        <p className="mt-3 text-sm font-semibold text-[#16264c]">
                          Click to upload or drag and drop your receipt
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Proof of your {peso(downPayment)} transfer. Image files up to 5MB.
                        </p>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileInput}
                    />
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600 shadow-sm sm:p-6">
                  <p className="font-semibold text-[#16264c]">Pay at the front desk</p>
                  <p className="mt-1">
                    Your reservation will be saved as pending. Bring your booking reference to the front desk
                    or an over-the-counter branch and pay {peso(downPayment)}. Our team will confirm the
                    reservation once the payment is received.
                  </p>
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={handleBackToGuestInfo}
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-semibold text-[#16264c] hover:bg-gray-200 disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Guest Info
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || loading}
                  className="flex items-center gap-2 rounded-lg bg-[#16264c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0f1f3d] disabled:opacity-50"
                >
                  {submitting
                    ? 'Submitting…'
                    : paymentMethod === 'gcash'
                    ? 'Submit down payment & receipt'
                    : 'Confirm reservation'}
                  {!submitting && <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: order summary */}
        <div className="lg:col-span-1">
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="aspect-[16/9] bg-gray-100">
              {primaryImage ? (
                <img src={primaryImage.image} alt={room?.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                  {loading ? 'Loading…' : 'No image yet'}
                </div>
              )}
            </div>

            <div className="p-5">
              <h3 className="text-lg font-bold text-[#16264c]">{room?.name || '—'}</h3>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">Check-In</p>
                  <p className="font-semibold text-[#16264c]">{checkIn}</p>
                  <p className="text-xs text-gray-500">From {CHECK_IN_TIME}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">Check-Out</p>
                  <p className="font-semibold text-[#16264c]">{checkOut}</p>
                  <p className="text-xs text-gray-500">Until {CHECK_OUT_TIME}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <span className="text-gray-600">Duration</span>
                <span className="font-semibold text-[#16264c]">
                  {nights} Night{nights !== 1 ? 's' : ''}
                </span>
              </div>

              {room && (
                <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-4 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>
                    {numRooms} room{numRooms > 1 ? 's' : ''} × ₱{Number(room.price_per_night).toLocaleString()} × {nights} night{nights !== 1 ? 's' : ''}
                    </span>
                    <span>₱{subtotal.toLocaleString()}</span>
                  </div>
                  {extraGuests > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>
                        {extraGuests} extra guest{extraGuests > 1 ? 's' : ''} × ₱{Number(room.extra_pax_fee).toLocaleString()} × {nights} nights
                      </span>
                      <span>₱{extraGuestFee.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Resort Fees &amp; Taxes</span>
                    <span>₱{RESORT_FEE_DISPLAY.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-base font-bold text-[#16264c]">
                    <span>Total Price</span>
                    <span className="text-[#a6842f]">₱{displayTotal.toLocaleString()}</span>
                  </div>

                  {step === 2 && (
                    <div className="mt-2 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-[#16264c]">
                      <span>Due now ({DOWN_PAYMENT_PERCENT}%)</span>
                      <span>{peso(downPayment)}</span>
                    </div>
                  )}
                </div>
              )}

              {room?.amenities?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {room.amenities.map((a) => (
                    <span
                      key={a.id}
                      className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#16264c]"
                    >
                      {a.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}