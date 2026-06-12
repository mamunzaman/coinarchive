import { Button } from './Button'

export const UNSAVED_CHANGES_LEAVE_MESSAGE =
  'You have unsaved changes. Leave without saving?'

type LeaveConfirmDialogProps = {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function LeaveConfirmDialog({ open, onCancel, onConfirm }: LeaveConfirmDialogProps) {
  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-navy/40 p-4 sm:items-center"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-confirm-title"
        aria-describedby="leave-confirm-description"
        className="w-full max-w-md rounded-2xl border border-border/60 bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="leave-confirm-title" className="font-serif text-xl font-semibold text-navy">
          Leave without saving?
        </h2>
        <p id="leave-confirm-description" className="mt-3 text-sm leading-relaxed text-navy-muted">
          {UNSAVED_CHANGES_LEAVE_MESSAGE}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" className="min-h-11" onClick={onCancel}>
            Cancel
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-red-600 px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  )
}
