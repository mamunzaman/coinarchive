import { useTranslation } from 'react-i18next'
import { Card } from '../ui/Card'
import { getApprovalRate, type SubmissionStats } from '../../lib/submissionStats'

type DashboardStatCardsProps = {
  stats: SubmissionStats
  isLoading?: boolean
}

const statItems = [
  { key: 'total', labelKey: 'total' },
  { key: 'pending', labelKey: 'pending' },
  { key: 'published', labelKey: 'published' },
  { key: 'drafts', labelKey: 'drafts' },
] as const

export function DashboardStatCards({ stats, isLoading = false }: DashboardStatCardsProps) {
  const { t } = useTranslation()
  const approvalRate = getApprovalRate(stats)

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {statItems.map((item) => (
        <Card key={item.key} className="!p-4 sm:!p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-muted">
            {t(`dashboard.stats.${item.labelKey}`)}
          </p>
          {isLoading ? (
            <div className="mt-2 h-8 w-14 animate-pulse rounded-lg bg-panel" aria-hidden="true" />
          ) : (
            <p className="mt-1 font-serif text-2xl font-semibold text-navy sm:text-[1.75rem]">
              {stats[item.key]}
            </p>
          )}
        </Card>
      ))}
      <Card className="!p-4 sm:!p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-muted">
          {t('dashboard.stats.approvalRate')}
        </p>
        {isLoading ? (
          <div className="mt-2 h-8 w-14 animate-pulse rounded-lg bg-panel" aria-hidden="true" />
        ) : approvalRate === null ? (
          <p className="mt-2 text-sm leading-snug text-navy-muted">
            {t('dashboard.stats.approvalPending')}
          </p>
        ) : (
          <>
            <p className="mt-1 font-serif text-2xl font-semibold text-navy sm:text-[1.75rem]">
              {approvalRate}%
            </p>
            <p className="mt-1 text-xs text-navy-muted">
              {t('dashboard.stats.approvalSummary', {
                approved: stats.published,
                rejected: stats.rejected,
              })}
            </p>
          </>
        )}
      </Card>
    </div>
  )
}
