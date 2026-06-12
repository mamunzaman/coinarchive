export function buildVerifyEmailAppUrl(email: string, token: string): string {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
  const params = new URLSearchParams({ email, token })

  if (typeof window !== 'undefined' && window.location.origin) {
    return `${window.location.origin}${basePath}/verify-email?${params.toString()}`
  }

  return `${basePath}/verify-email?${params.toString()}`
}
