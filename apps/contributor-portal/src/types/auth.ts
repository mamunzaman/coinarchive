export const AUTH_TOKEN_STORAGE_KEY = 'caes_auth_token'
export const AUTH_EXPIRES_STORAGE_KEY = 'caes_auth_expires_at'

export const AUTH_ERROR_CODES = {
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  ACCOUNT_REJECTED: 'ACCOUNT_REJECTED',
  RATE_LIMITED: 'RATE_LIMITED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
} as const

export type KnownAuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES]

export type AuthErrorCode = KnownAuthErrorCode | (string & {})

export type AuthErrorResponse = {
  success: false
  code: AuthErrorCode
  message: string
  status: number
  email?: string
  canResendVerification?: boolean
}

export type AuthContributorRole = 'admin' | 'contributor'

export type AuthContributor = {
  id: number
  email: string
  display_name: string
  status: string
  role?: AuthContributorRole
  email_verified?: boolean
}

export type AuthRegisterPayload = {
  email: string
  password: string
  display_name: string
}

export type AuthLoginPayload = {
  email: string
  password: string
}

export type AuthVerifyEmailPayload = {
  email: string
  token: string
}

export type AuthResendVerificationPayload = {
  email: string
}

export type AuthForgotPasswordPayload = {
  email: string
}

export type AuthResetPasswordPayload = {
  email: string
  token: string
  password: string
}

export type AuthRegisterSuccess = {
  success: true
  message?: string
  dev_verification_token?: string
  email?: string
  canResendVerification?: boolean
}

export type AuthLoginSuccess = {
  success: true
  token: string
  expires_at?: string
  contributor: AuthContributor
}

export type AuthMeSuccess = {
  success: true
  contributor: AuthContributor
}

/** Raw plugin payload may nest contributor under `data`. */
export type AuthMeApiResponse = {
  success: true
  contributor?: AuthContributor
  data?: {
    contributor?: AuthContributor
  }
}

export type AuthMessageSuccess = {
  success: true
  message?: string
}

export type AuthRegisterResult = AuthRegisterSuccess | AuthErrorResponse
export type AuthLoginResult = AuthLoginSuccess | AuthErrorResponse
export type AuthMeResult = AuthMeSuccess | AuthErrorResponse
export type AuthMessageResult = AuthMessageSuccess | AuthErrorResponse

export function isAuthErrorResponse(value: unknown): value is AuthErrorResponse {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  return record.success === false && typeof record.message === 'string'
}

export function isKnownAuthErrorCode(code: string): code is KnownAuthErrorCode {
  return Object.values(AUTH_ERROR_CODES).includes(code as KnownAuthErrorCode)
}
