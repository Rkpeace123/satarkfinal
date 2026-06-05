export interface AuthUser {
  id: string
  name: string
  role: 'admin' | 'enumerator' | 'supervisor' | 'policy'
  username: string
}

export const TOKEN_KEY = 'satark_token'
export const USER_KEY = 'satark_user'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser(): AuthUser | null {
  const s = localStorage.getItem(USER_KEY)
  try { return s ? JSON.parse(s) : null } catch { return null }
}

export function setAuth(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  if (!res.ok) throw new Error('Invalid credentials')
  const data = await res.json()
  const user: AuthUser = { id: data.id, name: data.name, role: data.role, username }
  setAuth(data.token, user)
  return user
}
