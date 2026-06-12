import { Button } from './Button'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Abbrechen',
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-4 sm:items-center"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="w-full max-w-md rounded-2xl border border-border/60 bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="font-serif text-xl font-semibold text-navy">
          {title}
        </h2>
        <p id="confirm-dialog-description" className="mt-3 text-sm leading-relaxed text-navy-muted">
          {description}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" className="min-h-11" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
