import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CoinSubmission } from '../../lib/api'
import { formatSubmittedDate } from '../../lib/format'
import {
  canDeleteSubmission,
  canEditSubmission,
  getSubmissionCoinCode,
  getSubmissionPreviewUrl,
} from '../../lib/submissionListUtils'
import { ContributorSubmissionActions } from '../ui/ActionControls'
import { StatusBadge } from '../ui/StatusBadge'

type SubmissionTableViewProps = {
  submissions: CoinSubmission[]
  onDelete?: (submission: CoinSubmission) => void
}

function SubmissionThumbnail({ src, title }: { src: string | null; title: string }) {
  const [hasError, setHasError] = useState(false)
  const displayUrl = hasError ? null : src

  useEffect(() => {
    setHasError(false)
  }, [src])

  return (
    <div className="h-14 w-14 overflow-hidden rounded-xl border border-border/60 bg-panel">
      {displayUrl ? (
        <img
          src={displayUrl}
          alt={`${title} thumbnail`}
          onError={() => setHasError(true)}
          className="h-full w-full object-contain p-1.5"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-serif text-xl text-primary/35">
          ◎
        </div>
      )}
    </div>
  )
}

export function SubmissionTableView({ submissions, onDelete }: SubmissionTableViewProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface shadow-[var(--shadow-card)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] table-fixed text-left text-sm" aria-label="My submissions table">
          <colgroup>
            <col className="w-[5rem]" />
            <col />
            <col className="w-[8rem]" />
            <col className="hidden w-[8rem] sm:table-column" />
            <col className="hidden w-[6rem] md:table-column" />
            <col className="w-[7.5rem] sm:w-[11rem] md:w-[15rem]" />
          </colgroup>
          <thead className="border-b border-border/60 bg-muted/40">
            <tr>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-navy-muted sm:px-5">
                Image
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-navy-muted sm:px-5">
                Title
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-navy-muted sm:px-5">
                Status
              </th>
              <th className="hidden px-3 py-3 text-xs font-semibold uppercase tracking-wide text-navy-muted sm:table-cell sm:px-5">
                Submitted
              </th>
              <th className="hidden px-3 py-3 text-xs font-semibold uppercase tracking-wide text-navy-muted md:table-cell sm:px-5">
                Post ID
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-navy-muted sm:px-5">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((submission) => {
              const editable = canEditSubmission(submission)
              const deletable = canDeleteSubmission(submission)
              const detailPath = `/my-submissions/${submission.id}`
              const editPath = `/my-submissions/${submission.id}/edit`
              const previewUrl = getSubmissionPreviewUrl(submission)
              const coinCode = getSubmissionCoinCode(submission)

              return (
                <tr
                  key={submission.id}
                  className="border-b border-border/40 last:border-b-0 hover:bg-muted/30 [&_td]:py-4"
                >
                  <td className="px-3 py-4 sm:px-5">
                    <SubmissionThumbnail src={previewUrl} title={submission.title} />
                  </td>
                  <td className="px-3 py-4 sm:px-5">
                    <Link
                      to={detailPath}
                      className="line-clamp-2 font-medium text-navy transition-colors hover:text-primary"
                    >
                      {submission.title}
                    </Link>
                    {coinCode ? (
                      <p className="mt-1 truncate font-mono text-[11px] text-navy-muted">
                        {coinCode}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-4 sm:px-5">
                    <StatusBadge status={submission.status} />
                  </td>
                  <td className="hidden px-3 py-4 text-navy-muted sm:table-cell sm:px-5">
                    {formatSubmittedDate(submission.date)}
                  </td>
                  <td className="hidden px-3 py-4 font-mono text-xs text-navy-muted md:table-cell sm:px-5">
                    {submission.id}
                  </td>
                  <td className="px-3 py-4 sm:px-5">
                    <ContributorSubmissionActions
                      layout="inline"
                      viewPath={detailPath}
                      editPath={editable ? editPath : undefined}
                      onDelete={
                        deletable && onDelete ? () => onDelete(submission) : undefined
                      }
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
