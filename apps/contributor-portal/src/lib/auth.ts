import type { Contributor, ContributorRole } from './api'

const TOKEN_KEY = 'coinarchive_auth_token'
const CONTRIBUTOR_KEY = 'coinarchive_auth_contributor'

export function saveAuthSession(token: string, contributor: Contributor): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(CONTRIBUTOR_KEY, JSON.stringify(contributor))
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getAuthContributor(): Contributor | null {
  const raw = localStorage.getItem(CONTRIBUTOR_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as Contributor
  } catch {
    return null
  }
}

export function clearAuthSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(CONTRIBUTOR_KEY)
}

export function isApprovedSession(): boolean {
  const token = getAuthToken()
  const contributor = getAuthContributor()
  return Boolean(token && contributor?.status === 'approved')
}

export function getContributorRole(): ContributorRole {
  const contributor = getAuthContributor()
  return contributor?.role === 'admin' ? 'admin' : 'contributor'
}

export function isAdminSession(): boolean {
  return isApprovedSession() && getContributorRole() === 'admin'
}

export function getDefaultAppPath(): string {
  return isAdminSession() ? '/admin' : '/dashboard'
}

export function clearStaleAuthSession(): void {
  const token = getAuthToken()
  const contributor = getAuthContributor()

  if (!token && !contributor) {
    return
  }

  if (!isApprovedSession()) {
    clearAuthSession()
  }
}
