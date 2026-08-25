import { Mail, Phone, MapPin } from 'lucide-react'

const CONTACT_INFO = {
  email: 'galileemansion@yahoo.com.ph',
  phones: ['0922-874-3351', '0917-548-8008'],
  address: 'Gen Alejo Santos Highway, San Pedro, Bustos, Bulacan',
  directionsBlurb:
    'Galilee Wonderland Waterpark and Hotel is easily accessible for a perfect escape of fun and relaxation. Enjoy thrilling water attractions and serene accommodations in a family-friendly atmosphere.',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#faf7f0]">
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#a6842f]">
          Get In Touch
        </p>
        <h1 className="mt-1 text-3xl font-bold text-[#16264c] sm:text-4xl">Contact Us</h1>
        <p className="mt-3 text-sm text-gray-500">
          Have a question about your stay or a reservation? Reach out to us directly.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <a
            href={`mailto:${CONTACT_INFO.email}`}
            className="flex flex-col items-center gap-3 rounded-xl bg-white p-8 shadow-sm transition-shadow hover:shadow-md"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <Mail className="h-5 w-5 text-[#16264c]" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Email
            </span>
            <span className="font-semibold text-[#16264c]">{CONTACT_INFO.email}</span>
          </a>

          <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-8 shadow-sm">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <Phone className="h-5 w-5 text-[#16264c]" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Phone
            </span>
            <div className="space-y-1">
              {CONTACT_INFO.phones.map((phone) => (
                <a
                  key={phone}
                  href={`tel:${phone.replace(/-/g, '')}`}
                  className="block font-semibold text-[#16264c] hover:underline"
                >
                  {phone}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-8 text-left shadow-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-[#16264c]" />
            <h2 className="text-lg font-bold text-[#16264c]">How to Get Here</h2>
          </div>
          <p className="mt-2 text-sm font-semibold text-[#a6842f]">{CONTACT_INFO.address}</p>
          <p className="mt-2 text-sm text-gray-600">{CONTACT_INFO.directionsBlurb}</p>
        </div>
      </div>
    </div>
  )
}