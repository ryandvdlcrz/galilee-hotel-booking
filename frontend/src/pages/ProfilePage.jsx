import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { changePasswordRequest } from '../api/auth'

const inputClass =
  'w-full rounded-md border border-[#16264c]/20 bg-white px-3 py-2.5 text-sm text-[#16264c] focus:border-[#a6842f] focus:outline-none'
const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-[#16264c]'
const buttonClass =
  'rounded-md bg-[#a6842f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#8f7028] disabled:opacity-60'

function firstError(err, fallback) {
  const data = err.response?.data
  if (!data) return fallback
  if (typeof data.detail === 'string') return data.detail
  const first = Object.values(data)[0]
  return Array.isArray(first) ? first[0] : fallback
}

function DetailsForm({ user }) {
  const { updateProfile } = useAuth()
  const [firstName, setFirstName] = useState(user.first_name || '')
  const [lastName, setLastName] = useState(user.last_name || '')
  const [phone, setPhone] = useState((user.phone || '').replace(/^\+63/, ''))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage({ type: '', text: '' })

    if (phone && !/^9\d{9}$/.test(phone)) {
      setMessage({ type: 'error', text: 'Enter 10 digits starting with 9 (e.g. 9171234567).' })
      return
    }

    setSaving(true)
    try {
      await updateProfile({ firstName, lastName, phone: phone ? `+63${phone}` : '' })
      setMessage({ type: 'success', text: 'Profile updated.' })
    } catch (err) {
      setMessage({ type: 'error', text: firstError(err, 'Could not update your profile.') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-[#16264c]">Personal Details</h2>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>First name</label>
          <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Last name</label>
          <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input className={`${inputClass} bg-gray-50 text-gray-500`} value={user.email} disabled />
        </div>
        <div>
          <label className={labelClass}>Phone</label>
          <div className="flex">
            <span className="inline-flex items-center rounded-l-md border border-r-0 border-[#16264c]/20 bg-gray-50 px-3 text-sm text-[#16264c]">
              +63
            </span>
            <input
              className={`${inputClass} rounded-l-none`}
              inputMode="numeric"
              maxLength={10}
              placeholder="9171234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            />
          </div>
        </div>
      </div>

      {message.text && (
        <p className={`mt-4 text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-700'}`}>
          {message.text}
        </p>
      )}

      <button type="submit" disabled={saving} className={`mt-5 ${buttonClass}`}>
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  )
}

function PasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage({ type: '', text: '' })

    if (next.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters.' })
      return
    }
    if (next !== confirm) {
      setMessage({ type: 'error', text: 'New passwords do not match.' })
      return
    }

    setSaving(true)
    try {
      await changePasswordRequest(current, next)
      setCurrent('')
      setNext('')
      setConfirm('')
      setMessage({ type: 'success', text: 'Password updated.' })
    } catch (err) {
      setMessage({ type: 'error', text: firstError(err, 'Could not update your password.') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-[#16264c]">Change Password</h2>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Current password</label>
          <input type="password" className={inputClass} value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>New password</label>
          <input type="password" className={inputClass} value={next} onChange={(e) => setNext(e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Confirm new password</label>
          <input type="password" className={inputClass} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
      </div>

      {message.text && (
        <p className={`mt-4 text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-700'}`}>
          {message.text}
        </p>
      )}

      <button type="submit" disabled={saving} className={`mt-5 ${buttonClass}`}>
        {saving ? 'Updating…' : 'Update Password'}
      </button>
    </form>
  )
}

export default function ProfilePage() {
  const { user, loading } = useAuth()

  if (loading) return <p className="py-20 text-center text-sm text-gray-500">Loading…</p>
  if (!user) return <Navigate to="/login" replace />

  const memberSince = user.date_joined
    ? new Date(user.date_joined).toLocaleDateString('en-PH', { year: 'numeric', month: 'long' })
    : ''

  return (
    <div className="bg-[#faf7f0]">
      <section className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#a6842f]">Your Account</p>
        <h1 className="mt-1 text-3xl font-bold text-[#16264c]">My Profile</h1>
        {memberSince && <p className="mt-1 text-sm text-gray-600">Member since {memberSince}</p>}

        <div className="mt-8 space-y-6">
          <DetailsForm user={user} />
          <PasswordForm />
          <Link to="/my-reservations" className="inline-block text-sm font-semibold text-[#a6842f] hover:underline">
            View my bookings →
          </Link>
        </div>
      </section>
    </div>
  )
}