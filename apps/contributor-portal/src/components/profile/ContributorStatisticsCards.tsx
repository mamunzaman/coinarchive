import { useTranslation } from 'react-i18next'
import type { ContributorStatistics } from '../../lib/contributorStats'

type ContributorStatisticsCardsProps = {
  stats: ContributorStatistics
  isLoading?: boolean
}

const items = [
  { key: 'submitted', labelKey: 'coinsSubmitted' },
  { key: 'approved', labelKey: 'approved' },
  { key: 'pending', labelKey: 'pending' },
  { key: 'needsRevision', labelKey: 'needsRevision' },
  { key: 'rejected', labelKey: 'rejected' },
  { key: 'approvalRate', labelKey: 'approvalRate', suffix: '%' },
] as const

export function ContributorStatisticsCards({
  stats,
  isLoading = false,
}: ContributorStatisticsCardsProps) {
  const { t } = useTranslation()

  return (
    <div>
      <h2 className="font-serif text-lg font-semibold text-navy">{t('widgets.contributorStatistics')}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.key}
            className="rounded-xl border border-border/70 bg-white px-4 py-4 shadow-[var(--shadow-card)]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-muted">
              {t(item.labelKey === 'needsRevision' ? 'detail.needsRevision' : `widgets.${item.labelKey}`)}
            </p>
            {isLoading ? (
              <div className="mt-2 h-8 w-16 animate-pulse rounded-lg bg-panel" aria-hidden />
            ) : (
              <p className="mt-1 font-serif text-2xl font-semibold text-navy">
                {stats[item.key]}
                {'suffix' in item ? item.suffix : ''}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
