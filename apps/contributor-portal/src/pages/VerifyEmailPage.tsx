import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import i18n from '../i18n'
import { resendAuthVerification, verifyAuthEmail, toAuthErrorResponse } from '../services/authApi'
import { AUTH_ERROR_CODES, isAuthErrorResponse } from '../types/auth'

type VerifyEmailState =
  | 'invalid_link'
  | 'verifying'
  | 'success'
  | 'token_expired'
  | 'token_invalid'
  | 'error'

type StatusTone = 'success' | 'warning' | 'error' | 'loading'

function StatusIcon({ tone }: { tone: StatusTone }) {
  if (tone === 'loading') {
    return (
      <div className="flex h-14 w-14 items-center justify-center" aria-hidden="true">
        <span className="inline-block h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    )
  }

  const symbol = tone === 'success' ? '✓' : tone === 'warning' ? '!' : '×'
  const toneClass =
    tone === 'success'
      ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
      : tone === 'warning'
        ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-200'
        : 'bg-red-100 text-red-700 ring-1 ring-red-200'

  return (
    <div
      className={[
        'flex h-14 w-14 items-center justify-center rounded-full',
        toneClass,
      ].join(' ')}
      aria-hidden="true"
    >
      <span className="text-2xl font-semibold">{symbol}</span>
    </div>
  )
}

function VerifyEmailScreen({
  tone,
  title,
  children,
  cta,
  action,
}: {
  tone: StatusTone
  title: string
  children: ReactNode
  cta?: { to: string; label: string }
  action?: ReactNode
}) {
  return (
    <div className="w-full">
      <Card>
        <div className="flex flex-col items-center gap-5 px-1 py-2 text-center sm:px-2">
          <StatusIcon tone={tone} />
          <div className="max-w-sm space-y-2">
            <h1 className="font-serif text-2xl font-semibold text-navy sm:text-[1.65rem]">
              {title}
            </h1>
            <div className="space-y-3 text-sm leading-relaxed text-navy-muted">{children}</div>
          </div>
          {action ? <div className="mt-1 w-full sm:w-auto">{action}</div> : null}
          {cta ? (
            <Link
              to={cta.to}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover sm:w-auto sm:min-w-[12rem]"
            >
              {cta.label}
            </Link>
          ) : null}
        </div>
      </Card>
    </div>
  )
}

function isAlreadyVerifiedMessage(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('already verified') ||
    normalized.includes('already been verified') ||
    normalized.includes('email is already verified')
  )
}

export function VerifyEmailPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email')?.trim() ?? ''
  const token = searchParams.get('token')?.trim() ?? ''
  const [state, setState] = useState<VerifyEmailState>(() =>
    email && token ? 'verifying' : 'invalid_link',
  )
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const latestRequestIdRef = useRef(0)
  const verificationSucceededRef = useRef(false)

  async function handleResendVerification() {
    if (!email) {
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

  useEffect(() => {
    if (!email || !token) {
      setState('invalid_link')
      return
    }

    verificationSucceededRef.current = false
    const requestId = ++latestRequestIdRef.current

    async function verify() {
      if (requestId === latestRequestIdRef.current) {
        setState('verifying')
        setStatusMessage(i18n.t('auth.verifyCheckingMessage'))
      }

      try {
        await verifyAuthEmail({ email, token })
        verificationSucceededRef.current = true
        setState('success')
        setStatusMessage(null)
      } catch (error) {
        if (requestId !== latestRequestIdRef.current) {
          return
        }

        const result = toAuthErrorResponse(error)
        if (!isAuthErrorResponse(result)) {
          setState('error')
          setStatusMessage(i18n.t('auth.verifyFailedMessage'))
          return
        }

        if (result.code === AUTH_ERROR_CODES.TOKEN_EXPIRED) {
          setState('token_expired')
          setStatusMessage(i18n.t('auth.verifyExpiredMessage'))
          return
        }

        if (result.code === AUTH_ERROR_CODES.TOKEN_INVALID) {
          if (
            verificationSucceededRef.current ||
            isAlreadyVerifiedMessage(result.message)
          ) {
            setState('success')
            setStatusMessage(null)
            return
          }

          setState('token_invalid')
          setStatusMessage(i18n.t('auth.verifyTokenInvalidMessage'))
          return
        }

        setState('error')
        setStatusMessage(result.message || i18n.t('auth.verifyFailedMessage'))
      }
    }

    void verify()
  }, [email, token])

  if (state === 'invalid_link') {
    return (
      <VerifyEmailScreen
        tone="error"
        title={t('auth.verifyInvalidTitle')}
        cta={{ to: '/login', label: t('auth.goToLogin') }}
      >
        <p role="alert">
          {t('auth.verifyMissingInfo')}
        </p>
      </VerifyEmailScreen>
    )
  }

  if (state === 'verifying') {
    return (
      <VerifyEmailScreen tone="loading" title={t('auth.verifyCheckingTitle')}>
        <p role="status" aria-live="polite">
          {statusMessage ?? t('auth.verifyCheckingMessage')}
        </p>
      </VerifyEmailScreen>
    )
  }

  if (state === 'success') {
    return (
      <VerifyEmailScreen
        tone="success"
        title={t('auth.verifySuccessTitle')}
        cta={{ to: '/login', label: t('auth.goToLogin') }}
      >
        <p role="status" aria-live="polite">
          {t('auth.verifySuccessMessage')}
        </p>
      </VerifyEmailScreen>
    )
  }

  if (state === 'token_expired') {
    return (
      <VerifyEmailScreen
        tone="warning"
        title={t('auth.verifyExpiredTitle')}
        cta={{ to: '/login', label: t('auth.goToLogin') }}
        action={
          email ? (
            <div className="flex w-full flex-col gap-2 sm:min-w-[12rem]">
              <Button
                type="button"
                variant="secondary"
                className="w-full !min-h-11"
                disabled={isResending}
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
          ) : undefined
        }
      >
        <p role="alert" aria-live="polite">
          {statusMessage}
        </p>
        <p>{t('auth.verifyRequestNewHint')}</p>
      </VerifyEmailScreen>
    )
  }

  if (state === 'token_invalid') {
    return (
      <VerifyEmailScreen
        tone="error"
        title={t('auth.verifyTokenInvalidTitle')}
        cta={{ to: '/login', label: t('auth.goToLogin') }}
      >
        <p role="alert" aria-live="polite">
          {statusMessage}
        </p>
      </VerifyEmailScreen>
    )
  }

  return (
    <VerifyEmailScreen
      tone="error"
      title={t('auth.verifyFailedTitle')}
      cta={{ to: '/login', label: t('auth.goToLogin') }}
    >
      <p role="alert" aria-live="polite">
        {statusMessage}
      </p>
    </VerifyEmailScreen>
  )
}
