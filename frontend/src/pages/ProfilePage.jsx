import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { changePasswordRequest } from '../api/auth'

/* ---------- Icons (inline SVG, no extra dependency) ---------- */

function Icon({ children, className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  )
}

const UserIcon = (props) => (
  <Icon {...props}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Icon>
)
const CalendarIcon = (props) => (
  <Icon {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </Icon>
)
const ShieldIcon = (props) => (
  <Icon {...props}>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  </Icon>
)
const BellIcon = (props) => (
  <Icon {...props}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </Icon>
)
const LogoutIcon = (props) => (
  <Icon {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </Icon>
)
const MailIcon = (props) => (
  <Icon {...props}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </Icon>
)
const PhoneIcon = (props) => (
  <Icon {...props}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </Icon>
)
const SaveIcon = (props) => (
  <Icon {...props}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <path d="M17 21v-8H7v8" />
    <path d="M7 3v5h8" />
  </Icon>
)

/* ---------- Shared styles + helpers ---------- */

const labelClass = 'mb-2 block text-sm font-semibold tracking-wide text-[#16264c]'
const fieldWrap =
  'flex items-center gap-3 rounded-lg border border-[#16264c]/10 bg-[#faf7f0] px-4 py-3 text-sm text-[#16264c] focus-within:border-[#a6842f]'
const bareInput = 'w-full bg-transparent outline-none placeholder:text-gray-400'
const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-[#16264c] px-6 py-3 text-sm font-semibold text-white hover:bg-[#101c38] disabled:opacity-60'
const secondaryButton =
  'rounded-lg border border-[#16264c]/20 bg-white px-6 py-3 text-sm font-semibold text-[#16264c] hover:bg-[#faf7f0]'

const sidebarItemBase =
  'flex items-center gap-3 whitespace-nowrap rounded-lg px-4 py-3 text-sm font-semibold tracking-wide transition-colors'
const sidebarItemIdle = 'text-[#16264c]/70 hover:bg-[#16264c]/5'
const sidebarItemActive = 'bg-[#16264c] text-white'

function firstError(err, fallback) {
  const data = err.response?.data
  if (!data) return fallback
  if (typeof data.detail === 'string') return data.detail
  const first = Object.values(data)[0]
  return Array.isArray(first) ? first[0] : fallback
}

function Message({ message }) {
  if (!message.text) return null
  return (
    <p className={`mt-5 text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-700'}`}>
      {message.text}
    </p>
  )
}

function Card({ icon, title, children }) {
  return (
    <section className="mt-10 max-w-3xl rounded-2xl bg-white p-6 shadow-sm md:p-10">
      <h2 className="flex items-center gap-2 border-b border-[#16264c]/10 pb-4 text-xl font-bold text-[#16264c]">
        {icon}
        {title}
      </h2>
      <div className="pt-6">{children}</div>
    </section>
  )
}

/* ---------- Panels ---------- */

function PersonalInfoPanel({ user }) {
  const { updateProfile } = useAuth()

  const savedPhone = (user.phone || '').replace(/^\+63/, '')
  const [firstName, setFirstName] = useState(user.first_name || '')
  const [lastName, setLastName] = useState(user.last_name || '')
  const [phone, setPhone] = useState(savedPhone)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  function handleCancel() {
    setFirstName(user.first_name || '')
    setLastName(user.last_name || '')
    setPhone(savedPhone)
    setMessage({ type: '', text: '' })
  }

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
    <Card icon={<UserIcon className="h-5 w-5" />} title="Personal Information">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>First Name</label>
            <div className={fieldWrap}>
              <input
                className={bareInput}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Surname</label>
            <div className={fieldWrap}>
              <input
                className={bareInput}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Email Address</label>
            <div className={`${fieldWrap} cursor-not-allowed opacity-70`}>
              <MailIcon className="h-5 w-5 shrink-0 text-gray-500" />
              <input className={`${bareInput} cursor-not-allowed`} value={user.email} disabled />
            </div>
            <p className="mt-1.5 text-xs text-gray-500">Your email can't be changed.</p>
          </div>

          <div>
            <label className={labelClass}>Phone Number</label>
            <div className={fieldWrap}>
              <PhoneIcon className="h-5 w-5 shrink-0 text-gray-500" />
              <span className="shrink-0">+63</span>
              <input
                className={bareInput}
                inputMode="numeric"
                maxLength={10}
                placeholder="9171234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </div>
          </div>
        </div>

        <Message message={message} />

        <div className="mt-8 flex justify-end gap-3 border-t border-[#16264c]/10 pt-6">
          <button type="button" onClick={handleCancel} className={secondaryButton}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={primaryButton}>
            <SaveIcon className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Card>
  )
}

function SecurityPanel() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  function handleCancel() {
    setCurrent('')
    setNext('')
    setConfirm('')
    setMessage({ type: '', text: '' })
  }

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
    <Card icon={<ShieldIcon className="h-5 w-5" />} title="Change Password">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Current Password</label>
            <div className={fieldWrap}>
              <input
                type="password"
                className={bareInput}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>New Password</label>
            <div className={fieldWrap}>
              <input
                type="password"
                className={bareInput}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Confirm New Password</label>
            <div className={fieldWrap}>
              <input
                type="password"
                className={bareInput}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        <Message message={message} />

        <div className="mt-8 flex justify-end gap-3 border-t border-[#16264c]/10 pt-6">
          <button type="button" onClick={handleCancel} className={secondaryButton}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={primaryButton}>
            <SaveIcon className="h-4 w-4" />
            {saving ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </form>
    </Card>
  )
}

function NotificationsPanel() {
  return (
    <Card icon={<BellIcon className="h-5 w-5" />} title="Notifications">
      <p className="text-sm text-gray-600">Notification preferences are coming soon.</p>
    </Card>
  )
}

/* ---------- Page ---------- */

const PAGE_COPY = {
  info: {
    title: 'Personal Information',
    subtitle: 'Update your personal details and contact information here.',
  },
  security: {
    title: 'Account Security',
    subtitle: 'Manage your password and keep your account safe.',
  },
  notifications: {
    title: 'Notifications',
    subtitle: 'Choose how you want to hear from us.',
  },
}

export default function ProfilePage() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('info')

  if (loading) return <p className="py-20 text-center text-sm text-gray-500">Loading…</p>
  if (!user) return <Navigate to="/login" replace />

  function handleLogout() {
    logout()
    navigate('/')
  }

  const copy = PAGE_COPY[tab]

  return (
    <div className="bg-[#faf7f0]">
      <div className="mx-auto flex max-w-6xl flex-col md:min-h-[calc(100vh-5rem)] md:flex-row">
        {/* --- Sidebar --- */}
        <aside className="flex flex-col border-b border-[#16264c]/10 bg-[#f5f1ea] p-4 md:w-64 md:shrink-0 md:border-b-0 md:border-r md:py-8">
          <nav className="flex gap-2 overflow-x-auto md:flex-col">
            <button
              type="button"
              onClick={() => setTab('info')}
              className={`${sidebarItemBase} ${tab === 'info' ? sidebarItemActive : sidebarItemIdle}`}
            >
              <UserIcon className="h-5 w-5" />
              Personal Info
            </button>

            <Link to="/my-reservations" className={`${sidebarItemBase} ${sidebarItemIdle}`}>
              <CalendarIcon className="h-5 w-5" />
              My Bookings
            </Link>

            <button
              type="button"
              onClick={() => setTab('security')}
              className={`${sidebarItemBase} ${tab === 'security' ? sidebarItemActive : sidebarItemIdle}`}
            >
              <ShieldIcon className="h-5 w-5" />
              Account Security
            </button>

            <button
              type="button"
              onClick={() => setTab('notifications')}
              className={`${sidebarItemBase} ${tab === 'notifications' ? sidebarItemActive : sidebarItemIdle}`}
            >
              <BellIcon className="h-5 w-5" />
              Notifications
            </button>
          </nav>

          <div className="mt-3 border-t border-[#16264c]/10 pt-3 md:mt-auto">
            <button
              type="button"
              onClick={handleLogout}
              className={`${sidebarItemBase} w-full text-red-700 hover:bg-red-50`}
            >
              <LogoutIcon className="h-5 w-5" />
              Log Out
            </button>
          </div>
        </aside>

        {/* --- Main content --- */}
        <main className="flex-1 px-6 py-10 md:px-12 md:py-14">
          <h1 className="text-3xl font-extrabold text-[#16264c] md:text-4xl">{copy.title}</h1>
          <p className="mt-2 text-sm text-gray-600 md:text-base">{copy.subtitle}</p>

          {tab === 'info' && <PersonalInfoPanel user={user} />}
          {tab === 'security' && <SecurityPanel />}
          {tab === 'notifications' && <NotificationsPanel />}
        </main>
      </div>
    </div>
  )
}