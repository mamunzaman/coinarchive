import { Activity, CheckCircle2, Clock3, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '../ui/Card'
import { StatusBadge } from '../ui/StatusBadge'
import type { ActivityFeedItem, ActivitySummary } from '../../lib/activityCenter'

type DashboardActivityCenterProps = {
  summary: ActivitySummary
  feed: ActivityFeedItem[]
  isLoading?: boolean
}

export function DashboardActivityCenter({
  summary,
  feed,
  isLoading = false,
}: DashboardActivityCenterProps) {
  const { t } = useTranslation()

  return (
    <Card className="!p-4 sm:!p-5">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="font-serif text-base font-semibold text-navy sm:text-lg">
          {t('dashboard.activity.title')}
        </h2>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryPill
          icon={Clock3}
          label={t('dashboard.activity.pendingReview')}
          value={summary.pendingReview}
          isLoading={isLoading}
        />
        <SummaryPill
          icon={AlertCircle}
          label={t('dashboard.activity.needsRevision')}
          value={summary.needsRevision}
          isLoading={isLoading}
        />
        <SummaryPill
          icon={CheckCircle2}
          label={t('dashboard.activity.approvedThisMonth')}
          value={summary.approvedThisMonth}
          isLoading={isLoading}
        />
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-navy-muted">
          {t('dashboard.activity.recent')}
        </p>
        {isLoading ? (
          <div className="mt-3 space-y-2">
            {[1, 2, 3].map((row) => (
              <div key={row} className="h-12 animate-pulse rounded-lg bg-panel" />
            ))}
          </div>
        ) : feed.length === 0 ? (
          <p className="mt-3 text-sm text-navy-muted">{t('dashboard.activity.noActivity')}</p>
        ) : (
          <ul className="mt-3 divide-y divide-border/60">
            {feed.map((item) => (
              <li key={item.id} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/my-submissions/${item.submissionId}`}
                    className="line-clamp-2 block text-sm font-medium leading-snug text-navy hover:text-primary sm:truncate"
                  >
                    {item.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-navy-muted">
                    {item.message} · {item.formattedDate}
                  </p>
                </div>
                <div className="shrink-0">
                  <StatusBadge status={item.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}

function SummaryPill({
  icon: Icon,
  label,
  value,
  isLoading,
}: {
  icon: typeof Clock3
  label: string
  value: number
  isLoading: boolean
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 px-2.5 py-2.5 sm:px-3">
      <div className="flex items-center gap-2 text-navy-muted">
        <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
        <p className="min-w-0 text-[11px] font-semibold uppercase tracking-wide sm:text-xs">{label}</p>
      </div>
      {isLoading ? (
        <div className="mt-2 h-7 w-10 animate-pulse rounded bg-panel" />
      ) : (
        <p className="mt-1 font-serif text-xl font-semibold text-navy">{value}</p>
      )}
    </div>
  )
}
