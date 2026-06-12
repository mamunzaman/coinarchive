import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PasswordField } from '../components/ui/PasswordField'
import { TextField } from '../components/ui/TextField'
import { useAuth } from '../hooks/useAuth'
import { isApprovedContributorStatus } from '../lib/contributorAuthStatus'
import { resendAuthVerification, toAuthErrorResponse } from '../services/authApi'
import {
  AUTH_ERROR_CODES,
  isAuthErrorResponse,
  type AuthErrorCode,
  type AuthErrorResponse,
} from '../types/auth'
import {
  validateLoginForm,
  type LoginFieldErrors,
  type LoginFormValues,
} from '../lib/validation'

const initialValues: LoginFormValues = {
  email: '',
  password: '',
}

const LOGIN_API_ERROR_ID = 'login-api-error'

type LoginLocationState = {
  from?: string
  authMessage?: string
  authCode?: AuthErrorCode
}

type VerificationHint = {
  email?: string
  canResendVerification?: boolean
}

function resolveLoginDestination(role?: string, status?: string): string {
  return role === 'admin' && status === 'approved' ? '/admin' : '/dashboard'
}

function resolvePostLoginPath(
  from: unknown,
  role?: string,
  status?: string,
): string {
  if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) {
    return from
  }

  return resolveLoginDestination(role, status)
}

function isRejectedLoginError(result: AuthErrorResponse): boolean {
  return (
    result.code === AUTH_ERROR_CODES.ACCOUNT_REJECTED ||
    result.code === 'rest_contributor_rejected' ||
    result.code === 'CONTRIBUTOR_REJECTED'
  )
}

function resolveLoginErrorMessage(result: AuthErrorResponse): string {
  switch (result.code) {
    case AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED:
      return i18n.t('auth.errors.verifyEmail')
    case AUTH_ERROR_CODES.PENDING_APPROVAL:
      return i18n.t('auth.errors.pendingApproval')
    case AUTH_ERROR_CODES.ACCOUNT_REJECTED:
      return i18n.t('auth.errors.rejected')
    case AUTH_ERROR_CODES.RATE_LIMITED:
      return i18n.t('auth.errors.rateLimited')
    default:
      break
  }

  if (isRejectedLoginError(result)) {
    return i18n.t('auth.errors.rejected')
  }

  if (
    result.status === 401 ||
    result.code === 'rest_invalid_credentials' ||
    result.code === 'INVALID_CREDENTIALS'
  ) {
    return i18n.t('auth.errors.invalidCredentials')
  }

  return result.message || i18n.t('auth.errors.signInFailed')
}

function isWarningLoginError(code: AuthErrorCode): boolean {
  return code === AUTH_ERROR_CODES.PENDING_APPROVAL
}

