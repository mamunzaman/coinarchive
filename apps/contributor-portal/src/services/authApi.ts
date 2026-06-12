import {
  AUTH_ERROR_CODES,
  type AuthContributor,
  type AuthErrorCode,
  type AuthErrorResponse,
  type AuthForgotPasswordPayload,
  type AuthLoginPayload,
  type AuthLoginSuccess,
  type AuthMeSuccess,
  type AuthMessageSuccess,
  type AuthRegisterPayload,
  type AuthRegisterSuccess,
  type AuthResendVerificationPayload,
  type AuthResetPasswordPayload,
  type AuthVerifyEmailPayload,
  isAuthErrorResponse,
} from '../types/auth'
import { getCoinArchiveApiBaseUrl } from '../lib/apiBaseUrl'

const AUTH_PATHS = {
  register: '/auth/register',
  login: '/auth/login',
  me: '/auth/me',
  logout: '/auth/logout',
  verifyEmail: '/auth/verify-email',
  resendVerification: '/auth/resend-verification',
  forgotPassword: '/auth/forgot-password',
  resetPassword: '/auth/reset-password',
} as const

const LEGACY_ERROR_CODE_MAP: Record<string, AuthErrorCode> = {
  rest_email_not_verified: AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED,
  EMAIL_NOT_VERIFIED: AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED,
  rest_contributor_not_approved: AUTH_ERROR_CODES.PENDING_APPROVAL,
  PENDING_APPROVAL: AUTH_ERROR_CODES.PENDING_APPROVAL,
  rest_contributor_rejected: AUTH_ERROR_CODES.ACCOUNT_REJECTED,
  ACCOUNT_REJECTED: AUTH_ERROR_CODES.ACCOUNT_REJECTED,
  CONTRIBUTOR_REJECTED: AUTH_ERROR_CODES.ACCOUNT_REJECTED,
  rest_rate_limited: AUTH_ERROR_CODES.RATE_LIMITED,
  RATE_LIMITED: AUTH_ERROR_CODES.RATE_LIMITED,
  rest_token_invalid: AUTH_ERROR_CODES.TOKEN_INVALID,
  TOKEN_INVALID: AUTH_ERROR_CODES.TOKEN_INVALID,
  rest_token_expired: AUTH_ERROR_CODES.TOKEN_EXPIRED,
  TOKEN_EXPIRED: AUTH_ERROR_CODES.TOKEN_EXPIRED,
}

const AUTH_ERROR_MESSAGES: Record<KnownAuthErrorCodeKey, string> = {
  [AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED]:
    'Email address is not verified. Please check your inbox or request a new verification link.',
  [AUTH_ERROR_CODES.PENDING_APPROVAL]:
    'Your account is not approved yet. Please wait for admin approval.',
  [AUTH_ERROR_CODES.ACCOUNT_REJECTED]:
    'Your contributor account has been rejected. Contact an administrator if you believe this is a mistake.',
  [AUTH_ERROR_CODES.RATE_LIMITED]: 'Too many attempts. Please wait a moment and try again.',
  [AUTH_ERROR_CODES.TOKEN_INVALID]: 'This link or token is invalid. Please request a new one.',
  [AUTH_ERROR_CODES.TOKEN_EXPIRED]: 'This link or token has expired. Please request a new one.',
}

type KnownAuthErrorCodeKey = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES]

export class AuthApiError extends Error implements AuthErrorResponse {
  readonly success = false as const
  readonly code: AuthErrorCode
  readonly status: number

  constructor(message: string, status: number, code: AuthErrorCode = 'UNKNOWN_ERROR') {
    super(message)
    this.name = 'AuthApiError'
    this.status = status
    this.code = code
  }

  toJSON(): AuthErrorResponse {
    return {
      success: false,
      code: this.code,
      message: this.message,
      status: this.status,
    }
  }
}

function getAuthApiBaseUrl(): string {
  const baseUrl = getCoinArchiveApiBaseUrl()
  if (!baseUrl) {
    throw new AuthApiError('Auth API base URL is not configured.', 0, 'CONFIG_MISSING')
  }

  return baseUrl
}

function normalizeAuthErrorCode(code: string | undefined, status: number): AuthErrorCode {
  if (code && LEGACY_ERROR_CODE_MAP[code]) {
    return LEGACY_ERROR_CODE_MAP[code]
  }

  if (status === 429) {
    return AUTH_ERROR_CODES.RATE_LIMITED
  }

  if (code?.trim()) {
    return code
  }

  return 'UNKNOWN_ERROR'
}

function readErrorMessage(data: unknown, fallback: string): string {
  if (typeof data !== 'object' || data === null) {
    return fallback
  }

  const record = data as Record<string, unknown>

  if (typeof record.message === 'string' && record.message.trim()) {
    return record.message.replace(/<[^>]*>/g, '').trim()
  }

  if (typeof record.error === 'string' && record.error.trim()) {
    return record.error.trim()
  }

  return fallback
}

function resolveAuthErrorMessage(code: AuthErrorCode, fallback: string): string {
  if (code in AUTH_ERROR_MESSAGES) {
    return AUTH_ERROR_MESSAGES[code as KnownAuthErrorCodeKey]
  }

  return fallback
}

function readAuthErrorMeta(data: unknown): Pick<AuthErrorResponse, 'email' | 'canResendVerification'> {
  if (typeof data !== 'object' || data === null) {
    return {}
  }

  const record = data as Record<string, unknown>
  const email = typeof record.email === 'string' ? record.email : undefined
  const canResendVerification =
    typeof record.canResendVerification === 'boolean'
      ? record.canResendVerification
      : typeof record.can_resend_verification === 'boolean'
        ? record.can_resend_verification
        : undefined

  return { email, canResendVerification }
}

