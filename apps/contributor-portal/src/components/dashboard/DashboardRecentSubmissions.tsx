import { LayoutList } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { CoinSubmission } from '../../lib/api'
import type { CompletenessResult } from '../../lib/completenessScore'
import { CompletionIndicator } from './CompletionIndicator'
import { formatSubmittedDate } from '../../lib/format'
import {
  canDeleteSubmission,
  canEditSubmission,
  getSubmissionPreviewUrl,
} from '../../lib/submissionListUtils'
import {
  ContributorDeleteAction,
  ContributorEditAction,
  ContributorViewAction,
  ICON_ACTION,
} from '../ui/ActionControls'
import { StatusBadge } from '../ui/StatusBadge'

type DashboardRecentSubmissionsProps = {
  submissions: CoinSubmission[]
  completenessById?: Map<number, CompletenessResult>
  onDelete?: (submission: CoinSubmission) => void
}

function formatStatusLabel(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function SubmissionThumbnail({ previewUrl, title }: { previewUrl: string | null; title: string }) {
  return (
    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-panel">
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={`${title} thumbnail`}
          className="h-full w-full object-contain p-1.5"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-serif text-xl text-primary">
          ◎
        </div>
      )}
    </div>
  )
}

function SubmissionMeta({
  submission,
  completeness,
}: {
  submission: CoinSubmission
  completeness?: CompletenessResult
}) {
  return (
    <>
      <p className="mt-1 text-sm leading-snug text-navy-muted">
        {formatSubmittedDate(submission.date)} · ID {submission.id}
      </p>
      {completeness ? (
        <p className="mt-1 text-xs leading-snug text-navy-muted">
          <span className="font-medium text-navy">{formatStatusLabel(submission.status)}</span>
          <span aria-hidden> · </span>
          <CompletionIndicator variant="compact" result={completeness} showRequired={false} />
        </p>
      ) : (
        <div className="mt-1.5">
          <StatusBadge status={submission.status} />
        </div>
      )}
    </>
  )
}

export function DashboardRecentSubmissions({
  submissions,
  completenessById,
  onDelete,
}: DashboardRecentSubmissionsProps) {
  const { t } = useTranslation()

  if (submissions.length === 0) {
    return null
  }

  const actionButtonProps = {
    fullWidth: true,
    mobileSafe: true,
    className: 'min-[1300px]:w-auto min-[1300px]:min-w-0',
  } as const

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-4 border-b border-border/60 px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h2 className="font-serif text-lg font-semibold text-navy sm:text-xl">
            {t('dashboard.recent.title')}
          </h2>
          <p className="mt-1 text-sm text-navy-muted">{t('dashboard.recent.subtitle')}</p>
        </div>
        <Link
          to="/my-submissions"
          className="action-btn-primary inline-flex shrink-0 items-center gap-2"
        >
          <LayoutList className={ICON_ACTION} aria-hidden />
          <span>{t('dashboard.recent.viewAll')}</span>
        </Link>
      </div>
      <ul className="divide-y divide-border/60">
        {submissions.map((submission) => {
          const previewUrl = getSubmissionPreviewUrl(submission)
          const editable = canEditSubmission(submission)
          const deletable = canDeleteSubmission(submission)
          const detailPath = `/my-submissions/${submission.id}`
          const editPath = `/my-submissions/${submission.id}/edit`
          const completeness = completenessById?.get(submission.id)

          return (
            <li
              key={submission.id}
              className="grid grid-cols-[4rem_minmax(0,1fr)] gap-x-3 gap-y-3 px-4 py-3 sm:px-5 min-[1300px]:grid-cols-[4rem_minmax(0,1fr)_auto] min-[1300px]:items-center min-[1300px]:gap-x-4 min-[1300px]:gap-y-0"
            >
              <div className="col-start-1 row-start-1">
                <SubmissionThumbnail previewUrl={previewUrl} title={submission.title} />
              </div>

              <div className="col-start-2 row-start-1 min-w-0">
                <p className="line-clamp-2 font-medium leading-snug text-navy">{submission.title}</p>
                <div className="hidden min-[1300px]:block">
                  <SubmissionMeta submission={submission} completeness={completeness} />
                </div>
              </div>

              <div className="col-span-2 col-start-1 row-start-2 min-w-0 min-[1300px]:hidden">
                <SubmissionMeta submission={submission} completeness={completeness} />
              </div>

              <div className="col-span-2 col-start-1 row-start-3 grid grid-cols-3 gap-2 min-[1300px]:col-span-1 min-[1300px]:col-start-3 min-[1300px]:row-start-1 min-[1300px]:flex min-[1300px]:flex-wrap min-[1300px]:justify-end min-[1300px]:gap-2">
                <ContributorViewAction to={detailPath} {...actionButtonProps} />
                {editable ? <ContributorEditAction to={editPath} {...actionButtonProps} /> : null}
                {deletable && onDelete ? (
                  <ContributorDeleteAction
                    onClick={() => onDelete(submission)}
                    {...actionButtonProps}
                  />
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