function canShowResendVerification(
  errorCode: AuthErrorCode | null,
  hint: VerificationHint | null,
): boolean {
  if (errorCode !== AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED || !hint?.email?.trim()) {
    return false
  }

  return hint.canResendVerification !== false
}

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const savedFromRef = useRef<string | undefined>(undefined)
  const { loginWithCredentials, isAuthenticated, isBootstrapping, user } = useAuth()
  const [values, setValues] = useState<LoginFormValues>(initialValues)
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [apiErrorCode, setApiErrorCode] = useState<AuthErrorCode | null>(null)
  const [verificationHint, setVerificationHint] = useState<VerificationHint | null>(null)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const state = (location.state as LoginLocationState | null) ?? null

    if (
      typeof state?.from === 'string' &&
      state.from.startsWith('/') &&
      !state.from.startsWith('//')
    ) {
      savedFromRef.current = state.from
    }

    if (!state?.authMessage) {
      return
    }

    setApiError(state.authMessage)
    setApiErrorCode(state.authCode ?? null)
    navigate(location.pathname, {
      replace: true,
      state: savedFromRef.current ? { from: savedFromRef.current } : null,
    })
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    if (isBootstrapping || !isAuthenticated || !user || !isApprovedContributorStatus(user.status)) {
      return
    }

    navigate(resolvePostLoginPath(savedFromRef.current, user.role, user.status), { replace: true })
  }, [isAuthenticated, isBootstrapping, navigate, user])

  function updateField(field: keyof LoginFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setApiError(null)
    setApiErrorCode(null)
    setVerificationHint(null)
    setResendMessage(null)
  }

  async function handleResendVerification() {
    const email = verificationHint?.email?.trim()
    if (!email || !canShowResendVerification(apiErrorCode, verificationHint)) {
      return
    }

    setIsResending(true)
    setResendMessage(null)

    try {
      await resendAuthVerification({ email })
      setResendMessage(i18n.t('auth.verificationSent'))
    } catch (error) {
      const result = toAuthErrorResponse(error)
      if (isAuthErrorResponse(result) && result.code === AUTH_ERROR_CODES.RATE_LIMITED) {
        setResendMessage(i18n.t('auth.errors.resendRateLimited'))
      } else {
        setResendMessage(i18n.t('auth.errors.resendFailed'))
      }
    } finally {
      setIsResending(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors = validateLoginForm(values)
    setFieldErrors(errors)
    setApiError(null)
    setApiErrorCode(null)
    setVerificationHint(null)
    setResendMessage(null)

    if (Object.keys(errors).length > 0) {
      return
    }

    setIsSubmitting(true)

    const result = await loginWithCredentials(values.email.trim(), values.password)

    if (!isAuthErrorResponse(result)) {
      navigate(
        resolvePostLoginPath(savedFromRef.current, result.contributor.role, result.contributor.status),
        { replace: true },
      )
      setIsSubmitting(false)
      return
    }

    setApiError(resolveLoginErrorMessage(result))
    setApiErrorCode(result.code)

    if (result.code === AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED) {
      setVerificationHint({
        email: result.email ?? values.email.trim(),
        canResendVerification: result.canResendVerification,
      })
    }

    setIsSubmitting(false)
  }

  const showWarningAlert = apiErrorCode ? isWarningLoginError(apiErrorCode) : false
  const showResendVerification = canShowResendVerification(apiErrorCode, verificationHint)
  const formErrorDescribedBy = apiError ? LOGIN_API_ERROR_ID : undefined

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h1 className="font-serif text-2xl font-semibold text-navy sm:text-3xl">
          {t('auth.signInTitle')}
        </h1>
        <p className="mt-2 text-sm text-navy-muted">{t('auth.signInSubtitle')}</p>
      </div>

      <Card>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          {apiError ? (
            <div
              id={LOGIN_API_ERROR_ID}
              role="alert"
              aria-live="polite"
              className={[
                'rounded-xl px-4 py-3 text-sm',
                showWarningAlert
                  ? 'border border-amber-200 bg-amber-50 text-amber-900'
                  : 'border border-red-200 bg-red-50 text-red-700',
              ].join(' ')}
            >
              <p>{apiError}</p>
              {showResendVerification ? (
                <div className="mt-3 flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full !min-h-10"
                    disabled={isResending || isSubmitting || isBootstrapping}
                    onClick={() => void handleResendVerification()}
                  >
                    {isResending ? t('auth.sending') : t('auth.resendVerification')}
                  </Button>
                  {resendMessage ? (
                    <p
                      role="status"
                      aria-live="polite"
                      className={[
                        'text-xs leading-relaxed',
                        resendMessage === t('auth.verificationSent')
                          ? 'text-emerald-800'
                          : 'text-red-700',
                      ].join(' ')}
                    >
                      {resendMessage}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {apiErrorCode === AUTH_ERROR_CODES.PENDING_APPROVAL && import.meta.env.DEV ? (
                <Link
                  to="/admin/approve"
                  className="mt-2 inline-block text-sm font-semibold text-primary hover:text-primary-hover"
                >
                  {t('auth.localAdminApproval')}
                </Link>
              ) : null}
            </div>
          ) : null}

          <TextField
            label={t('auth.email')}
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t('auth.emailPlaceholder')}
            value={values.email}
            onChange={(event) => updateField('email', event.target.value)}
            error={fieldErrors.email}
            disabled={isSubmitting || isBootstrapping}
            aria-describedby={formErrorDescribedBy}
            required
          />
          <PasswordField
            label={t('auth.password')}
            name="password"
            autoComplete="current-password"
            placeholder={t('auth.passwordPlaceholder')}
            value={values.password}
            onChange={(event) => updateField('password', event.target.value)}
            error={fieldErrors.password}
            disabled={isSubmitting || isBootstrapping}
            aria-describedby={formErrorDescribedBy}
            required
          />

          <div className="flex items-center justify-end">
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-primary hover:text-primary-hover"
            >
              {t('auth.forgotPassword')}
            </Link>
          </div>

          <Button type="submit" fullWidth disabled={isSubmitting || isBootstrapping}>
            {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-sm text-navy-muted">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="font-semibold text-primary hover:text-primary-hover">
          {t('auth.createAccount')}
        </Link>
      </p>
    </div>
  )
}
