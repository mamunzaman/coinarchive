import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ActivityLogList } from './ActivityLogList'
import { Button } from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { ApiError, getMySubmissionActivity, type SubmissionActivityLog } from '../../lib/api'

type SubmissionActivityModalProps = {
  open: boolean
  submissionId: number
  onClose: () => void
}

export function SubmissionActivityModal({
  open,
  submissionId,
  onClose,
}: SubmissionActivityModalProps) {
  const { t } = useTranslation()
  const { token } = useAuth()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [logs, setLogs] = useState<SubmissionActivityLog[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    closeButtonRef.current?.focus()

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open) {
      setLogs([])
      setTotal(0)
      setError(null)
      return
    }

    async function loadActivity() {
      setIsLoading(true)
      setError(null)

      if (!token) {
        setError(t('dashboard.sessionExpired'))
        setIsLoading(false)
        return
      }

      try {
        const response = await getMySubmissionActivity(submissionId, token)
        setLogs(response.activity_logs ?? [])
        setTotal(response.total ?? response.activity_logs?.length ?? 0)
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError(t('detail.loadActivityFailed'))
        }
      } finally {
        setIsLoading(false)
      }
    }

    void loadActivity()
  }, [open, submissionId, token, t])

  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="submission-activity-title"
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-4 sm:px-6">
          <div>
            <h2 id="submission-activity-title" className="font-serif text-lg font-semibold text-navy">
              {t('detail.activityTitle')}
            </h2>
            {!isLoading && !error ? (
              <p className="mt-0.5 text-sm text-navy-muted">
                {t('detail.activityCount', { count: total })}
              </p>
            ) : null}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label={t('detail.closeActivity')}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-navy-muted transition-colors hover:bg-muted hover:text-navy"
            onClick={onClose}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              <p className="text-sm text-navy-muted">{t('detail.loadingActivity')}</p>
            </div>
          ) : null}

          {error ? (
            <div className="flex flex-col gap-3 py-4">
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
              <Button type="button" variant="secondary" onClick={onClose}>
                {t('detail.close')}
              </Button>
            </div>
          ) : null}

          {!isLoading && !error ? <ActivityLogList logs={logs} /> : null}
        </div>
      </div>
    </div>
  )
}
