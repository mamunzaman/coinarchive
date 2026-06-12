import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import i18n from '../i18n'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PasswordField } from '../components/ui/PasswordField'
import { PasswordStrengthMeter } from '../components/ui/PasswordStrengthMeter'
import { TextField } from '../components/ui/TextField'
import { buildVerifyEmailAppUrl } from '../lib/appUrls'
import { clearAuthSession } from '../lib/auth'
import { clearAuthSessionStorage } from '../lib/authSessionStorage'
import { registerAuthUser, toAuthErrorResponse } from '../services/authApi'
import {
  AUTH_ERROR_CODES,
  isAuthErrorResponse,
  type AuthErrorResponse,
} from '../types/auth'
import {
  validateRegisterForm,
  type RegisterFieldErrors,
  type RegisterFormValues,
} from '../lib/validation'

const initialValues: RegisterFormValues = {
  display_name: '',
  email: '',
  password: '',
}

const REGISTER_API_ERROR_ID = 'register-api-error'

type RegisterVerificationHint = {
  email: string
  canResendVerification?: boolean
}

function resolveRegisterErrorMessage(result: AuthErrorResponse): string {
  if (result.code === AUTH_ERROR_CODES.RATE_LIMITED) {
    return i18n.t('auth.errors.registerRateLimited')
  }

  if (
    result.status === 409 ||
    result.code === 'EMAIL_EXISTS' ||
    result.code === 'EMAIL_ALREADY_REGISTERED' ||
    result.code === 'rest_email_exists' ||
    result.code === 'DUPLICATE_EMAIL'
  ) {
    return i18n.t('auth.errors.emailExists')
  }

  return result.message || i18n.t('auth.errors.registerFailed')
}

export function RegisterPage() {
  const { t } = useTranslation()
  const [values, setValues] = useState<RegisterFormValues>(initialValues)
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [devVerificationToken, setDevVerificationToken] = useState<string | null>(null)
  const [verificationHint, setVerificationHint] = useState<RegisterVerificationHint | null>(null)

  const verificationUrl =
    import.meta.env.DEV && devVerificationToken && verificationHint?.email
      ? buildVerifyEmailAppUrl(verificationHint.email, devVerificationToken)
      : null

  function updateField(field: keyof RegisterFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setApiError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors = validateRegisterForm(values)
    setFieldErrors(errors)
    setApiError(null)

    if (Object.keys(errors).length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await registerAuthUser({
        display_name: values.display_name.trim(),
        email: values.email.trim(),
        password: values.password,
      })

      setValues({ ...initialValues, password: '' })
      clearAuthSession()
      clearAuthSessionStorage()
      setVerificationHint({
        email: response.email ?? values.email.trim(),
        canResendVerification: response.canResendVerification,
      })
      setDevVerificationToken(response.dev_verification_token ?? null)
      setIsSuccess(true)
    } catch (error) {
      const result = toAuthErrorResponse(error)
      if (isAuthErrorResponse(result)) {
        setApiError(resolveRegisterErrorMessage(result))
      } else {
        setApiError(i18n.t('auth.serverUnreachable'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const formErrorDescribedBy = apiError ? REGISTER_API_ERROR_ID : undefined

  if (isSuccess) {
    return (
      <div className="w-full">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-2xl font-semibold text-navy sm:text-3xl">
            {t('auth.registerSuccessTitle')}
          </h1>
        </div>

        <Card>
          <div className="flex flex-col gap-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <span className="text-xl text-primary" aria-hidden="true">
                ✓
              </span>
            </div>
            <p className="text-sm leading-relaxed text-navy-muted" role="status">
              {t('auth.registerSuccessMessage')}
            </p>
            {verificationHint?.email ? (
              <p className="text-sm leading-relaxed text-navy-muted">
                <Trans
                  i18nKey="auth.registerVerificationSent"
                  values={{ email: verificationHint.email }}
                  components={{ strong: <strong className="font-medium text-navy" /> }}
                />
              </p>
            ) : null}
            <p className="text-sm leading-relaxed text-navy-muted">
              {t('auth.registerPendingApproval')}
            </p>

            {import.meta.env.DEV && devVerificationToken ? (
              <div className="rounded-xl border border-dashed border-navy/15 bg-muted px-4 py-3 text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-muted">
                  {t('auth.registerDevOnly')}
                </p>
                <p className="mt-2 break-all font-mono text-xs text-navy">
                  {devVerificationToken}
                </p>
                {verificationUrl ? (
                  <a
                    href={verificationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-xs font-semibold text-primary hover:text-primary-hover"
                  >
                    {t('auth.registerOpenVerification')}
                  </a>
                ) : null}
              </div>
            ) : null}

            <ol className="space-y-2 text-left text-sm text-navy-muted">
              <li>
                <span className="font-medium text-navy">{t('auth.registerStepLabel', { number: 1 })}</span> {t('auth.registerStep1')}
              </li>
              <li>
                <span className="font-medium text-navy">{t('auth.registerStepLabel', { number: 2 })}</span> {t('auth.registerStep2')}
              </li>
              <li>
                <span className="font-medium text-navy">{t('auth.registerStepLabel', { number: 3 })}</span> {t('auth.registerStep3')}
              </li>
            </ol>

            <Link
              to="/login"
              className="mt-2 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              {t('auth.registerContinueSignIn')}
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
          {t('auth.registerTitle')}
        </h1>
        <p className="mt-2 text-sm text-navy-muted">{t('auth.registerSubtitle')}</p>
      </div>

      <Card>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          {apiError ? (
            <div
              id={REGISTER_API_ERROR_ID}
              role="alert"
              aria-live="polite"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {apiError}
            </div>
          ) : null}

          <TextField
            label={t('auth.displayName')}
            name="display_name"
            autoComplete="name"
            placeholder={t('auth.displayNamePlaceholder')}
            value={values.display_name}
            onChange={(event) => updateField('display_name', event.target.value)}
            error={fieldErrors.display_name}
            disabled={isSubmitting}
            aria-describedby={formErrorDescribedBy}
            required
          />
          <TextField
            label={t('auth.email')}
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t('auth.emailPlaceholder')}
            value={values.email}
            onChange={(event) => updateField('email', event.target.value)}
            error={fieldErrors.email}
            disabled={isSubmitting}
            aria-describedby={formErrorDescribedBy}
            required
          />
          <div className="flex flex-col gap-3">
            <PasswordField
              label={t('auth.password')}
              name="password"
              autoComplete="new-password"
              placeholder={t('auth.passwordPlaceholderNew')}
              value={values.password}
              onChange={(event) => updateField('password', event.target.value)}
              error={fieldErrors.password}
              disabled={isSubmitting}
              aria-describedby={formErrorDescribedBy}
              required
            />
            <PasswordStrengthMeter password={values.password} />
          </div>

          <Button type="submit" fullWidth className="mt-2" disabled={isSubmitting}>
            {isSubmitting ? t('auth.creatingAccount') : t('auth.createAccount')}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-sm text-navy-muted">
        {t('auth.hasAccount')}{' '}
        <Link to="/login" className="font-semibold text-primary hover:text-primary-hover">
          {t('auth.signIn')}
        </Link>
      </p>
    </div>
  )
}
