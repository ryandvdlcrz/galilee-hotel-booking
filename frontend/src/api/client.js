import axios from 'axios'

// Set VITE_API_BASE_URL in frontend/.env, e.g. http://localhost:8000/api
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

const client = axios.create({ baseURL })

// Attach the auth token (if the user is logged in) to every request.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Token ${token}`
  }
  return config
})

// If the backend says the token is invalid/expired, clear it so the UI
// falls back to a logged-out state instead of silently failing.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')
    }
    return Promise.reject(error)
  }
)

export default client