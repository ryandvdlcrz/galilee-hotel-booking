export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#faf7f0]">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#a6842f]">Legal</p>
        <h1 className="mt-1 text-3xl font-bold text-[#16264c] sm:text-4xl">Terms of Service</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: {new Date().getFullYear()}</p>

        <div className="mt-8 space-y-6 rounded-xl bg-white p-6 text-sm leading-relaxed text-gray-600 shadow-sm sm:p-8">
          <section>
            <h2 className="text-base font-bold text-[#16264c]">1. Reservations</h2>
            <p className="mt-2">
              By submitting a booking through this website, you confirm that all information
              provided (name, contact details, guest count) is accurate. Reservations are subject
              to room availability and are not guaranteed until confirmed by our staff.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#16264c]">2. Payment</h2>
            <p className="mt-2">
              Prices displayed are per room, per night, in Philippine Peso (₱), and may not
              include applicable taxes, service charges, or extra-guest fees, which will be
              reflected in your final total before confirmation.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#16264c]">3. Cancellations</h2>
            <p className="mt-2">
              Reservations may be cancelled by the guest prior to check-in, subject to the
              cancellation policy in effect at the time of booking. Cancelled reservations will
              not be charged further, but any amounts already collected may be non-refundable
              depending on timing.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#16264c]">4. Guest Conduct</h2>
            <p className="mt-2">
              Guests are expected to comply with hotel policies during their stay, including
              posted check-in/check-out times, maximum occupancy per room, and respectful use of
              shared facilities. The hotel reserves the right to refuse service for conduct that
              endangers other guests or staff.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#16264c]">5. Changes to These Terms</h2>
            <p className="mt-2">
              We may update these Terms of Service from time to time. Continued use of this
              website after changes are posted constitutes acceptance of the revised terms.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}