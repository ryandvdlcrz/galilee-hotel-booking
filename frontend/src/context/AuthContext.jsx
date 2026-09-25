import { createContext, useEffect, useState } from 'react'
import { loginRequest, registerRequest, fetchCurrentUser, googleLoginRequest } from '../api/auth'


export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // On first load, if a token exists, try to restore the session.
  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if (!token) {
      setLoading(false)
      return
    }
    fetchCurrentUser()
      .then(setUser)
      .catch(() => localStorage.removeItem('authToken'))
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const data = await loginRequest(email, password)
    localStorage.setItem('authToken', data.token)
    setUser(data.user)
    return data.user
  }

  async function loginWithGoogle(credential) {
  const data = await googleLoginRequest(credential)
  localStorage.setItem('authToken', data.token)
  setUser(data.user)
  return data.user
}

  async function register(fields) {
    const data = await registerRequest(fields)
    localStorage.setItem('authToken', data.token)
    setUser(data.user)
    return data.user
  }

  function logout() {
    localStorage.removeItem('authToken')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, loginWithGoogle }}>
      {children}
    </AuthContext.Provider>
  )
}