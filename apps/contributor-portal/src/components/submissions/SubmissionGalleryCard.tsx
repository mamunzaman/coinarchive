import { CheckCircle2, Circle } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { CoinSubmission } from '../../lib/api'
import { computeSubmissionListCompleteness, getCompletionTone } from '../../lib/completenessScore'
import { formatSubmittedDate } from '../../lib/format'
import {
  canDeleteSubmission,
  canEditSubmission,
  getSubmissionCoinCode,
  getSubmissionMetadata,
  getSubmissionObverseUrl,
  getSubmissionReverseUrl,
  getSubmissionUpdatedAt,
} from '../../lib/submissionListUtils'
import {
  ContributorSubmissionActions,
} from '../ui/ActionControls'
import { StatusBadge } from '../ui/StatusBadge'

type SubmissionGalleryCardProps = {
  submission: CoinSubmission
  onDelete?: (submission: CoinSubmission) => void
}

function normalizeStatus(status: string): string {
  return status.trim().toLowerCase().replace(/-/g, '_')
}

function CoinFacePreview({
  label,
  url,
  title,
}: {
  label: string
  url: string | null
  title: string
}) {
  const [hasError, setHasError] = useState(false)
  const displayUrl = hasError ? null : url

  useEffect(() => {
    setHasError(false)
  }, [url])

  return (
    <div className="min-w-0">
      <div className="aspect-square overflow-hidden rounded-2xl border border-border/60 bg-panel">
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={`${title} ${label.toLowerCase()} image`}
            onError={() => setHasError(true)}
            className="h-full w-full object-contain p-2"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white to-muted">
            <span className="font-serif text-3xl text-primary/35">◎</span>
          </div>
        )}
      </div>
      <p className="mt-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-muted">
        {label}
      </p>
    </div>
  )
}

function MetadataChip({ value }: { value: string }) {
  return (
    <span className="inline-flex max-w-full items-center rounded-full bg-muted px-2 py-1 text-[11px] font-semibold text-navy-muted">
      <span className="truncate">{value}</span>
    </span>
  )
}

function ReadinessPill({ submission }: { submission: CoinSubmission }) {
  const completeness = computeSubmissionListCompleteness(submission)
  const tone = getCompletionTone(completeness.score)
  const ready = completeness.score >= 80
  const toneClass =
    tone === 'high'
      ? 'bg-primary/10 text-primary ring-primary/20'
      : tone === 'medium'
        ? 'bg-amber-50 text-amber-700 ring-amber-200'
        : 'bg-red-50 text-red-700 ring-red-200'

  return (
    <div className="space-y-1.5">
      <span
        className={[
          'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
          toneClass,
        ].join(' ')}
      >
        {ready ? 'Ready for Review' : `${completeness.score}% Complete`}
      </span>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div
          className={[
            'h-full rounded-full',
            tone === 'high' ? 'bg-primary' : tone === 'medium' ? 'bg-amber-400' : 'bg-red-400',
          ].join(' ')}
          style={{ width: `${completeness.score}%` }}
        />
      </div>
    </div>
  )
}

function WorkflowIndicator({ status }: { status: string }) {
  const normalized = normalizeStatus(status)
  const submitted = normalized !== 'draft'
  const approved = normalized === 'approved' || normalized === 'publish' || normalized === 'published'
  const items = [
    { label: 'Created', done: true },
    { label: 'Submitted', done: submitted },
    { label: 'Under Review', done: submitted || approved },
    { label: 'Approved', done: approved },
  ]

  return (
    <div className="grid grid-cols-2 gap-1.5 text-[11px] text-navy-muted sm:grid-cols-4">
      {items.map((item) => {
        const Icon = item.done ? CheckCircle2 : Circle
        return (
          <span key={item.label} className="inline-flex items-center gap-1">
            <Icon
              className={['h-3.5 w-3.5', item.done ? 'text-primary' : 'text-navy-muted/50'].join(' ')}
              aria-hidden
            />
            {item.label}
          </span>
        )
      })}
    </div>
  )
}

export function SubmissionGalleryCard({ submission, onDelete }: SubmissionGalleryCardProps) {
  const obverseUrl = getSubmissionObverseUrl(submission)
  const reverseUrl = getSubmissionReverseUrl(submission)
  const coinCode = getSubmissionCoinCode(submission)
  const metadata = getSubmissionMetadata(submission)
  const metadataChips = [metadata.country, metadata.year, metadata.denomination].filter(Boolean)
  const editable = canEditSubmission(submission)
  const deletable = canDeleteSubmission(submission)
  const detailPath = `/my-submissions/${submission.id}`
  const editPath = `/my-submissions/${submission.id}/edit`

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-border/70 bg-surface shadow-[0_8px_28px_rgba(15,23,42,0.08)] transition-shadow hover:shadow-[0_14px_36px_rgba(15,23,42,0.12)]">
      <div className="flex items-center justify-between gap-3 border-b border-border/50 bg-white px-4 py-3">
        <div className="min-w-0">
          <StatusBadge status={submission.status} />
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 font-mono text-[11px] font-semibold text-navy-muted">
          #{submission.id}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 bg-gradient-to-br from-page to-white px-4 py-4">
        <CoinFacePreview label="Obverse" url={obverseUrl} title={submission.title} />
        <CoinFacePreview label="Reverse" url={reverseUrl} title={submission.title} />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div>
          <h2 className="mt-1 line-clamp-2 font-serif text-lg font-semibold leading-snug text-navy">
            {submission.title}
          </h2>
          {coinCode ? (
            <p className="mt-1 break-all font-mono text-[11px] leading-snug text-navy-muted">
              {coinCode}
            </p>
          ) : null}
        </div>

        <ReadinessPill submission={submission} />

        <WorkflowIndicator status={submission.status} />

        <div className="flex flex-wrap gap-1.5">
          {metadataChips.map((value) => (
            <MetadataChip key={value} value={value} />
          ))}
          <MetadataChip value={`Submitted ${formatSubmittedDate(submission.date)}`} />
          {getSubmissionUpdatedAt(submission) !== submission.date ? (
            <MetadataChip value={`Updated ${formatSubmittedDate(getSubmissionUpdatedAt(submission))}`} />
          ) : null}
        </div>

        <div className="mt-auto border-t border-border/60 pt-3">
          <ContributorSubmissionActions
            layout="balanced-grid"
            viewPath={detailPath}
            editPath={editable ? editPath : undefined}
            onDelete={deletable && onDelete ? () => onDelete(submission) : undefined}
          />
        </div>
      </div>
    </article>
  )
}
