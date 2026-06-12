import { useEffect, useMemo, useState } from 'react'
import { LayoutList, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DashboardActivityCenter } from '../components/dashboard/DashboardActivityCenter'
import { DashboardQualityAlerts } from '../components/dashboard/DashboardQualityAlerts'
import { DashboardSavedDrafts } from '../components/dashboard/DashboardSavedDrafts'
import { DashboardContributorTips } from '../components/dashboard/DashboardContributorTips'
import {
  DashboardNotificationBell,
  DashboardNotificationCenter,
} from '../components/dashboard/DashboardNotificationCenter'
import { DashboardQuickActions } from '../components/dashboard/DashboardQuickActions'
import { DashboardRecentSubmissions } from '../components/dashboard/DashboardRecentSubmissions'
import { DeleteSubmissionConfirmDialog } from '../components/submissions/DeleteSubmissionConfirmDialog'
import { DashboardStatCards } from '../components/dashboard/DashboardStatCards'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ICON_ACTION } from '../components/ui/ActionControls'
import { RoleBadge } from '../components/ui/RoleBadge'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ApiError, deleteMySubmission, getMySubmissions, type CoinSubmission } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import {
  computeSubmissionStats,
  getRecentSubmissions,
} from '../lib/submissionStats'
import { buildActivityFeed, computeActivitySummary } from '../lib/activityCenter'
import { buildQualityAlerts } from '../lib/qualityAlerts'
import { computeSubmissionListCompleteness } from '../lib/completenessScore'
import {
  clearFormDraft,
  listSavedDrafts,
  type DraftIndexEntry,
} from '../lib/formDraftStorage'
import {
  buildContributorNotifications,
  readStoredNotificationIds,
  writeStoredNotificationIds,
} from '../lib/notifications'

type PendingDraftDelete =
  | { type: 'local'; draft: DraftIndexEntry }
  | { type: 'api'; submission: CoinSubmission }

function RecentSubmissionsSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="space-y-4">
        {[1, 2, 3].map((row) => (
          <div key={row} className="flex items-center gap-4">
            <div className="h-[4.5rem] w-[4.5rem] animate-pulse rounded-lg bg-panel" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 animate-pulse rounded bg-panel" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-panel" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptySubmissionsCard() {
  const { t } = useTranslation()

  return (
    <Card className="!p-6 text-center sm:!p-8">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <span className="font-serif text-2xl text-primary">◎</span>
        </div>
        <div className="space-y-1">
          <h2 className="font-serif text-lg font-semibold text-navy">{t('dashboard.noSubmissionsTitle')}</h2>
          <p className="text-sm text-navy-muted">{t('dashboard.noSubmissionsBody')}</p>
        </div>
        <Link
          to="/new-coin"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className={ICON_ACTION} aria-hidden />
          <span>{t('dashboard.submitNewCoin')}</span>
        </Link>
      </div>
    </Card>
  )
}

export function DashboardPage() {
  const { t } = useTranslation()
  const { user, token } = useAuth()
  const role = user?.role === 'admin' ? 'admin' : 'contributor'

  const [submissions, setSubmissions] = useState<CoinSubmission[]>([])
  const [savedDrafts, setSavedDrafts] = useState<DraftIndexEntry[]>(() => listSavedDrafts())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingDraftDelete, setPendingDraftDelete] = useState<PendingDraftDelete | null>(null)
  const [isDeletingDraft, setIsDeletingDraft] = useState(false)
  const [draftDeleteError, setDraftDeleteError] = useState<string | null>(null)
  const [pendingSubmissionDelete, setPendingSubmissionDelete] = useState<CoinSubmission | null>(null)
  const [isDeletingSubmission, setIsDeletingSubmission] = useState(false)
  const [submissionDeleteError, setSubmissionDeleteError] = useState<string | null>(null)
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(
    () => new Set(readStoredNotificationIds()),
  )

  async function loadSubmissions() {
    setIsLoading(true)
    setError(null)

    const activeToken = token
    if (!activeToken) {
      setError(t('dashboard.sessionExpired'))
      setIsLoading(false)
      return
    }

    try {
      const response = await getMySubmissions(activeToken)
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

  const stats = useMemo(() => {
    const baseStats = computeSubmissionStats(submissions)
    return {
      ...baseStats,
      drafts: baseStats.drafts + savedDrafts.length,
    }
  }, [savedDrafts.length, submissions])
  const recentSubmissions = useMemo(() => getRecentSubmissions(submissions, 5), [submissions])
  const apiDraftSubmissions = useMemo(
    () => submissions.filter((submission) => submission.status === 'draft'),
    [submissions],
  )
  const activitySummary = useMemo(() => computeActivitySummary(submissions), [submissions])
  const activityFeed = useMemo(() => buildActivityFeed(submissions), [submissions])
  const qualityAlerts = useMemo(() => buildQualityAlerts(submissions), [savedDrafts, submissions])
  const notifications = useMemo(
    () => buildContributorNotifications(submissions, savedDrafts),
    [savedDrafts, submissions],
  )

  useEffect(() => {
    writeStoredNotificationIds([...readNotificationIds])
  }, [readNotificationIds])

  function markNotificationRead(id: string) {
    setReadNotificationIds((current) => {
      const next = new Set(current)
      next.add(id)
      return next
    })
  }

  function markAllNotificationsRead() {
    setReadNotificationIds(new Set(notifications.map((notification) => notification.id)))
  }
  const recentCompletenessById = useMemo(() => {
    const map = new Map<number, ReturnType<typeof computeSubmissionListCompleteness>>()

    for (const submission of recentSubmissions) {
      map.set(submission.id, computeSubmissionListCompleteness(submission))
    }

    return map
  }, [recentSubmissions])

  const draftApiSubmissions = error ? [] : apiDraftSubmissions
  const latestDraftHref = useMemo(() => {
    const latestLocalDraft = savedDrafts[0]
    if (latestLocalDraft) {
      return latestLocalDraft.kind === 'new'
        ? '/new-coin'
        : `/my-submissions/${latestLocalDraft.submissionId}/edit`
    }

    const latestApiDraft = apiDraftSubmissions[0]
    return latestApiDraft ? `/my-submissions/${latestApiDraft.id}/edit` : null
  }, [apiDraftSubmissions, savedDrafts])

  function requestDeleteRecentSubmission(submission: CoinSubmission) {
    setSubmissionDeleteError(null)
    setPendingSubmissionDelete(submission)
  }

  function closeSubmissionDeleteDialog() {
    if (isDeletingSubmission) {
      return
    }
    setSubmissionDeleteError(null)
    setPendingSubmissionDelete(null)
  }

  async function confirmSubmissionDelete() {
    if (!pendingSubmissionDelete || !token) {
      return
    }

    setIsDeletingSubmission(true)
    setSubmissionDeleteError(null)

    try {
      await deleteMySubmission(pendingSubmissionDelete.id, token)
      setSubmissions((current) =>
        current.filter((item) => item.id !== pendingSubmissionDelete.id),
      )
      setPendingSubmissionDelete(null)
    } catch (err) {
      setSubmissionDeleteError(
        err instanceof ApiError ? err.message : t('submissions.deleteFailed'),
      )
    } finally {
      setIsDeletingSubmission(false)
    }
  }

  function requestDeleteLocalDraft(draft: DraftIndexEntry) {
    setDraftDeleteError(null)
    setPendingDraftDelete({ type: 'local', draft })
  }

  function requestDeleteApiDraft(submission: CoinSubmission) {
    if (submission.status !== 'draft') {
      return
    }

    setDraftDeleteError(null)
    setPendingDraftDelete({ type: 'api', submission })
  }

  function closeDraftDeleteDialog() {
    if (isDeletingDraft) {
      return
    }

    setDraftDeleteError(null)
    setPendingDraftDelete(null)
  }

  async function confirmDraftDelete() {
    if (!pendingDraftDelete) {
      return
    }

    if (pendingDraftDelete.type === 'local') {
      clearFormDraft(pendingDraftDelete.draft.key)
      setSavedDrafts(listSavedDrafts())
      setPendingDraftDelete(null)
      setDraftDeleteError(null)
      return
    }

    if (!token) {
      setDraftDeleteError(t('dashboard.sessionExpired'))
      return
    }

    setIsDeletingDraft(true)
    setDraftDeleteError(null)

    try {
      await deleteMySubmission(pendingDraftDelete.submission.id, token)
      setSubmissions((current) =>
        current.filter((submission) => submission.id !== pendingDraftDelete.submission.id),
      )
      setPendingDraftDelete(null)
    } catch (err) {
      setDraftDeleteError(err instanceof ApiError ? err.message : t('common.deleteDraftFailed'))
    } finally {
      setIsDeletingDraft(false)
    }
  }

  function renderRecentSubmissions() {
    if (isLoading) {
      return <RecentSubmissionsSkeleton />
    }

    if (submissions.length === 0) {
      return <EmptySubmissionsCard />
    }

    return (
      <DashboardRecentSubmissions
        submissions={recentSubmissions}
        completenessById={recentCompletenessById}
        onDelete={requestDeleteRecentSubmission}
      />
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <Card className="!overflow-hidden !p-0">
        <div className="bg-gradient-to-br from-white via-page/70 to-primary/5 p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="section-label">{t('common.contributorWorkspace')}</span>
                <StatusBadge status={user.status} />
                <RoleBadge role={role} />
              </div>
              <h1 className="mt-3 font-serif text-2xl font-semibold text-navy sm:text-3xl">
                {t('dashboard.welcomeBack')}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-navy-muted sm:text-base">
                {t('dashboard.subtitle')}
              </p>
              <p className="mt-2 text-xs text-navy-muted">
                {t('dashboard.signedInAs', { name: user.display_name, email: user.email })}
              </p>
            </div>
            <div className="flex flex-col gap-2 lg:min-w-[25rem]">
              <div className="flex justify-end">
                <DashboardNotificationBell
                  notifications={notifications}
                  readIds={readNotificationIds}
                  onMarkRead={markNotificationRead}
                  onMarkAllRead={markAllNotificationsRead}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Link
                  to="/new-coin"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
                >
                  <Plus className={ICON_ACTION} aria-hidden />
                  <span>{t('dashboard.submitNewCoin')}</span>
                </Link>
                <Link
                  to="/my-submissions"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white px-5 py-3 text-sm font-semibold text-navy transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  <LayoutList className={ICON_ACTION} aria-hidden />
                  <span>{t('dashboard.viewMySubmissions')}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {error ? (
        <Card className="!p-4">
          <div className="flex flex-col gap-3 py-2 text-center">
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

      {!error ? <DashboardStatCards stats={stats} isLoading={isLoading} /> : null}

      {!error ? (
        <div className="mt-2 flex flex-col gap-5 lg:mt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            <DashboardActivityCenter
              summary={activitySummary}
              feed={activityFeed}
              isLoading={isLoading}
            />
          </div>

          <div className="min-w-0 lg:col-start-1 lg:row-start-2">
            <DashboardNotificationCenter
              notifications={notifications}
              readIds={readNotificationIds}
              isLoading={isLoading}
              onMarkRead={markNotificationRead}
              onMarkAllRead={markAllNotificationsRead}
            />
          </div>

          <div className="min-w-0 lg:col-start-1 lg:row-start-3">
            {renderRecentSubmissions()}
          </div>

          <aside className="flex w-full flex-col gap-5 lg:col-start-2 lg:row-start-1 lg:row-span-3 xl:sticky xl:top-20 xl:self-start">
            <DashboardQuickActions latestDraftHref={latestDraftHref} />
            <DashboardSavedDrafts
              localDrafts={savedDrafts}
              apiDraftSubmissions={draftApiSubmissions}
              pendingDeleteTitle={
                pendingDraftDelete?.type === 'local'
                  ? pendingDraftDelete.draft.title
                  : pendingDraftDelete?.submission.title ?? null
              }
              deleteError={draftDeleteError}
              isDeleting={isDeletingDraft}
              onRequestDeleteLocalDraft={requestDeleteLocalDraft}
              onRequestDeleteApiDraft={requestDeleteApiDraft}
              onCancelDelete={closeDraftDeleteDialog}
              onConfirmDelete={() => void confirmDraftDelete()}
            />
            <DashboardQualityAlerts alerts={qualityAlerts} isLoading={isLoading} />
          </aside>
        </div>
      ) : null}

      {!error ? <DashboardContributorTips /> : null}

      <DeleteSubmissionConfirmDialog
        open={Boolean(pendingSubmissionDelete)}
        isDeleting={isDeletingSubmission}
        error={submissionDeleteError}
        submissionTitle={pendingSubmissionDelete?.title ?? null}
        onCancel={closeSubmissionDeleteDialog}
        onConfirm={() => void confirmSubmissionDelete()}
      />
    </div>
  )
}
