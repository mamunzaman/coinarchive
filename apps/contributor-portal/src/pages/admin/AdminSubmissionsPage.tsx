import { RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminQueueBulkBar } from '../../components/admin/AdminQueueBulkBar'
import { AdminQueueFilterCards } from '../../components/admin/AdminQueueFilterCards'
import { AdminQueueTableSkeleton } from '../../components/admin/AdminQueueTableSkeleton'
import { AdminQueueToolbar } from '../../components/admin/AdminQueueToolbar'
import { AdminRejectDialog } from '../../components/admin/AdminRejectDialog'
import { AdminSubmissionQueueMobileCards } from '../../components/admin/AdminSubmissionQueueMobileCards'
import { AdminSubmissionQueueTable } from '../../components/admin/AdminSubmissionQueueTable'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextAreaField } from '../../components/ui/TextAreaField'
import {
  approveAdminSubmission,
  formatAdminEndpointError,
  getAdminSubmissions,
  rejectAdminSubmission,
  requestAdminSubmissionRevision,
  type AdminSubmissionListItem,
} from '../../lib/adminApi'
import {
  ADMIN_QUEUE_DEFAULT_REVIEW_FILTER,
  ADMIN_QUEUE_DEFAULT_STATUS_FILTER,
  computeAdminQueueSummaryCounts,
  countPendingAdminSubmissions,
  filterAdminQueueSubmissions,
  getAdminQueueDuplicateLevels,
  getAdminQueueCountries,
  hasAdminQueueDuplicateRiskData,
  isDefaultAdminQueueView,
  isPendingAdminSubmission,
  sortAdminQueueSubmissions,
  type AdminQueueDuplicateFilter,
  type AdminQueueLanguageFilter,
  type AdminQueueReviewFilter,
  type AdminQueueSortOption,
  type AdminQueueStatusFilter,
} from '../../lib/adminQueueFilters'
import { useAuth } from '../../hooks/useAuth'
import { ApiError } from '../../lib/api'

const STATUS_DROPDOWN_OPTIONS: Array<{ value: AdminQueueStatusFilter; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'needs_revision', label: 'Needs revision' },
  { value: 'draft', label: 'Draft' },
]

type BulkActionMode = 'approve' | 'reject' | 'revision'

type BulkActionFailure = {
  id: number
  title: string
  message: string
}

type BulkActionSummary = {
  mode: BulkActionMode
  total: number
  succeeded: number
  failed: BulkActionFailure[]
  skipped: BulkActionFailure[]
}

