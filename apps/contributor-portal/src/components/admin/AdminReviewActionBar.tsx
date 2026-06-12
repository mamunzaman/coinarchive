import { ArrowLeft, Check, MessageSquare, RefreshCw, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../ui/StatusBadge'
import type { CoinSubmissionDetail } from '../../lib/api'

type AdminReviewActionBarProps = {
  submission: CoinSubmissionDetail
  isDeciding: boolean
  decisionError: string | null
  decisionMessage: string | null
  onApprove: () => void
  onRequestRevision: () => void
  onReject: () => void
  onReload: () => void
}

export function AdminReviewActionBar({
  submission,
  isDeciding,
  decisionError,
  decisionMessage,
  onApprove,
  onRequestRevision,
  onReject,
  onReload,
}: AdminReviewActionBarProps) {
  return (
    <div className="mb-5 xl:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-white px-4 py-3.5 shadow-[var(--shadow-card)] sm:px-5">
        <Link
          to="/admin/submissions"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to queue
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={submission.status} />

          <button
            type="button"
            disabled={isDeciding}
            onClick={onApprove}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            <Check className="h-4 w-4" aria-hidden />
            Approve
          </button>
          <button
            type="button"
            disabled={isDeciding}
            onClick={onRequestRevision}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border bg-page px-4 py-2 text-sm font-semibold text-navy shadow-sm transition-colors hover:border-primary/30 hover:bg-white disabled:opacity-50"
          >
            <MessageSquare className="h-4 w-4" aria-hidden />
            Revision
          </button>
          <button
            type="button"
            disabled={isDeciding}
            onClick={onReject}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition-colors hover:bg-red-100 disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden />
            Reject
          </button>
          <button
            type="button"
            disabled={isDeciding}
            onClick={onReload}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-page text-navy-muted shadow-sm transition-colors hover:border-primary/30 hover:bg-white hover:text-navy disabled:opacity-50"
            aria-label="Reload submission"
            title="Reload submission"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {decisionMessage ? (
        <div
          role="status"
          className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {decisionMessage}
        </div>
      ) : null}
      {decisionError ? (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {decisionError}
        </div>
      ) : null}
    </div>
  )
}
