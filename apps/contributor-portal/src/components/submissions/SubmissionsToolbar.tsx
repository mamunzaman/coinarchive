import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  SubmissionSortOption,
  SubmissionStatusFilter,
  SubmissionViewMode,
} from '../../lib/submissionListUtils'

type SubmissionsToolbarProps = {
  query: string
  statusFilter: SubmissionStatusFilter
  sort: SubmissionSortOption
  viewMode: SubmissionViewMode
  resultCount: number
  totalCount: number
  onQueryChange: (value: string) => void
  onStatusFilterChange: (value: SubmissionStatusFilter) => void
  onSortChange: (value: SubmissionSortOption) => void
  onViewModeChange: (value: SubmissionViewMode) => void
}

const selectClass =
  'field-control !min-h-11 !py-3 !text-sm font-medium normal-case tracking-normal'

export function SubmissionsToolbar({
  query,
  statusFilter,
  sort,
  viewMode,
  resultCount,
  totalCount,
  onQueryChange,
  onStatusFilterChange,
  onSortChange,
  onViewModeChange,
}: SubmissionsToolbarProps) {
  const { t } = useTranslation()

  const statusOptions = useMemo(
    () =>
      [
        { value: 'all' as const, label: t('submissions.statusAll') },
        { value: 'pending' as const, label: t('submissions.statusPending') },
        { value: 'needs_revision' as const, label: t('submissions.statusNeedsRevision') },
        { value: 'drafts' as const, label: t('submissions.statusDrafts') },
        { value: 'published' as const, label: t('submissions.statusPublished') },
      ],
    [t],
  )

  const sortOptions = useMemo(
    () =>
      [
        { value: 'recent' as const, label: t('submissions.sortRecent') },
        { value: 'oldest' as const, label: t('submissions.sortOldest') },
        { value: 'title-asc' as const, label: t('submissions.sortTitleAsc') },
        { value: 'title-desc' as const, label: t('submissions.sortTitleDesc') },
      ],
    [t],
  )

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-surface p-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <label className="block min-w-0 flex-1">
          <span className="sr-only">{t('submissions.searchLabel')}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t('submissions.searchPlaceholder')}
            className="field-control !text-sm"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-navy-muted">
            {t('submissions.statusLabel')}
            <select
              value={statusFilter}
              onChange={(event) =>
                onStatusFilterChange(event.target.value as SubmissionStatusFilter)
              }
              className={selectClass}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-navy-muted">
            {t('submissions.sortLabel')}
            <select
              value={sort}
              onChange={(event) => onSortChange(event.target.value as SubmissionSortOption)}
              className={selectClass}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-navy-muted">
              {t('submissions.viewLabel')}
            </span>
            <div className="inline-flex rounded-xl border border-border bg-white p-0.5">
              <button
                type="button"
                onClick={() => onViewModeChange('gallery')}
                aria-pressed={viewMode === 'gallery'}
                className={[
                  'min-h-11 flex-1 rounded-lg px-3 text-xs font-semibold transition',
                  viewMode === 'gallery'
                    ? 'bg-primary text-white'
                    : 'text-navy-muted hover:bg-page',
                ].join(' ')}
              >
                {t('submissions.viewGallery')}
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('table')}
                aria-pressed={viewMode === 'table'}
                className={[
                  'min-h-11 flex-1 rounded-lg px-3 text-xs font-semibold transition',
                  viewMode === 'table'
                    ? 'bg-primary text-white'
                    : 'text-navy-muted hover:bg-page',
                ].join(' ')}
              >
                {t('submissions.viewTable')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-navy-muted">
        {t('submissions.results', { count: resultCount, total: totalCount })}
      </p>
    </div>
  )
}
