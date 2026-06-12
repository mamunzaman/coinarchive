import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminStatCards } from '../../components/admin/AdminStatCards'
import { AdminSubmissionQueueTable } from '../../components/admin/AdminSubmissionQueueTable'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { RoleBadge } from '../../components/ui/RoleBadge'
import {
  formatAdminEndpointError,
  getAdminDashboardStats,
  getAdminSubmissions,
  getPendingAdminSubmissions,
  sortAdminSubmissionsByUpdated,
  type AdminDashboardStats,
  type AdminSubmissionListItem,
} from '../../lib/adminApi'
import { ApiError } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'

const EMPTY_STATS: AdminDashboardStats = {
  pending: 0,
  approved: 0,
  rejected: 0,
  contributors: 0,
}

export function AdminDashboardPage() {
  const { user, token } = useAuth()
  const [submissions, setSubmissions] = useState<AdminSubmissionListItem[]>([])
  const [stats, setStats] = useState<AdminDashboardStats>(EMPTY_STATS)
  const [isLoading, setIsLoading] = useState(true)
  const [errors, setErrors] = useState<string[]>([])
  const [notices, setNotices] = useState<string[]>([])

  async function loadDashboard() {
    setIsLoading(true)
    setErrors([])
    setNotices([])

    const activeToken = token
    if (!activeToken) {
      setErrors(['Your session has expired. Please sign in again.'])
      setIsLoading(false)
      return
    }

    const nextErrors: string[] = []
    const nextNotices: string[] = []

    try {
      const statsResult = await getAdminDashboardStats(activeToken)
      setStats(statsResult.stats)

      if (statsResult.meta.usedDevFallback) {
        nextNotices.push(formatAdminEndpointError('/admin/stats', new ApiError('', 404)))
      }
    } catch (err) {
      if (err instanceof ApiError) {
        nextErrors.push(formatAdminEndpointError('/admin/stats', err))
      } else {
        nextErrors.push('Unable to load admin stats. Check your connection and try again.')
      }
    }

    try {
      const submissionsResult = await getAdminSubmissions(activeToken)
      setSubmissions(submissionsResult.response.submissions)

      if (submissionsResult.meta.usedDevFallback) {
        nextNotices.push(formatAdminEndpointError('/admin/submissions', new ApiError('', 404)))
      }
    } catch (err) {
      if (err instanceof ApiError) {
        nextErrors.push(formatAdminEndpointError('/admin/submissions', err))
      } else {
        nextErrors.push('Unable to load admin submissions. Check your connection and try again.')
      }
    }

    setErrors(nextErrors)
    setNotices(nextNotices)
    setIsLoading(false)
  }

  useEffect(() => {
    void loadDashboard()
  }, [token])

  const queuePreview = useMemo(
    () => getPendingAdminSubmissions(submissions, 8),
    [submissions],
  )

  const recentSubmissions = useMemo(
    () => sortAdminSubmissionsByUpdated(submissions).slice(0, 8),
    [submissions],
  )

  const tableRows = queuePreview.length > 0 ? queuePreview : recentSubmissions

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6">
      <Card className="!p-5 sm:!p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Administration
            </p>
            <h1 className="mt-1 font-serif text-2xl font-semibold text-navy sm:text-3xl">
              Admin Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-navy-muted">
              Review contributor submissions, monitor catalogue activity, and manage approvals.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RoleBadge role="admin" />
            {user?.display_name ? (
              <span className="text-sm text-navy-muted">{user.display_name}</span>
            ) : null}
          </div>
        </div>
      </Card>

      {notices.map((notice) => (
        <div
          key={notice}
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          {notice}
        </div>
      ))}

      {errors.map((message) => (
        <Card key={message} className="!p-5">
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {message}
          </div>
          <Button type="button" variant="secondary" className="mt-4" onClick={() => void loadDashboard()}>
            Try again
          </Button>
        </Card>
      ))}

      <AdminStatCards stats={stats} isLoading={isLoading} />

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-serif text-xl font-semibold text-navy">Submission queue</h2>
            <p className="mt-1 text-sm text-navy-muted">
              {queuePreview.length > 0
                ? 'Pending items awaiting review.'
                : 'Recent submissions across the archive.'}
            </p>
          </div>
          <Link to="/admin/submissions">
            <Button type="button" variant="secondary">
              View all submissions
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-border/70 bg-surface px-6 py-12 text-center shadow-[var(--shadow-card)]">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            <p className="mt-3 text-sm text-navy-muted">Loading queue…</p>
          </div>
        ) : (
          <AdminSubmissionQueueTable submissions={tableRows} readOnly variant="preview" />
        )}
      </section>
    </div>
  )
}
