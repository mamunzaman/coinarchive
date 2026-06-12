import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DeleteSubmissionConfirmDialog } from '../components/submissions/DeleteSubmissionConfirmDialog'
import { ICON_ACTION } from '../components/ui/ActionControls'
import { SubmissionGalleryCard } from '../components/submissions/SubmissionGalleryCard'
import { SubmissionTableView } from '../components/submissions/SubmissionTableView'
import { SubmissionsToolbar } from '../components/submissions/SubmissionsToolbar'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useAuth } from '../hooks/useAuth'
import { ApiError, deleteMySubmission, getMySubmissions, type CoinSubmission } from '../lib/api'
import {
  filterAndSortSubmissions,
  type SubmissionSortOption,
  type SubmissionStatusFilter,
  type SubmissionViewMode,
} from '../lib/submissionListUtils'

export function MySubmissionsPage() {
  const { t } = useTranslation()
  const { token } = useAuth()
  const location = useLocation()
  const [submissions, setSubmissions] = useState<CoinSubmission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<CoinSubmission | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<SubmissionStatusFilter>('all')
  const [sort, setSort] = useState<SubmissionSortOption>('recent')
  const [viewMode, setViewMode] = useState<SubmissionViewMode>('gallery')

  async function loadSubmissions() {
    setIsLoading(true)
    setError(null)

    if (!token) {
      setError(t('dashboard.sessionExpired'))
      setIsLoading(false)
      return
    }

    try {
      const response = await getMySubmissions(token)
      setSubmissions(response.submissions ?? [])
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError(t('dashboard.loadFailed'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadSubmissions()
  }, [token])

  useEffect(() => {
    const message = (location.state as { successMessage?: string } | null)?.successMessage
    if (message) {
      setSuccessMessage(message)
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  function requestDelete(submission: CoinSubmission) {
    setDeleteError(null)
    setPendingDelete(submission)
  }

  function closeDeleteDialog() {
    if (isDeleting) {
      return
    }
    setDeleteError(null)
    setPendingDelete(null)
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return
    }

    if (!token) {
      setDeleteError(t('dashboard.sessionExpired'))
      return
    }

    setIsDeleting(true)
    setDeleteError(null)

    try {
      await deleteMySubmission(pendingDelete.id, token)
      setSubmissions((current) => current.filter((item) => item.id !== pendingDelete.id))
      setSuccessMessage(t('submissions.deletedSuccess'))
      setPendingDelete(null)
    } catch (err) {
      if (err instanceof ApiError) {
        setDeleteError(err.message)
      } else {
        setDeleteError(t('submissions.deleteFailed'))
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredSubmissions = useMemo(
    () => filterAndSortSubmissions(submissions, { query, statusFilter, sort }),
    [submissions, query, statusFilter, sort],
  )

  const hasActiveFilters =
    query.trim().length > 0 || statusFilter !== 'all' || sort !== 'recent'

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="section-label">{t('common.archive')}</p>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-navy sm:text-3xl">
            {t('submissions.title')}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-navy-muted">{t('submissions.subtitle')}</p>
        </div>
        <Link
          to="/new-coin"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover"
        >
          <Plus className={ICON_ACTION} aria-hidden />
          <span>{t('submissions.submitNewCoin')}</span>
        </Link>
      </div>

      {successMessage ? (
        <div
          role="status"
          className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary"
        >
          {successMessage}
        </div>
      ) : null}

      {isLoading ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            <p className="text-sm text-navy-muted">{t('submissions.loading')}</p>
          </div>
        </Card>
      ) : null}

      {!isLoading && error ? (
        <Card>
          <div className="flex flex-col gap-4 py-6 text-center">
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
            <Button type="button" variant="secondary" onClick={() => void loadSubmissions()}>
              {t('common.tryAgain')}
            </Button>
          </div>
        </Card>
      ) : null}

      {!isLoading && !error && submissions.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-6 px-4 py-14 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
              <span className="font-serif text-4xl text-primary">◎</span>
            </div>
            <div className="max-w-md space-y-2">
              <h2 className="font-serif text-2xl font-semibold text-navy">{t('submissions.emptyTitle')}</h2>
              <p className="text-sm leading-relaxed text-navy-muted">{t('submissions.emptyBody')}</p>
            </div>
            <Link
              to="/new-coin"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              <Plus className={ICON_ACTION} aria-hidden />
              <span>{t('submissions.submitNewCoin')}</span>
            </Link>
          </div>
        </Card>
      ) : null}

      {!isLoading && !error && submissions.length > 0 ? (
        <>
          <SubmissionsToolbar
            query={query}
            statusFilter={statusFilter}
            sort={sort}
            viewMode={viewMode}
            resultCount={filteredSubmissions.length}
            totalCount={submissions.length}
            onQueryChange={setQuery}
            onStatusFilterChange={setStatusFilter}
            onSortChange={setSort}
            onViewModeChange={setViewMode}
          />

          {filteredSubmissions.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center gap-4 px-4 py-10 text-center">
                <h2 className="font-serif text-xl font-semibold text-navy">{t('submissions.noMatchesTitle')}</h2>
                <p className="max-w-md text-sm text-navy-muted">{t('submissions.noMatchesBody')}</p>
                {hasActiveFilters ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setQuery('')
                      setStatusFilter('all')
                      setSort('recent')
                    }}
                  >
                    {t('submissions.clearFilters')}
                  </Button>
                ) : null}
              </div>
            </Card>
          ) : viewMode === 'gallery' ? (
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr))]">
              {filteredSubmissions.map((submission) => (
                <SubmissionGalleryCard
                  key={submission.id}
                  submission={submission}
                  onDelete={requestDelete}
                />
              ))}
            </div>
          ) : (
            <SubmissionTableView submissions={filteredSubmissions} onDelete={requestDelete} />
          )}
        </>
      ) : null}

      <DeleteSubmissionConfirmDialog
        open={Boolean(pendingDelete)}
        isDeleting={isDeleting}
        error={deleteError}
        submissionTitle={pendingDelete?.title ?? null}
        onCancel={closeDeleteDialog}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
