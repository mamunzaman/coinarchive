import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { AdminSubmissionListItem } from '../../lib/adminApi'
import {
  getAdminContentLanguageMeta,
  getAdminQueueQuality,
  getAdminSubmissionCountry,
  getContributorLabel,
  getSubmissionCoinCode,
} from '../../lib/adminQueueFilters'
import { getSubmissionDuplicateRisk } from '../../lib/duplicateProtection'
import type { SubmissionDuplicateRiskLevel } from '../../lib/duplicateProtection'
import { formatSubmittedDate } from '../../lib/format'
import { getSubmissionPreviewUrl } from '../../lib/submissionListUtils'

type AdminQueueCoinCellProps = {
  submission: AdminSubmissionListItem
  detailPath: string
  compact?: boolean
  layout?: 'default' | 'card'
}

function CoinThumbnail({
  submission,
  compact = false,
}: {
  submission: AdminSubmissionListItem
  compact?: boolean
}) {
  const previewUrl = getSubmissionPreviewUrl(submission)
  const sizeClass = compact ? 'h-16 w-16' : 'h-20 w-20'
  const alt = `${submission.title} thumbnail`

  if (previewUrl) {
    return (
      <img
        src={previewUrl}
        alt={alt}
        className={[
          sizeClass,
          'shrink-0 rounded-xl border border-slate-200/70 bg-white object-contain p-1 shadow-[0_1px_3px_rgba(15,23,42,0.08)]',
        ].join(' ')}
      />
    )
  }

  return (
    <div
      className={[
        sizeClass,
        'flex shrink-0 items-center justify-center rounded-xl border border-slate-200/70 bg-slate-50 font-serif text-base text-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.06)]',
      ].join(' ')}
    >
      ◎
    </div>
  )
}

function MetaChip({ value }: { value: string }) {
  return (
    <span className="inline-flex max-w-full items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
      <span className="truncate">{value}</span>
    </span>
  )
}

export function QueueLanguageBadges({ submission }: { submission: AdminSubmissionListItem }) {
  const languageMeta = getAdminContentLanguageMeta(submission)

  return (
    <div className="flex flex-wrap gap-1">
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-sky-200">
        <span className="font-bold">{languageMeta.badge}</span>
        <span>{languageMeta.label}</span>
      </span>
      {languageMeta.translationStatusLabel ? (
        <span className="inline-flex max-w-full items-center rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-200">
          <span className="truncate">{languageMeta.translationStatusLabel}</span>
        </span>
      ) : null}
    </div>
  )
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

export function AdminQueueCardMetaRow({ submission }: { submission: AdminSubmissionListItem }) {
  const { t } = useTranslation()
  const quality = getAdminQueueQuality(submission)
  const duplicateRisk = getSubmissionDuplicateRisk(submission)
  const duplicateLabel = t(getDuplicateRiskLabelKey(duplicateRisk.level))

  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-1 border-t border-slate-100 bg-slate-50/50 px-3 py-2 sm:grid-cols-3">
      <p className="min-w-0 truncate text-[11px] leading-snug">
        <span className="text-slate-400">{t('admin.queue.submittedLabel')}: </span>
        <span className="font-medium text-slate-700">{formatSubmittedDate(submission.date)}</span>
      </p>
      <p className="min-w-0 truncate text-[11px] leading-snug">
        <span className="text-slate-400">{t('admin.queue.completenessLabel')}: </span>
        <span className="font-medium text-slate-700">{quality.score}%</span>
      </p>
      <p
        className="min-w-0 truncate text-[11px] leading-snug"
        title={duplicateRisk.reason || undefined}
      >
        <span className="text-slate-400">{t('admin.queue.duplicateLabel')}: </span>
        <span className="font-medium text-slate-700">{duplicateLabel}</span>
      </p>
    </div>
  )
}

