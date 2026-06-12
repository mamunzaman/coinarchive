import { Link } from 'react-router-dom'
import { formatSubmittedDate } from '../../lib/format'
import type { CoinSubmissionDetail } from '../../lib/api'

type AdminSubmissionMetaCardProps = {
  submission: CoinSubmissionDetail
}

export function AdminSubmissionMetaCard({ submission }: AdminSubmissionMetaCardProps) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-border/60 bg-white px-4 py-4 shadow-[var(--shadow-card)] xl:max-w-[340px]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-muted">
        Submission record
      </p>
      <dl className="mt-3 space-y-2.5">
        <div className="flex items-start justify-between gap-3 text-sm">
          <dt className="text-navy-muted">ID</dt>
          <dd className="font-mono font-medium text-navy">#{submission.id}</dd>
        </div>
        <div className="flex items-start justify-between gap-3 text-sm">
          <dt className="text-navy-muted">Submitted</dt>
          <dd className="text-right font-medium text-navy">{formatSubmittedDate(submission.date)}</dd>
        </div>
      </dl>
      {submission.status === 'pending' ? (
        <div className="mt-4 border-t border-border/50 pt-3">
          <Link
            to={`/my-submissions/${submission.id}/edit`}
            className="inline-flex min-h-11 items-center rounded-xl border border-border bg-page px-4 py-2.5 text-sm font-semibold text-navy transition-colors hover:border-primary/30 hover:bg-white"
          >
            Edit submission
          </Link>
        </div>
      ) : null}
    </div>
  )
}
