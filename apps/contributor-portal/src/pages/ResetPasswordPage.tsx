import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PasswordField } from '../components/ui/PasswordField'
import { PasswordStrengthMeter } from '../components/ui/PasswordStrengthMeter'
import { resetAuthPassword, toAuthErrorResponse } from '../services/authApi'
import { AUTH_ERROR_CODES, isAuthErrorResponse } from '../types/auth'

const RESET_PASSWORD_API_ERROR_ID = 'reset-password-api-error'

type ResetPasswordFieldErrors = {
  password?: string
  confirmPassword?: string
}

function validateResetPasswordForm(
  password: string,
  confirmPassword: string,
  t: (key: string) => string,
): ResetPasswordFieldErrors {
  const errors: ResetPasswordFieldErrors = {}

  if (!password) {
    errors.password = t('auth.errors.passwordRequired')
  } else if (password.length < 8) {
    errors.password = t('auth.errors.passwordMin')
  }

  if (!confirmPassword) {
    errors.confirmPassword = t('auth.errors.confirmPasswordRequired')
  } else if (password !== confirmPassword) {
    errors.confirmPassword = t('auth.errors.passwordsDoNotMatch')
  }

  return errors
}

function ResetPasswordStatusCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h1 className="font-serif text-2xl font-semibold text-navy sm:text-3xl">{title}</h1>
      </div>
      <Card>
        <div className="flex flex-col gap-4 text-center">{children}</div>
      </Card>
    </div>
  )
}

export function ResetPasswordPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email')?.trim() ?? ''
  const token = searchParams.get('token')?.trim() ?? ''
  const hasValidLink = Boolean(email && token)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<ResetPasswordFieldErrors>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const formDescribedBy = apiError ? RESET_PASSWORD_API_ERROR_ID : undefined

  if (!hasValidLink) {
    return (
      <ResetPasswordStatusCard title={t('auth.resetInvalidTitle')}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700">
          <span className="text-xl" aria-hidden="true">
            ×
          </span>
        </div>
        <p className="text-sm leading-relaxed text-navy-muted" role="alert">
          {t('auth.resetInvalidMessage')}
        </p>
        <Link
          to="/forgot-password"
          className="mt-2 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          {t('auth.resetRequestLink')}
        </Link>
      </ResetPasswordStatusCard>
    )
  }

  if (isSuccess) {
    return (
      <ResetPasswordStatusCard title={t('auth.resetSuccessTitle')}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <span className="text-xl text-primary" aria-hidden="true">
            ✓
          </span>
        </div>
        <p className="text-sm leading-relaxed text-navy-muted" role="status" aria-live="polite">
          {t('auth.resetSuccessMessage')}
        </p>
        <Link
          to="/login"
          className="mt-2 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          {t('auth.goToLogin')}
        </Link>
      </ResetPasswordStatusCard>
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors = validateResetPasswordForm(password, confirmPassword, t)
    setFieldErrors(errors)
    setApiError(null)

    if (Object.keys(errors).length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      await resetAuthPassword({ email, token, password })
      setIsSuccess(true)
    } catch (error) {
      const result = toAuthErrorResponse(error)
      if (isAuthErrorResponse(result) && result.code === AUTH_ERROR_CODES.TOKEN_EXPIRED) {
        setApiError(t('auth.errors.resetExpired'))
      } else if (isAuthErrorResponse(result) && result.code === AUTH_ERROR_CODES.TOKEN_INVALID) {
        setApiError(t('auth.errors.resetInvalid'))
      } else {
        setApiError(result.message || t('auth.errors.resetFailed'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h1 className="font-serif text-2xl font-semibold text-navy sm:text-3xl">
          {t('auth.resetTitle')}
        </h1>
        <p className="mt-2 text-sm text-navy-muted">{t('auth.resetSubtitle')}</p>
      </div>

      <Card>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          {apiError ? (
            <div
              id={RESET_PASSWORD_API_ERROR_ID}
              role="alert"
              aria-live="polite"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {apiError}
            </div>
          ) : null}

          <div className="flex flex-col gap-3">
            <PasswordField
              label={t('auth.newPassword')}
              name="password"
              autoComplete="new-password"
              placeholder={t('auth.passwordPlaceholderNew')}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setFieldErrors((current) => ({ ...current, password: undefined }))
                setApiError(null)
              }}
              error={fieldErrors.password}
              disabled={isSubmitting}
              aria-describedby={formDescribedBy}
              required
            />
            <PasswordStrengthMeter password={password} />
          </div>
          <PasswordField
            label={t('auth.confirmPassword')}
            name="confirm_password"
            autoComplete="new-password"
            placeholder={t('auth.confirmPasswordPlaceholder')}
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value)
              setFieldErrors((current) => ({ ...current, confirmPassword: undefined }))
              setApiError(null)
            }}
            error={fieldErrors.confirmPassword}
            disabled={isSubmitting}
            aria-describedby={formDescribedBy}
            required
          />

          <Button type="submit" fullWidth disabled={isSubmitting}>
            {isSubmitting ? t('auth.updating') : t('auth.updatePassword')}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-sm text-navy-muted">
        <Link to="/login" className="font-semibold text-primary hover:text-primary-hover">
          {t('auth.backToSignIn')}
        </Link>
      </p>
    </div>
  )
}
