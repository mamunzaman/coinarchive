import type { ReactNode } from 'react'
import { FilePenLine, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { CoinSubmission } from '../../lib/api'
import { ICON_ACTION } from '../ui/ActionControls'
import { Button } from '../ui/Button'
import { StatusBadge } from '../ui/StatusBadge'
import { CompletionIndicator, getCompletionAccentClass } from './CompletionIndicator'
import {
  computeDraftCompletenessFromKey,
  computeSubmissionListCompleteness,
  type CompletenessResult,
} from '../../lib/completenessScore'
import type { DraftIndexEntry } from '../../lib/formDraftStorage'

type DashboardSavedDraftsProps = {
  localDrafts?: DraftIndexEntry[]
  apiDraftSubmissions?: CoinSubmission[]
  pendingDeleteTitle?: string | null
  deleteError?: string | null
  isDeleting?: boolean
  onRequestDeleteLocalDraft?: (draft: DraftIndexEntry) => void
  onRequestDeleteApiDraft?: (submission: CoinSubmission) => void
  onCancelDelete?: () => void
  onConfirmDelete?: () => void
}

function DraftContinueButton() {
  const { t } = useTranslation()

  return (
    <span className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-white group-focus-visible:bg-primary group-focus-visible:text-white">
      {t('dashboard.drafts.continue')}
      <FilePenLine className={ICON_ACTION} aria-hidden />
    </span>
  )
}

function DraftRow({
  to,
  title,
  meta,
  completeness,
  onDelete,
}: {
  to: string
  title: string
  meta: ReactNode
  completeness: CompletenessResult | null
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const accentClass = completeness ? getCompletionAccentClass(completeness) : 'bg-amber-400'

  return (
    <li>
      <div
        className={[
          'relative flex items-center justify-between gap-3 overflow-hidden rounded-xl',
          'border border-border/50 bg-white/90 px-3 py-2.5',
        ].join(' ')}
      >
        <span
          className={['absolute inset-y-2 left-0 w-1 rounded-r-full', accentClass].join(' ')}
          aria-hidden
        />
        <div className="min-w-0 flex-1 pl-2">
          <span className="block truncate text-sm font-medium text-navy">{title}</span>
          <span className="mt-0.5 block text-xs text-navy-muted">{meta}</span>
          {completeness ? (
            <CompletionIndicator variant="card" result={completeness} className="mt-1" />
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            to={to}
            className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-1 focus-visible:ring-offset-amber-50/80"
          >
            <DraftContinueButton />
          </Link>
          <button
            type="button"
            onClick={onDelete}
            title={t('dashboard.drafts.delete')}
            aria-label={t('dashboard.drafts.deleteDraftAria', { title })}
            className="inline-flex min-h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 transition-colors hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300/70"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </li>
  )
}

export function DashboardSavedDrafts({
  localDrafts = [],
  apiDraftSubmissions = [],
  pendingDeleteTitle = null,
  deleteError = null,
  isDeleting = false,
  onRequestDeleteLocalDraft,
  onRequestDeleteApiDraft,
  onCancelDelete,
  onConfirmDelete,
}: DashboardSavedDraftsProps) {
  const { t } = useTranslation()

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-amber-100/90 bg-amber-50/35 p-3 shadow-[var(--shadow-card)] sm:p-4">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-800 ring-1 ring-amber-100/90"
            aria-hidden
          >
            <FilePenLine className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-serif text-base font-semibold text-navy sm:text-lg">
                {t('dashboard.drafts.progressTitle')}
              </h2>
              <span className="rounded-full border border-amber-200/80 bg-amber-50/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-900/90">
                {t('dashboard.drafts.unfinished')}
              </span>
            </div>
            <p className="mt-1 text-sm leading-snug text-navy-muted">
              {t('dashboard.drafts.progressHint')}
            </p>
          </div>
        </div>

        {localDrafts.length === 0 && apiDraftSubmissions.length === 0 ? (
          <div className="mt-3 rounded-xl border border-amber-100 bg-white/80 px-3 py-4 text-sm text-navy-muted">
            {t('dashboard.drafts.emptyActive')}
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {localDrafts.slice(0, 5).map((draft) => (
              <DraftRow
                key={draft.key}
                to={draft.kind === 'new' ? '/new-coin' : `/my-submissions/${draft.submissionId}/edit`}
                title={draft.title}
                meta={
                  draft.kind === 'new'
                    ? t('dashboard.drafts.localNew')
                    : t('dashboard.drafts.localEdit', { id: draft.submissionId })
                }
                completeness={computeDraftCompletenessFromKey(draft.key)}
                onDelete={() => onRequestDeleteLocalDraft?.(draft)}
              />
            ))}
            {apiDraftSubmissions.map((submission) => (
              <DraftRow
                key={`api-draft-${submission.id}`}
                to={`/my-submissions/${submission.id}/edit`}
                title={submission.title}
                meta={
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <span>{t('dashboard.drafts.serverDraft')} · ID {submission.id}</span>
                    <StatusBadge status={submission.status} />
                  </span>
                }
                completeness={computeSubmissionListCompleteness(submission)}
                onDelete={() => onRequestDeleteApiDraft?.(submission)}
              />
            ))}
          </ul>
        )}
      </section>

      {pendingDeleteTitle ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-4 sm:items-center"
          role="presentation"
          onClick={isDeleting ? undefined : onCancelDelete}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dashboard-draft-title"
            aria-describedby="delete-dashboard-draft-description"
            className="w-full max-w-md rounded-2xl border border-border/60 bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="delete-dashboard-draft-title" className="font-serif text-xl font-semibold text-navy">
              {t('dashboard.drafts.deleteConfirmTitle')}
            </h2>
            <p id="delete-dashboard-draft-description" className="mt-3 text-sm leading-relaxed text-navy-muted">
              {t('dashboard.drafts.deleteDashboardBody')}
            </p>
            <p className="mt-2 truncate text-sm font-medium text-navy">{pendingDeleteTitle}</p>

            {deleteError ? (
              <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {deleteError}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                className="min-h-11"
                disabled={isDeleting}
                onClick={onCancelDelete}
              >
                {t('common.cancel')}
              </Button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={onConfirmDelete}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-red-600 px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:pointer-events-none disabled:opacity-50"
              >
                {isDeleting ? t('dashboard.drafts.deleting') : t('dashboard.drafts.delete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
