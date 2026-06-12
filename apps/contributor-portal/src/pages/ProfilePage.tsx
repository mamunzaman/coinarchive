import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ContributorStatisticsCards } from '../components/profile/ContributorStatisticsCards'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { RoleBadge } from '../components/ui/RoleBadge'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ApiError, getMySubmissions } from '../lib/api'
import { computeContributorStatistics } from '../lib/contributorStats'
import { useAuth } from '../hooks/useAuth'

export function ProfilePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, token, logout } = useAuth()
  const role = user?.role === 'admin' ? 'admin' : 'contributor'
  const hasSession = Boolean(token && user)

  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<Awaited<
    ReturnType<typeof getMySubmissions>
  >['submissions']>([])

  useEffect(() => {
    async function loadStats() {
      setIsLoadingStats(true)
      setStatsError(null)

      const activeToken = token
      if (!activeToken) {
        setStatsError(t('dashboard.sessionExpired'))
        setIsLoadingStats(false)
        return
      }

      try {
        const response = await getMySubmissions(activeToken)
        setSubmissions(response.submissions ?? [])
      } catch (err) {
        if (err instanceof ApiError) {
          setStatsError(err.message)
        } else {
          setStatsError(t('profile.statsLoadFailed'))
        }
      } finally {
        setIsLoadingStats(false)
      }
    }

    void loadStats()
  }, [token, t])

  const contributorStats = useMemo(
    () => computeContributorStatistics(submissions),
    [submissions],
  )

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  if (!user) {
    return null
  }

  const permissions =
    role === 'admin'
      ? [
          t('profile.permAdminApprove'),
          t('profile.permAdminTools'),
          t('profile.permAdminSubmit'),
        ]
      : [t('profile.permContributorSubmit'), t('profile.permContributorDashboard')]

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <p className="section-label">{t('profile.sectionLabel')}</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-navy sm:text-3xl">{t('profile.title')}</h1>
        <p className="mt-2 text-sm text-navy-muted">{t('profile.subtitle')}</p>
      </div>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 font-serif text-xl font-semibold text-primary">
              {user.display_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-serif text-lg font-semibold text-navy">{user.display_name}</h2>
              <p className="mt-0.5 text-sm text-navy-muted">{user.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={user.status} />
            <RoleBadge role={role} />
          </div>
        </div>
      </Card>

      <Card>
        {statsError ? (
          <p role="alert" className="text-sm text-red-600">
            {statsError}
          </p>
        ) : (
          <ContributorStatisticsCards stats={contributorStats} isLoading={isLoadingStats} />
        )}
      </Card>

      <Card>
        <h2 className="font-serif text-lg font-semibold text-navy">{t('profile.accountInfo')}</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-navy-muted">
              {t('profile.displayName')}
            </dt>
            <dd className="mt-1 text-sm font-medium text-navy">{user.display_name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-navy-muted">{t('profile.email')}</dt>
            <dd className="mt-1 text-sm font-medium text-navy">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-navy-muted">{t('profile.status')}</dt>
            <dd className="mt-1">
              <StatusBadge status={user.status} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-navy-muted">{t('profile.role')}</dt>
            <dd className="mt-1">
              <RoleBadge role={role} />
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="font-serif text-lg font-semibold text-navy">{t('profile.permissions')}</h2>
        <ul className="mt-4 space-y-2">
          {permissions.map((permission) => (
            <li key={permission} className="flex items-start gap-2 text-sm text-navy-muted">
              <span className="mt-1 text-primary" aria-hidden="true">
                •
              </span>
              <span>{permission}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="font-serif text-lg font-semibold text-navy">{t('profile.sessionInfo')}</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-navy-muted">{t('profile.session')}</dt>
            <dd className="mt-1 text-sm font-medium text-navy">
              {hasSession ? t('profile.sessionActive') : t('profile.sessionInactive')}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-navy-muted">
              {t('profile.contributorId')}
            </dt>
            <dd className="mt-1 text-sm font-medium text-navy">{user.id}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="font-serif text-lg font-semibold text-navy">{t('profile.editingTitle')}</h2>
        <p className="mt-2 text-sm text-navy-muted">{t('profile.editingSoon')}</p>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-5 py-3 text-sm font-semibold text-navy transition-all duration-200 hover:border-navy/20 hover:bg-muted"
        >
          {t('profile.backToDashboard')}
        </Link>
        <Button type="button" variant="secondary" onClick={() => void handleLogout()}>
          {t('profile.logOut')}
        </Button>
      </div>
    </div>
  )
}