export function normalizeAuthError(
  status: number,
  data: unknown,
  fallbackMessage: string,
): AuthErrorResponse {
  const meta = readAuthErrorMeta(data)

  if (isAuthErrorResponse(data)) {
    const code = normalizeAuthErrorCode(data.code, status)
    return {
      success: false,
      code,
      status: typeof data.status === 'number' ? data.status : status,
      message: resolveAuthErrorMessage(code, data.message),
      email: data.email ?? meta.email,
      canResendVerification: data.canResendVerification ?? meta.canResendVerification,
    }
  }

  const rawCode =
    typeof data === 'object' && data !== null && typeof (data as Record<string, unknown>).code === 'string'
      ? ((data as Record<string, unknown>).code as string)
      : undefined

  const code = normalizeAuthErrorCode(rawCode, status)
  const message = resolveAuthErrorMessage(code, readErrorMessage(data, fallbackMessage))

  return {
    success: false,
    code,
    message,
    status,
    ...meta,
  }
}

export function toAuthErrorResponse(error: unknown): AuthErrorResponse {
  if (error instanceof AuthApiError) {
    return error.toJSON()
  }

  if (isAuthErrorResponse(error)) {
    return normalizeAuthError(error.status, error, error.message)
  }

  return {
    success: false,
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred. Please try again.',
    status: 0,
  }
}

function bearerHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  }
}

function jsonHeaders(token?: string): HeadersInit {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? bearerHeaders(token) : {}),
  }
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function authRequest<T extends { success: true }>(
  path: string,
  init: RequestInit,
  fallbackMessage: string,
): Promise<T> {
  const response = await fetch(`${getAuthApiBaseUrl()}${path}`, init)
  const data = await parseJsonResponse(response)

  if (!response.ok) {
    const normalized = normalizeAuthError(response.status, data, fallbackMessage)
    throw new AuthApiError(normalized.message, normalized.status, normalized.code)
  }

  if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>
    if (record.success === false) {
      const normalized = normalizeAuthError(response.status, data, fallbackMessage)
      throw new AuthApiError(normalized.message, normalized.status, normalized.code)
    }
  }

  return {
    success: true,
    ...(typeof data === 'object' && data !== null ? data : {}),
  } as T
}

export async function registerAuthUser(payload: AuthRegisterPayload): Promise<AuthRegisterSuccess> {
  return authRequest<AuthRegisterSuccess>(AUTH_PATHS.register, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  }, 'Registration failed. Please try again.')
}

export async function loginAuthUser(payload: AuthLoginPayload): Promise<AuthLoginSuccess> {
  return authRequest<AuthLoginSuccess>(AUTH_PATHS.login, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  }, 'Login failed. Please try again.')
}

function isAuthContributor(value: unknown): value is AuthContributor {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>

  return (
    typeof record.id === 'number' &&
    typeof record.email === 'string' &&
    typeof record.status === 'string'
  )
}

function readContributorFromAuthMePayload(data: unknown): AuthContributor | null {
  if (typeof data !== 'object' || data === null) {
    return null
  }

  const record = data as Record<string, unknown>

  if (isAuthContributor(record.contributor)) {
    return record.contributor
  }

  if (typeof record.data === 'object' && record.data !== null) {
    const nested = record.data as Record<string, unknown>

    if (isAuthContributor(nested.contributor)) {
      return nested.contributor
    }
  }

  return null
}

export async function getAuthMe(token: string): Promise<AuthMeSuccess> {
  const fallbackMessage = 'Unable to load your account. Please log in again.'
  const response = await fetch(`${getAuthApiBaseUrl()}${AUTH_PATHS.me}`, {
    method: 'GET',
    headers: bearerHeaders(token),
  })
  const data = await parseJsonResponse(response)

  if (!response.ok) {
    const normalized = normalizeAuthError(response.status, data, fallbackMessage)
    throw new AuthApiError(normalized.message, normalized.status, normalized.code)
  }

  if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>
    if (record.success === false) {
      const normalized = normalizeAuthError(response.status, data, fallbackMessage)
      throw new AuthApiError(normalized.message, normalized.status, normalized.code)
    }
  }

  const contributor = readContributorFromAuthMePayload(data)

  if (!contributor) {
    throw new AuthApiError(
      fallbackMessage,
      response.status,
      AUTH_ERROR_CODES.TOKEN_INVALID,
    )
  }

  return {
    success: true,
    contributor,
  }
}

export async function logoutAuthUser(token?: string): Promise<AuthMessageSuccess> {
  return authRequest<AuthMessageSuccess>(AUTH_PATHS.logout, {
    method: 'POST',
    headers: token ? jsonHeaders(token) : jsonHeaders(),
  }, 'Logout failed. Please try again.')
}

export async function verifyAuthEmail(payload: AuthVerifyEmailPayload): Promise<AuthMessageSuccess> {
  return authRequest<AuthMessageSuccess>(AUTH_PATHS.verifyEmail, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  }, 'Email verification failed. Please try again.')
}

export async function resendAuthVerification(
  payload: AuthResendVerificationPayload,
): Promise<AuthMessageSuccess> {
  return authRequest<AuthMessageSuccess>(AUTH_PATHS.resendVerification, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  }, 'Unable to resend verification email. Please try again.')
}

export async function forgotAuthPassword(
  payload: AuthForgotPasswordPayload,
): Promise<AuthMessageSuccess> {
  return authRequest<AuthMessageSuccess>(AUTH_PATHS.forgotPassword, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  }, 'Unable to send password reset email. Please try again.')
}

export async function resetAuthPassword(payload: AuthResetPasswordPayload): Promise<AuthMessageSuccess> {
  return authRequest<AuthMessageSuccess>(AUTH_PATHS.resetPassword, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  }, 'Password reset failed. Please try again.')
}
