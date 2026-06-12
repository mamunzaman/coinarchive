import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'

type DeleteSubmissionConfirmDialogProps = {
  open: boolean
  isDeleting: boolean
  error?: string | null
  submissionTitle?: string | null
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteSubmissionConfirmDialog({
  open,
  isDeleting,
  error,
  submissionTitle,
  onCancel,
  onConfirm,
}: DeleteSubmissionConfirmDialogProps) {
  const { t } = useTranslation()

  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-4 sm:items-center"
      role="presentation"
      onClick={isDeleting ? undefined : onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-submission-title"
        aria-describedby="delete-submission-description"
        className="w-full max-w-md rounded-2xl border border-border/60 bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="delete-submission-title" className="font-serif text-xl font-semibold text-navy">
          {t('deleteSubmission.title')}
        </h2>
        {submissionTitle ? (
          <p className="mt-2 rounded-lg bg-muted/40 px-3 py-2 text-sm font-medium text-navy">
            {submissionTitle}
          </p>
        ) : null}
        <p id="delete-submission-description" className="mt-3 text-sm leading-relaxed text-navy-muted">
          {t('deleteSubmission.description')}
        </p>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="min-h-11"
            disabled={isDeleting}
            onClick={onCancel}
          >
            {t('common.cancel')}
          </Button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? t('deleteSubmission.deleting') : t('deleteSubmission.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