export function QueueSignalBadges({ submission }: { submission: AdminSubmissionListItem }) {
  const quality = getAdminQueueQuality(submission)
  const duplicateRisk = getSubmissionDuplicateRisk(submission)
  const duplicateRiskClass =
    duplicateRisk.level === 'exact'
      ? 'bg-red-50 text-red-700 ring-red-200'
      : duplicateRisk.level === 'similar'
        ? 'bg-amber-50 text-amber-700 ring-amber-200'
        : duplicateRisk.level === 'none'
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          : 'bg-slate-100 text-slate-600 ring-slate-200'
  const duplicateRiskLabel =
    duplicateRisk.level === 'exact'
      ? 'Exact duplicate'
      : duplicateRisk.level === 'similar'
        ? 'Similar duplicate'
        : duplicateRisk.level === 'none'
          ? 'No known risk'
          : 'Duplicate not checked'
  const qualityClass =
    quality.score >= 85
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : quality.score >= 65
        ? 'bg-amber-50 text-amber-700 ring-amber-200'
        : 'bg-red-50 text-red-700 ring-red-200'
  const missingText =
    quality.missing.length > 0
      ? `Missing: ${quality.missing.slice(0, 2).join(', ')}${quality.missing.length > 2 ? '…' : ''}`
      : 'Core review data present'

  return (
    <div className="flex flex-wrap gap-1.5">
      <QueueLanguageBadges submission={submission} />
      <span
        className={[
          'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1',
          duplicateRiskClass,
        ].join(' ')}
        title={duplicateRisk.reason}
        aria-label={`${duplicateRiskLabel}${duplicateRisk.reason ? `: ${duplicateRisk.reason}` : ''}`}
      >
        {duplicateRiskLabel}
      </span>
      <span
        className={[
          'inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1',
          qualityClass,
        ].join(' ')}
        title={missingText}
        aria-label={`${quality.score}% ready. ${missingText}`}
      >
        {quality.score}% ready
        <span className="ml-1 hidden max-w-[12rem] truncate sm:inline">{missingText}</span>
      </span>
    </div>
  )
}

export function AdminQueueCoinCell({
  submission,
  detailPath,
  compact = false,
  layout = 'default',
}: AdminQueueCoinCellProps) {
  const coinCode = getSubmissionCoinCode(submission)
  const duplicateRisk = getSubmissionDuplicateRisk(submission)
  const contributor = getContributorLabel(submission)
  const country = getAdminSubmissionCountry(submission)
  const year = submission.year != null ? String(submission.year) : ''
  const chips = [
    country || null,
    year || null,
    submission.denomination?.trim() || null,
    submission.coin_type?.trim() || null,
  ].filter(Boolean) as string[]

  if (layout === 'card') {
    return (
      <div className="flex min-w-0 items-start gap-2.5">
        <CoinThumbnail submission={submission} compact />
        <div className="min-w-0 flex-1">
          <Link
            to={detailPath}
            state={{ duplicateRisk }}
            className="line-clamp-2 text-sm font-semibold leading-snug text-slate-800 transition-colors hover:text-teal-600"
            title={submission.title}
          >
            {submission.title}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <MetaChip value={`#${submission.id}`} />
            {chips.slice(0, 2).map((chip) => (
              <MetaChip key={chip} value={chip} />
            ))}
          </div>
          <p className="mt-0.5 truncate text-[11px] leading-snug text-slate-500">
            {contributor !== '—' ? contributor : 'Contributor unavailable'}
          </p>
          <div className="mt-1.5">
            <QueueLanguageBadges submission={submission} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <CoinThumbnail submission={submission} compact={compact} />
      <div className="min-w-0 flex-1">
        <Link
          to={detailPath}
          state={{ duplicateRisk }}
          className="block truncate text-[14px] font-semibold leading-snug text-slate-800 transition-colors hover:text-teal-600 xl:text-[15px]"
          title={submission.title}
        >
          {submission.title}
        </Link>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <MetaChip key={chip} value={chip} />
          ))}
          <MetaChip value={`#${submission.id}`} />
        </div>
        <p className="mt-1 truncate text-[11px] leading-snug text-slate-500">
          {contributor !== '—' ? contributor : 'Contributor unavailable'}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {coinCode ? (
            <span className="inline-block max-w-full truncate rounded-md bg-slate-100 px-1.5 py-px font-mono text-[10px] tracking-wide text-slate-500">
              {coinCode}
            </span>
          ) : null}
          <QueueSignalBadges submission={submission} />
        </div>
      </div>
    </div>
  )
}
