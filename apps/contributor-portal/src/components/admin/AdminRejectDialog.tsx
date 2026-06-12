import { Button } from '../ui/Button'
import { TextAreaField } from '../ui/TextAreaField'

type AdminRejectDialogProps = {
  open: boolean
  reason: string
  isSubmitting: boolean
  error: string | null
  title?: string
  description?: string
  fieldLabel?: string
  fieldName?: string
  confirmLabel?: string
  submittingLabel?: string
  onReasonChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
}

export function AdminRejectDialog({
  open,
  reason,
  isSubmitting,
  error,
  title = 'Reject submission',
  description = 'Provide a reason so the contributor understands what needs to change.',
  fieldLabel = 'Rejection reason',
  fieldName = 'reject_reason',
  confirmLabel = 'Reject submission',
  submittingLabel = 'Rejecting…',
  onReasonChange,
  onCancel,
  onConfirm,
}: AdminRejectDialogProps) {
  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-navy/40 p-4 sm:items-center"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-reject-title"
        className="w-full max-w-md rounded-2xl border border-border/70 bg-white p-5 shadow-[var(--shadow-card)] sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="admin-reject-title" className="font-serif text-xl font-semibold text-navy">
          {title}
        </h2>
        <p className="mt-2 text-sm text-navy-muted">{description}</p>

        <div className="mt-4">
          <TextAreaField
            label={fieldLabel}
            name={fieldName}
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            rows={4}
            disabled={isSubmitting}
            required
          />
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting || !reason.trim()}
            className="!bg-red-700 hover:!bg-red-800"
          >
            {isSubmitting ? submittingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
