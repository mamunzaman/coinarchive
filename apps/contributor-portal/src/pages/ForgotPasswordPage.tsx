import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { TextField } from '../components/ui/TextField'
import { forgotAuthPassword, toAuthErrorResponse } from '../services/authApi'
import { AUTH_ERROR_CODES, isAuthErrorResponse } from '../types/auth'

const FORGOT_PASSWORD_API_ERROR_ID = 'forgot-password-api-error'

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [apiError, setApiError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const formDescribedBy = apiError || successMessage ? FORGOT_PASSWORD_API_ERROR_ID : undefined

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setFieldError(t('auth.errors.emailRequired'))
      setApiError(null)
      setSuccessMessage(null)
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFieldError(t('auth.errors.emailInvalid'))
      setApiError(null)
      setSuccessMessage(null)
      return
    }

    setFieldError(undefined)
    setApiError(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      await forgotAuthPassword({ email: trimmedEmail })
      setSuccessMessage(t('auth.forgotSuccessMessage'))
    } catch (error) {
      const result = toAuthErrorResponse(error)
      if (isAuthErrorResponse(result) && result.code === AUTH_ERROR_CODES.RATE_LIMITED) {
        setApiError(t('auth.errors.rateLimited'))
      } else {
        setSuccessMessage(t('auth.forgotSuccessMessage'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (successMessage) {
    return (
      <div className="w-full">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-2xl font-semibold text-navy sm:text-3xl">
            {t('auth.forgotSuccessTitle')}
          </h1>
        </div>

        <Card>
          <div className="flex flex-col gap-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <span className="text-xl text-primary" aria-hidden="true">
                ✓
              </span>
            </div>
            <p
              id={FORGOT_PASSWORD_API_ERROR_ID}
              className="text-sm leading-relaxed text-navy-muted"
              role="status"
              aria-live="polite"
            >
              {successMessage}
            </p>
            <Link
              to="/login"
              className="mt-2 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              {t('auth.backToSignIn')}
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h1 className="font-serif text-2xl font-semibold text-navy sm:text-3xl">
          {t('auth.forgotTitle')}
        </h1>
        <p className="mt-2 text-sm text-navy-muted">
          {t('auth.forgotSubtitle')}
        </p>
      </div>

      <Card>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          {apiError ? (
            <div
              id={FORGOT_PASSWORD_API_ERROR_ID}
              role="alert"
              aria-live="polite"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {apiError}
            </div>
          ) : null}

          <TextField
            label={t('auth.forgotEmailLabel')}
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setFieldError(undefined)
              setApiError(null)
            }}
            error={fieldError}
            disabled={isSubmitting}
            aria-describedby={formDescribedBy}
            required
          />

          <Button type="submit" fullWidth disabled={isSubmitting}>
            {isSubmitting ? t('auth.sending') : t('auth.forgotSendLink')}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-sm text-navy-muted">
        {t('auth.forgotRemember')}{' '}
        <Link to="/login" className="font-semibold text-primary hover:text-primary-hover">
          {t('auth.signIn')}
        </Link>
      </p>
    </div>
  )
}
