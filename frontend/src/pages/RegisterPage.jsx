import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import galileeLogo from '../assets/galilee-logo.jpg'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!agreed) {
      setError('Please agree to the Terms of Service and Privacy Policy.')
      return
    }

    // Split "John Doe" into firstName: "John", lastName: "Doe".
    // Anything after the first space is treated as the last name.
    const [firstName, ...rest] = fullName.trim().split(' ')
    const lastName = rest.join(' ')

    setSubmitting(true)
    try {
      await register({ email, password, firstName, lastName, phone })
      navigate('/')
    } catch (err) {
      const data = err.response?.data
      const message = data?.email?.[0] || data?.detail || 'Could not create your account. Please try again.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-[#faf7f0] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <img
            src={galileeLogo}
            alt="Galilee Wonderland"
            className="h-16 w-16 rounded-2xl object-cover shadow-sm"
          />
          <h1 className="mt-4 text-2xl font-bold text-[#16264c]">Create Your Account</h1>
          <p className="mt-2 text-sm text-gray-500">Join the wonderland experience today.</p>
        </div>

        <div className="mt-8 rounded-2xl bg-white p-8 shadow-xl sm:p-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="fullName" className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-[#16264c]">
                <User className="h-4 w-4" /> Full Name
              </label>
              <input
                id="fullName"
                type="text"
                required
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-[#16264c] focus:outline-none focus:ring-1 focus:ring-[#16264c]"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-[#16264c]">
                <Mail className="h-4 w-4" /> Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-[#16264c] focus:outline-none focus:ring-1 focus:ring-[#16264c]"
              />
            </div>

            <div>
              <label htmlFor="phone" className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-[#16264c]">
                <Phone className="h-4 w-4" /> Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-[#16264c] focus:outline-none focus:ring-1 focus:ring-[#16264c]"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-[#16264c]">
                <Lock className="h-4 w-4" /> Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 pr-10 text-sm placeholder:text-gray-400 focus:border-[#16264c] focus:outline-none focus:ring-1 focus:ring-[#16264c]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-400">At least 8 characters.</p>
            </div>

            <label className="flex items-start gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300"
              />
              <span>
                I agree to the{' '}
                <Link to="/terms" className="font-medium text-[#16264c] hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="font-medium text-[#16264c] hover:underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#16264c] py-3 text-sm font-semibold text-white hover:bg-[#0f1f3d] disabled:opacity-50"
            >
              {submitting ? 'Creating account…' : 'Create Account'}
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#16264c] hover:underline">
              Login
            </Link>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Galilee Wonderland Waterpark &amp; Hotel.
          <br />
          <Link to="/contact" className="hover:underline">
            Need help? Contact Support
          </Link>
        </p>
      </div>
    </div>
  )
}