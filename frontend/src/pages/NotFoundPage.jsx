import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-[#faf7f0] px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-[#a6842f]">Error 404</p>
      <h1 className="mt-2 text-4xl font-bold text-[#16264c] sm:text-5xl">Page Not Found</h1>
      <p className="mt-3 max-w-md text-sm text-gray-500">
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <Link
        to="/"
        className="mt-6 flex items-center gap-2 rounded-lg bg-[#16264c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0f1f3d]"
      >
        <Home className="h-4 w-4" /> Back to Home
      </Link>
    </div>
  )
}