export function AdminSubmissionsPage() {
  const { t } = useTranslation()
  const { token } = useAuth()
  const [submissions, setSubmissions] = useState<AdminSubmissionListItem[]>([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<AdminQueueStatusFilter>(
    ADMIN_QUEUE_DEFAULT_STATUS_FILTER,
  )
  const [countryFilter, setCountryFilter] = useState('')
  const [languageFilter, setLanguageFilter] = useState<AdminQueueLanguageFilter>('all')
  const [duplicateFilter, setDuplicateFilter] = useState<AdminQueueDuplicateFilter>('all')
  const [reviewFilter, setReviewFilter] = useState<AdminQueueReviewFilter>(
    ADMIN_QUEUE_DEFAULT_REVIEW_FILTER,
  )
  const [sort, setSort] = useState<AdminQueueSortOption>('review-priority')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)
  const [actionSubmissionId, setActionSubmissionId] = useState<number | null>(null)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState<string | null>(null)
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null)
  const [bulkDialogMode, setBulkDialogMode] = useState<BulkActionMode | null>(null)
  const [bulkNote, setBulkNote] = useState('')
  const [bulkDialogError, setBulkDialogError] = useState<string | null>(null)
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null)
  const [bulkSummary, setBulkSummary] = useState<BulkActionSummary | null>(null)

  async function loadSubmissions(options?: { refresh?: boolean }) {
    if (options?.refresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)
    setNotice(null)

    if (!token) {
      setError('Your session has expired. Please sign in again.')
      setIsLoading(false)
      setIsRefreshing(false)
      return
    }

    try {
      const result = await getAdminSubmissions(token)
      setSubmissions(result.response.submissions)

      if (result.meta.usedDevFallback) {
        setNotice(formatAdminEndpointError('/admin/submissions', new ApiError('', 404)))
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(formatAdminEndpointError('/admin/submissions', err))
      } else {
        setError('Unable to reach the server. Check your connection and try again.')
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    void loadSubmissions()
  }, [token])

  const hasActiveFilters = !isDefaultAdminQueueView({
    query,
    statusFilter,
    countryFilter,
    languageFilter,
    duplicateFilter,
    reviewFilter,
    sort,
  })

  function resetFilters() {
    setQuery('')
    setStatusFilter(ADMIN_QUEUE_DEFAULT_STATUS_FILTER)
    setCountryFilter('')
    setLanguageFilter('all')
    setDuplicateFilter('all')
    setReviewFilter(ADMIN_QUEUE_DEFAULT_REVIEW_FILTER)
    setSort('review-priority')
  }

  function handleStatusFilterChange(value: AdminQueueStatusFilter) {
    setStatusFilter(value)
    if (value === 'all') {
      setReviewFilter('all')
      return
    }
    if (value === 'pending') {
      setReviewFilter('pending')
    }
  }

  function handleReviewFilterChange(value: AdminQueueReviewFilter) {
    setReviewFilter(value)
    if (value === 'all') {
      setStatusFilter('all')
      return
    }
    if (value === 'pending') {
      setStatusFilter('pending')
    }
  }

  const summaryCounts = useMemo(() => computeAdminQueueSummaryCounts(submissions), [submissions])
  const pendingTotalCount = useMemo(() => countPendingAdminSubmissions(submissions), [submissions])
  const countries = useMemo(() => getAdminQueueCountries(submissions), [submissions])
  const hasDuplicateRiskData = useMemo(() => hasAdminQueueDuplicateRiskData(submissions), [submissions])
  const duplicateFilterOptions = useMemo(() => {
    if (!hasDuplicateRiskData) {
      return []
    }

    const levels = getAdminQueueDuplicateLevels(submissions)
    return [
      { value: 'all' as const, label: 'All duplicate states' },
      { value: 'risk' as const, label: 'Has duplicate risk' },
      ...(levels.has('exact') ? [{ value: 'exact' as const, label: 'Exact duplicate' }] : []),
      ...(levels.has('similar') ? [{ value: 'similar' as const, label: 'Similar match' }] : []),
      ...(levels.has('none') ? [{ value: 'none' as const, label: 'No risk / checked clean' }] : []),
    ]
  }, [hasDuplicateRiskData, submissions])

  useEffect(() => {
    if (!hasDuplicateRiskData && duplicateFilter !== 'all') {
      setDuplicateFilter('all')
    }
    if (
      hasDuplicateRiskData &&
      duplicateFilter !== 'all' &&
      !duplicateFilterOptions.some((option) => option.value === duplicateFilter)
    ) {
      setDuplicateFilter('all')
    }
    if (!hasDuplicateRiskData && sort === 'duplicate-risk') {
      setSort('newest')
    }
  }, [duplicateFilter, duplicateFilterOptions, hasDuplicateRiskData, sort])

  const filteredSubmissions = useMemo(() => {
    const filtered = filterAdminQueueSubmissions(submissions, {
      query,
      statusFilter,
      countryFilter,
      languageFilter,
      duplicateFilter,
      reviewFilter,
    })

    return sortAdminQueueSubmissions(filtered, sort)
  }, [countryFilter, duplicateFilter, languageFilter, query, reviewFilter, sort, statusFilter, submissions])

  const selectedVisibleSubmissions = useMemo(
    () => filteredSubmissions.filter((submission) => selectedIds.has(submission.id)),
    [filteredSubmissions, selectedIds],
  )

  useEffect(() => {
    if (bulkSummary || isBulkProcessing) {
      return
    }

    const visibleIds = new Set(filteredSubmissions.map((submission) => submission.id))
    setSelectedIds((current) => {
      const next = new Set([...current].filter((id) => visibleIds.has(id)))
      return next.size === current.size ? current : next
    })
  }, [bulkSummary, filteredSubmissions, isBulkProcessing])

  const pendingSelectedCount = useMemo(
    () =>
      selectedVisibleSubmissions.filter(
        (submission) => selectedIds.has(submission.id) && isPendingAdminSubmission(submission),
      ).length,
    [selectedIds, selectedVisibleSubmissions],
  )

  function toggleRow(id: number) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleAll(ids: number[]) {
    setSelectedIds((current) => {
      const allSelected = ids.every((id) => current.has(id))
      if (allSelected) {
        return new Set()
      }
      return new Set(ids)
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  async function handleQuickApprove(submission: AdminSubmissionListItem) {
    if (!token) {
      setActionError('Your session has expired. Please sign in again.')
      return
    }

    setActionSubmissionId(submission.id)
    setActionError(null)
    setActionMessage(null)

    try {
      await approveAdminSubmission(submission.id, token)
      setActionMessage(`Approved “${submission.title}”.`)
      clearSelection()
      await loadSubmissions({ refresh: true })
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Unable to approve submission.')
    } finally {
      setActionSubmissionId(null)
    }
  }

  function openRejectDialog(id: number) {
    setRejectTargetId(id)
    setRejectReason('')
    setRejectError(null)
    setShowRejectDialog(true)
  }

  function closeRejectDialog() {
    if (actionSubmissionId !== null) {
      return
    }

    setShowRejectDialog(false)
    setRejectError(null)
  }

  async function handleRejectConfirm() {
    if (!token || rejectTargetId === null || !rejectReason.trim()) {
      return
    }

    setRejectError(null)
    setActionError(null)
    setActionMessage(null)
    setActionSubmissionId(rejectTargetId)

    try {
      await rejectAdminSubmission(rejectTargetId, rejectReason.trim(), token)
      setActionMessage('Submission rejected.')
      setShowRejectDialog(false)
      await loadSubmissions({ refresh: true })
    } catch (err) {
      setRejectError(err instanceof ApiError ? err.message : 'Unable to reject submission.')
    } finally {
      setActionSubmissionId(null)
    }
  }

  function openBulkDialog(mode: BulkActionMode) {
    setBulkDialogMode(mode)
    setBulkNote('')
    setBulkDialogError(null)
  }

  function closeBulkDialog() {
    if (isBulkProcessing) {
      return
    }

    setBulkDialogMode(null)
    setBulkDialogError(null)
  }

  function closeBulkSummary() {
    setBulkSummary(null)
    clearSelection()
  }

  async function handleBulkConfirm() {
    if (!token || !bulkDialogMode || selectedVisibleSubmissions.length === 0) {
      return
    }

    const note = bulkNote.trim()
    if ((bulkDialogMode === 'reject' || bulkDialogMode === 'revision') && !note) {
      setBulkDialogError(
        bulkDialogMode === 'reject' ? 'Rejection reason is required.' : 'Revision note is required.',
      )
      return
    }

    const targets = [...selectedVisibleSubmissions]
    setIsBulkProcessing(true)
    setActionError(null)
    setActionMessage(null)
    setBulkDialogError(null)
    setBulkProgress({ current: 0, total: targets.length })

    const failed: BulkActionFailure[] = []
    const skipped: BulkActionFailure[] = []
    let succeeded = 0

    for (const [index, submission] of targets.entries()) {
      setBulkProgress({ current: index + 1, total: targets.length })

      try {
        if (bulkDialogMode === 'approve') {
          await approveAdminSubmission(submission.id, token)
        } else if (bulkDialogMode === 'reject') {
          await rejectAdminSubmission(submission.id, note, token)
      } else {
          await requestAdminSubmissionRevision(submission.id, note, token)
        }
        succeeded += 1
      } catch (err) {
        failed.push({
          id: submission.id,
          title: submission.title,
          message: err instanceof ApiError ? err.message : 'Action failed.',
        })
      }
    }

    try {
      await loadSubmissions({ refresh: true })
    } finally {
      setIsBulkProcessing(false)
      setBulkProgress(null)
      setBulkDialogMode(null)
      setBulkSummary({
        mode: bulkDialogMode,
        total: targets.length,
        succeeded,
        failed,
        skipped,
      })
    }
  }

  const bulkProgressText = bulkProgress
    ? `Processing ${bulkProgress.current} of ${bulkProgress.total}`
    : null

  const bulkDialogTitle =
    bulkDialogMode === 'approve'
      ? 'Approve selected submissions?'
      : bulkDialogMode === 'revision'
        ? 'Request revision for selected submissions'
        : 'Reject selected submissions'

  const bulkDialogDescription =
    bulkDialogMode === 'approve'
      ? 'This will approve all selected submissions that pass validation.'
      : bulkDialogMode === 'revision'
        ? 'Add one revision note for all selected submissions.'
        : 'Add one rejection reason for all selected submissions.'

  const bulkConfirmLabel =
    bulkDialogMode === 'approve'
      ? 'Approve selected'
      : bulkDialogMode === 'revision'
        ? 'Request revision'
        : 'Reject selected'

  const bulkSummaryTitle =
    bulkSummary?.mode === 'approve'
      ? 'Bulk approval complete'
      : bulkSummary?.mode === 'revision'
        ? 'Bulk revision request complete'
        : 'Bulk rejection complete'

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-5">
      <Card className="!overflow-hidden !p-0">
        <div className="border-b border-border/60 bg-gradient-to-br from-white to-page/80 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                {t('admin.workspaceLabel')}
              </p>
              <h1 className="mt-1 font-serif text-2xl font-semibold text-navy sm:text-3xl">
                {t('admin.queueTitle')}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-navy-muted">{t('admin.queueSubtitle')}</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={isLoading || isRefreshing}
              onClick={() => void loadSubmissions({ refresh: true })}
              className="!min-h-10 shrink-0"
            >
              <RefreshCw
                className={['mr-2 h-4 w-4', isRefreshing ? 'animate-spin' : ''].filter(Boolean).join(' ')}
                aria-hidden
              />
              {isRefreshing ? t('admin.refreshing') : t('admin.refreshQueue')}
            </Button>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <AdminQueueFilterCards
            summary={summaryCounts}
            activeFilter={statusFilter}
            activeReviewFilter={reviewFilter}
            onFilterChange={handleStatusFilterChange}
            onReviewFilterChange={handleReviewFilterChange}
          />
        </div>
      </Card>

      {notice ? (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          {notice}
        </div>
      ) : null}

      {actionMessage ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {actionMessage}
        </div>
      ) : null}

      {actionError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {actionError}
        </div>
      ) : null}

      <div className="sticky top-3 z-20">
        <AdminQueueToolbar
          query={query}
          onQueryChange={setQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={(value) => handleStatusFilterChange(value as AdminQueueStatusFilter)}
          countryFilter={countryFilter}
          onCountryFilterChange={setCountryFilter}
          languageFilter={languageFilter}
          onLanguageFilterChange={setLanguageFilter}
          duplicateFilter={duplicateFilter}
          onDuplicateFilterChange={hasDuplicateRiskData ? setDuplicateFilter : undefined}
          duplicateFilterOptions={duplicateFilterOptions}
          reviewFilter={reviewFilter}
          onReviewFilterChange={handleReviewFilterChange}
          pendingTotalCount={pendingTotalCount}
          sort={sort}
          onSortChange={setSort}
          countries={countries}
          statusOptions={STATUS_DROPDOWN_OPTIONS}
          totalCount={submissions.length}
          filteredCount={filteredSubmissions.length}
          hasActiveFilters={hasActiveFilters}
          onReset={resetFilters}
        />
      </div>

      <AdminQueueBulkBar
        selectedCount={selectedVisibleSubmissions.length}
        pendingSelectedCount={pendingSelectedCount}
        isProcessing={isBulkProcessing}
        progressText={bulkProgressText}
        onApprove={() => openBulkDialog('approve')}
        onRequestRevision={() => openBulkDialog('revision')}
        onReject={() => openBulkDialog('reject')}
        onClear={clearSelection}
      />

      {error ? (
        <Card className="!p-5">
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
          <Button type="button" variant="secondary" className="mt-4" onClick={() => void loadSubmissions()}>
            Try again
          </Button>
        </Card>
      ) : null}

      {isLoading ? <AdminQueueTableSkeleton /> : null}

      {!isLoading && !error ? (
        <>
          <AdminSubmissionQueueTable
            submissions={filteredSubmissions}
            selectedIds={selectedIds}
            onToggleRow={toggleRow}
            onToggleAll={toggleAll}
            onQuickApprove={(submission) => void handleQuickApprove(submission)}
            onQuickReject={(submission) => openRejectDialog(submission.id)}
            actionSubmissionId={actionSubmissionId}
            emptyMessage={t('admin.noResults')}
          />
          <AdminSubmissionQueueMobileCards
            submissions={filteredSubmissions}
            selectedIds={selectedIds}
            onToggleRow={toggleRow}
            onQuickApprove={(submission) => void handleQuickApprove(submission)}
            onQuickReject={(submission) => openRejectDialog(submission.id)}
            actionSubmissionId={actionSubmissionId}
            emptyMessage={t('admin.noResults')}
          />
        </>
      ) : null}

      <AdminRejectDialog
        open={showRejectDialog}
        reason={rejectReason}
        isSubmitting={isBulkProcessing || actionSubmissionId !== null}
        error={rejectError}
        onReasonChange={setRejectReason}
        onCancel={closeRejectDialog}
        onConfirm={() => void handleRejectConfirm()}
      />

      {bulkDialogMode ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-navy/40 p-4 sm:items-center"
          role="presentation"
          onClick={closeBulkDialog}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-admin-action-title"
            className="w-full max-w-lg rounded-2xl border border-border/70 bg-white p-5 shadow-[var(--shadow-card)] sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="bulk-admin-action-title" className="font-serif text-xl font-semibold text-navy">
              {bulkDialogTitle}
            </h2>
            <p className="mt-2 text-sm text-navy-muted">{bulkDialogDescription}</p>
            <p className="mt-3 rounded-xl border border-border/60 bg-page px-3 py-2 text-sm font-medium text-navy">
              {selectedVisibleSubmissions.length} selected
            </p>

            {bulkDialogMode !== 'approve' ? (
              <div className="mt-4">
                <TextAreaField
                  label={bulkDialogMode === 'revision' ? 'Revision note' : 'Rejection reason'}
                  name={bulkDialogMode === 'revision' ? 'revision_note' : 'rejection_reason'}
                  value={bulkNote}
                  onChange={(event) => setBulkNote(event.target.value)}
                  rows={4}
                  disabled={isBulkProcessing}
                  required
                />
              </div>
            ) : null}

            {bulkDialogError ? (
              <div
                role="alert"
                className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {bulkDialogError}
              </div>
            ) : null}

            {bulkProgressText ? (
              <p className="mt-3 text-sm font-medium text-primary" role="status">
                {bulkProgressText}
              </p>
            ) : null}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={closeBulkDialog} disabled={isBulkProcessing}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleBulkConfirm()}
                disabled={
                  isBulkProcessing ||
                  selectedVisibleSubmissions.length === 0 ||
                  (bulkDialogMode !== 'approve' && !bulkNote.trim())
                }
                className={bulkDialogMode === 'approve' ? undefined : '!bg-red-700 hover:!bg-red-800'}
              >
                {isBulkProcessing ? 'Processing…' : bulkConfirmLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {bulkSummary ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-navy/40 p-4 sm:items-center"
          role="presentation"
          onClick={closeBulkSummary}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-admin-summary-title"
            className="w-full max-w-2xl rounded-2xl border border-border/70 bg-white p-5 shadow-[var(--shadow-card)] sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="bulk-admin-summary-title" className="font-serif text-xl font-semibold text-navy">
              {bulkSummaryTitle}
            </h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-border/60 bg-page px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-muted">Successful</p>
                <p className="font-serif text-2xl font-semibold text-primary">{bulkSummary.succeeded}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-page px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-muted">Failed</p>
                <p className="font-serif text-2xl font-semibold text-red-700">{bulkSummary.failed.length}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-page px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-muted">Skipped</p>
                <p className="font-serif text-2xl font-semibold text-navy">{bulkSummary.skipped.length}</p>
              </div>
            </div>

            {bulkSummary.failed.length > 0 ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-semibold text-red-800">Failed rows</p>
                <ul className="mt-2 max-h-56 space-y-2 overflow-auto">
                  {bulkSummary.failed.map((failure) => (
                    <li key={failure.id} className="rounded-lg bg-white px-3 py-2 text-sm">
                      <p className="font-medium text-navy">
                        #{failure.id} · {failure.title}
                      </p>
                      <p className="mt-0.5 text-xs text-red-700">{failure.message}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-5 flex justify-end">
              <Button type="button" onClick={closeBulkSummary}>
                Close summary
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
