import type { ReactNode } from 'react'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { StatusBadge } from '../ui/StatusBadge'
import type { CoinSubmissionDetail } from '../../lib/api'
import { formatSubmittedDate } from '../../lib/format'
import { ICON_ACTION, LabeledActionButton } from '../ui/ActionControls'

type SubmissionDetailHeaderProps = {
  submission: CoinSubmissionDetail
  canEdit?: boolean
  editLabel?: string
  canDelete?: boolean
  isDeleting?: boolean
  deleteBlockedByImageEdit?: boolean
  onDelete?: () => void
  backTo?: string
  backLabel?: string
  editTo?: string
  showContributorActions?: boolean
  backLinkMode?: 'always' | 'desktop-only'
  showStatusBadge?: boolean
}

function MetaChip({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return (
    <span
      className={[
        'inline-flex min-h-7 max-w-full items-center rounded-full border px-2.5 py-1 text-[11px] font-medium',
        strong
          ? 'border-primary/20 bg-primary/5 text-primary'
          : 'border-border/60 bg-label/70 text-navy',
      ].join(' ')}
    >
      {children}
    </span>
  )
}

export function SubmissionDetailHeader({
  submission,
  canEdit = false,
  editLabel,
  canDelete = false,
  isDeleting = false,
  deleteBlockedByImageEdit = false,
  onDelete,
  backTo = '/my-submissions',
  backLabel,
  editTo,
  showContributorActions = true,
  backLinkMode = 'always',
  showStatusBadge = true,
}: SubmissionDetailHeaderProps) {
  const { t } = useTranslation()
  const resolvedEditLabel = editLabel ?? t('actions.edit')
  const resolvedBackLabel = backLabel ?? t('detail.backToSubmissions')
  const yearLabel = submission.year ? String(submission.year) : null

  const chips = [
    showStatusBadge ? 'status' : null,
    `#${submission.id}`,
    t('detail.submittedDate', { date: formatSubmittedDate(submission.date) }),
    submission.country?.trim() ? submission.country : null,
    submission.denomination?.trim() ? submission.denomination : null,
    submission.coin_type?.trim() ? submission.coin_type : null,
    yearLabel,
  ].filter(Boolean) as string[]

  const hideHeaderNavRow =
    !showContributorActions && backLinkMode === 'desktop-only'

  return (
    <header className="rounded-xl border border-border/60 bg-white px-4 py-3.5 shadow-[var(--shadow-card)] sm:px-5">
      <div
        className={[
          'mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3',
          hideHeaderNavRow ? 'hidden xl:flex' : '',
        ].join(' ')}
      >
        <Link
          to={backTo}
          className={[
            'min-h-11 items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary-hover',
            backLinkMode === 'desktop-only' ? 'hidden xl:inline-flex' : 'inline-flex',
          ].join(' ')}
        >
          <ArrowLeft className={ICON_ACTION} aria-hidden />
          <span>{resolvedBackLabel}</span>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {showContributorActions && canDelete && deleteBlockedByImageEdit ? (
            <div className="flex flex-col items-end gap-1">
              <LabeledActionButton
                label={t('detail.deleteSubmission')}
                icon={Trash2}
                variant="danger"
                disabled
                className="opacity-50"
              />
              <p className="text-xs font-medium text-red-600">{t('detail.finishImageEditing')}</p>
            </div>
          ) : null}
          {showContributorActions && canDelete && !deleteBlockedByImageEdit && onDelete ? (
            <LabeledActionButton
              label={isDeleting ? t('deleteSubmission.deleting') : t('actions.delete')}
              icon={Trash2}
              variant="danger"
              disabled={isDeleting}
              onClick={onDelete}
            />
          ) : null}
          {showContributorActions && canEdit ? (
            <Link
              to={editTo ?? `/my-submissions/${submission.id}/edit`}
              className="action-btn-neutral inline-flex min-h-11 items-center gap-2 px-4"
            >
              <Pencil className={ICON_ACTION} aria-hidden />
              <span>{resolvedEditLabel}</span>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-xl font-semibold leading-tight text-navy sm:text-2xl lg:text-[1.7rem]">
            {submission.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {chips.map((chip) =>
              chip === 'status' ? (
                <StatusBadge key="status" status={submission.status} />
              ) : (
                <MetaChip key={chip} strong={chip === yearLabel}>{chip}</MetaChip>
              ),
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
