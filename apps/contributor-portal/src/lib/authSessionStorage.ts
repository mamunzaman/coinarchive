import {
  AUTH_EXPIRES_STORAGE_KEY,
  AUTH_TOKEN_STORAGE_KEY,
} from '../types/auth'

export { AUTH_EXPIRES_STORAGE_KEY, AUTH_TOKEN_STORAGE_KEY }

export function readStoredAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
}

export function readStoredAuthExpiresAt(): string | null {
  return localStorage.getItem(AUTH_EXPIRES_STORAGE_KEY)
}

export function writeAuthSession(token: string, expiresAt?: string | null): void {
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)

  if (expiresAt) {
    localStorage.setItem(AUTH_EXPIRES_STORAGE_KEY, expiresAt)
  } else {
    localStorage.removeItem(AUTH_EXPIRES_STORAGE_KEY)
  }
}

export function clearAuthSessionStorage(): void {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
  localStorage.removeItem(AUTH_EXPIRES_STORAGE_KEY)
}
