import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { AdminSubmissionListItem } from '../../lib/adminApi'
import {
  getAdminQueueQuality,
  getAdminQueueStatusCategory,
  getContributorLabel,
  getSubmissionUpdatedAt,
  isPendingAdminSubmission,
} from '../../lib/adminQueueFilters'
import { getSubmissionDuplicateRisk } from '../../lib/duplicateProtection'
import type { SubmissionDuplicateRiskLevel } from '../../lib/duplicateProtection'
import { formatSubmittedDate } from '../../lib/format'
import { getSubmissionPreviewUrl } from '../../lib/submissionListUtils'
import { QueueLanguageBadges } from './AdminQueueCoinCell'
import { AdminQueueCardActionBar } from '../ui/ActionControls'
import { StatusBadge } from '../ui/StatusBadge'

type AdminSubmissionQueueMobileCardsProps = {
  submissions: AdminSubmissionListItem[]
  selectedIds: Set<number>
  onToggleRow: (id: number) => void
  onQuickApprove: (submission: AdminSubmissionListItem) => void
  onQuickReject: (submission: AdminSubmissionListItem) => void
  actionSubmissionId?: number | null
  emptyMessage?: string
}

function getCardAccentClass(status: string): string {
  const cat = getAdminQueueStatusCategory(status)
  switch (cat) {
    case 'pending':
      return 'shadow-[inset_3px_0_0_0_#f59e0b]'
    case 'approved':
      return 'shadow-[inset_3px_0_0_0_#14b8a6]'
    case 'rejected':
      return 'shadow-[inset_3px_0_0_0_#f87171]'
    case 'needs_revision':
      return 'shadow-[inset_3px_0_0_0_#fb923c]'
    case 'draft':
      return 'shadow-[inset_3px_0_0_0_#cbd5e1]'
    default:
      return ''
  }
}

function getDuplicateRiskLabelKey(level: SubmissionDuplicateRiskLevel): string {
  switch (level) {
    case 'exact':
      return 'admin.queue.duplicateExact'
    case 'similar':
      return 'admin.queue.duplicateSimilar'
    case 'none':
      return 'admin.queue.duplicateNone'
    default:
      return 'admin.queue.duplicateUnchecked'
  }
}

function MetaChip({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex max-w-full items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
    >
      <span className="truncate">{children}</span>
    </span>
  )
}

function CardThumbnail({ submission }: { submission: AdminSubmissionListItem }) {
  const previewUrl = getSubmissionPreviewUrl(submission)
  const alt = `${submission.title} thumbnail`

  if (previewUrl) {
    return (
      <img
        src={previewUrl}
        alt={alt}
        className="h-14 w-14 shrink-0 rounded-xl border border-slate-200/70 bg-white object-contain p-1 shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
      />
    )
  }

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-200/70 bg-slate-50 font-serif text-base text-slate-300">
      ◎
    </div>
  )
}

function CardQualityHint({ submission }: { submission: AdminSubmissionListItem }) {
  const quality = getAdminQueueQuality(submission)
  const needsAttention =
    quality.score < 85 || quality.incompleteData || quality.hasMissingImages

  if (!needsAttention) {
    return null
  }

  const toneClass =
    quality.score < 65 || quality.hasMissingImages
      ? 'text-red-700'
      : 'text-amber-700'

  const detail =
    quality.missing.length > 0
      ? quality.missing.slice(0, 2).join(', ')
      : quality.hasMissingImages
        ? 'missing images'
        : 'incomplete data'

  return (
    <p className={`mt-1.5 text-[11px] font-medium leading-snug ${toneClass}`}>
      {quality.score}% complete · {detail}
    </p>
  )
}

function CardMetaChips({ submission }: { submission: AdminSubmissionListItem }) {
  const { t } = useTranslation()
  const duplicateRisk = getSubmissionDuplicateRisk(submission)
  const duplicateLabel = t(getDuplicateRiskLabelKey(duplicateRisk.level))

  return (
    <div className="flex flex-wrap gap-1.5 px-3 pb-2">
      <MetaChip>
        {t('admin.queue.submittedLabel')}: {formatSubmittedDate(submission.date)}
      </MetaChip>
      <MetaChip>
        {t('admin.queue.updatedLabel')}: {formatSubmittedDate(getSubmissionUpdatedAt(submission))}
      </MetaChip>
      <MetaChip title={duplicateRisk.reason || undefined}>
        {t('admin.queue.duplicateLabel')}: {duplicateLabel}
      </MetaChip>
    </div>
  )
}

export function AdminSubmissionQueueMobileCards({
  submissions,
  selectedIds,
  onToggleRow,
  onQuickApprove,
  onQuickReject,
  actionSubmissionId = null,
  emptyMessage = 'No submissions match this filter.',
}: AdminSubmissionQueueMobileCardsProps) {
  const { t } = useTranslation()

  if (submissions.length === 0) {
    return (
      <div className="rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-white px-5 py-10 text-center shadow-[0_4px_24px_rgba(15,23,42,0.1)] min-[1400px]:hidden">
        <p className="text-sm text-slate-400">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 min-[1400px]:hidden">
      {submissions.map((submission) => {
        const detailPath = `/admin/submissions/${submission.id}`
        const isPending = isPendingAdminSubmission(submission)
        const isSelected = selectedIds.has(submission.id)
        const isRowBusy = actionSubmissionId === submission.id
        const duplicateRisk = getSubmissionDuplicateRisk(submission)
        const contributor = getContributorLabel(submission)

        return (
          <article
            key={submission.id}
            className={[
              'overflow-hidden rounded-2xl border bg-white shadow-[0_2px_8px_rgba(15,23,42,0.07)] transition-shadow',
              getCardAccentClass(submission.status),
              isSelected
                ? 'border-teal-300/50 ring-1 ring-teal-400/20'
                : 'border-[rgba(15,23,42,0.08)]',
            ].join(' ')}
          >
            <div className="flex items-center justify-between gap-2 border-b border-[rgba(15,23,42,0.06)] bg-[#F9FAFB] px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleRow(submission.id)}
                  aria-label={`Select ${submission.title}`}
                  className="h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary/30"
                />
                <StatusBadge status={submission.status} />
              </div>
              <span className="shrink-0 font-mono text-[11px] font-semibold text-slate-500">
                #{submission.id}
              </span>
            </div>

            <div className="flex items-start gap-2.5 px-3 py-2.5">
              <CardThumbnail submission={submission} />
              <div className="min-w-0 flex-1">
                <Link
                  to={detailPath}
                  state={{ duplicateRisk }}
                  className="line-clamp-2 text-sm font-semibold leading-snug text-slate-800 transition-colors hover:text-teal-600"
                  title={submission.title}
                >
                  {submission.title}
                </Link>
                <p className="mt-0.5 truncate text-[11px] leading-snug text-slate-500">
                  {contributor !== '—' ? contributor : t('admin.queue.contributorUnavailable')}
                </p>
                <div className="mt-1.5">
                  <QueueLanguageBadges submission={submission} />
                </div>
                <CardQualityHint submission={submission} />
              </div>
            </div>

            <CardMetaChips submission={submission} />

            <AdminQueueCardActionBar
              detailPath={detailPath}
              state={{ duplicateRisk }}
              isPending={isPending}
              isRowBusy={isRowBusy}
              onApprove={() => onQuickApprove(submission)}
              onReject={() => onQuickReject(submission)}
            />
          </article>
        )
      })}
    </div>
  )
}
