export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#faf7f0]">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#a6842f]">Legal</p>
        <h1 className="mt-1 text-3xl font-bold text-[#16264c] sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: {new Date().getFullYear()}</p>

        <div className="mt-8 space-y-6 rounded-xl bg-white p-6 text-sm leading-relaxed text-gray-600 shadow-sm sm:p-8">
          <section>
            <h2 className="text-base font-bold text-[#16264c]">1. Information We Collect</h2>
            <p className="mt-2">
              When you create an account or make a reservation, we collect your name, email
              address, phone number, and booking details (check-in/check-out dates, number of
              guests, special requests). If you book as a guest, this information is tied to your
              reservation rather than an account.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#16264c]">2. How We Use Your Information</h2>
            <p className="mt-2">
              Your information is used to process and manage your reservation, send booking
              confirmations, and respond to inquiries. We do not sell your personal information
              to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#16264c]">3. Data Storage</h2>
            <p className="mt-2">
              Your account and reservation data is stored securely and is only accessible to
              authorized hotel staff for the purpose of managing bookings and guest services.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#16264c]">4. Your Rights</h2>
            <p className="mt-2">
              You may request access to, correction of, or deletion of your personal information
              by contacting us directly. Guests with an account can also update their details by
              signing in.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#16264c]">5. Contact Us</h2>
            <p className="mt-2">
              If you have questions about this Privacy Policy or how your data is handled,
              please reach out through our Contact page.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}