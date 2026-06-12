import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '../ui/Card'
import type { QualityAlert } from '../../lib/qualityAlerts'

const MAX_VISIBLE_GROUPS = 4

type DashboardQualityAlertsProps = {
  alerts: QualityAlert[]
  isLoading?: boolean
}

type AlertGroup = {
  id: string
  title: string
  href: string
  severity: QualityAlert['severity']
  messages: string[]
}

function groupAlerts(alerts: QualityAlert[]): AlertGroup[] {
  const groups = new Map<string, AlertGroup>()

  for (const alert of alerts) {
    const key = alert.submissionId ? `submission-${alert.submissionId}` : alert.draftKey ?? alert.id
    const existing = groups.get(key)

    if (existing) {
      existing.messages.push(alert.message)
      if (alert.severity === 'critical') {
        existing.severity = 'critical'
      }
      continue
    }

    groups.set(key, {
      id: key,
      title: alert.title,
      href: alert.href,
      severity: alert.severity,
      messages: [alert.message],
    })
  }

  return [...groups.values()]
}

export function DashboardQualityAlerts({ alerts, isLoading = false }: DashboardQualityAlertsProps) {
  const { t } = useTranslation()

  if (!isLoading && alerts.length === 0) {
    return null
  }

  const groups = groupAlerts(alerts)
  const visibleGroups = groups.slice(0, MAX_VISIBLE_GROUPS)
  const hasMoreAlerts = groups.length > MAX_VISIBLE_GROUPS

  return (
    <Card className="!p-4 sm:!p-5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
        <h2 className="font-serif text-base font-semibold text-navy sm:text-lg">
          {t('dashboard.quality.title')}
        </h2>
      </div>
      <p className="mt-1 text-sm text-navy-muted">
        {t('dashboard.quality.subtitle')}
      </p>

      {isLoading ? (
        <div className="mt-4 space-y-2">
          {[1, 2].map((row) => (
            <div key={row} className="h-14 animate-pulse rounded-lg bg-panel" />
          ))}
        </div>
      ) : (
        <>
          <ul className="mt-4 space-y-2.5">
            {visibleGroups.map((group) => (
              <li
                key={group.id}
                className={[
                  'rounded-xl border px-3 py-3',
                  group.severity === 'critical'
                    ? 'border-red-200 bg-red-50/70'
                    : 'border-amber-200 bg-amber-50/70',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-semibold text-navy">{group.title}</p>
                    <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-navy-muted">
                      {t('dashboard.quality.issues', { count: group.messages.length })}
                    </p>
                  </div>
                  <Link
                    to={group.href}
                    className="inline-flex min-h-8 shrink-0 items-center rounded-lg bg-white px-3 text-xs font-semibold text-primary ring-1 ring-border transition-colors hover:bg-primary hover:text-white"
                  >
                    {t('dashboard.quality.continue')}
                  </Link>
                </div>
                <ul className="mt-2 space-y-1">
                  {group.messages.slice(0, 2).map((message) => (
                    <li key={message} className="text-xs text-navy-muted">
                      {message}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          {hasMoreAlerts ? (
            <Link
              to="/my-submissions"
              className="mt-3 inline-flex text-xs font-semibold text-primary transition-colors hover:text-primary-hover"
            >
              {t('dashboard.quality.viewAll', { count: groups.length })}
            </Link>
          ) : null}
        </>
      )}
    </Card>
  )
}
