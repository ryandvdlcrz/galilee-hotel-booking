import client from './client'

export async function loginRequest(email, password) {
  const { data } = await client.post('/auth/login/', { email, password })
  return data // expected: { token, user: { id, email, first_name, last_name } }
}

export async function registerRequest({ email, password, firstName, lastName, phone }) {
  const { data } = await client.post('/auth/register/', {
    email,
    password,
    first_name: firstName,
    last_name: lastName,
    phone,
  })
  return data
}

export async function fetchCurrentUser() {
  const { data } = await client.get('/auth/me/')
  return data
}

export async function googleLoginRequest(credential) {
  const { data } = await client.post('/auth/google/', { credential })
  return data
}