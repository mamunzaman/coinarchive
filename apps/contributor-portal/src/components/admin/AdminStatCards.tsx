import { Card } from '../ui/Card'
import type { AdminDashboardStats } from '../../lib/adminApi'

type AdminStatCardsProps = {
  stats: AdminDashboardStats
  isLoading?: boolean
}

const statItems = [
  { key: 'pending', label: 'Pending submissions', accent: 'border-amber-400/60' },
  { key: 'approved', label: 'Approved coins', accent: 'border-emerald-400/60' },
  { key: 'rejected', label: 'Rejected submissions', accent: 'border-red-300/70' },
  { key: 'contributors', label: 'Contributors', accent: 'border-primary/40' },
] as const

export function AdminStatCards({ stats, isLoading = false }: AdminStatCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {statItems.map((item) => (
        <Card
          key={item.key}
          className={['!p-4 sm:!p-5', 'border-l-[3px]', item.accent].join(' ')}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-muted">
            {item.label}
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
    </div>
  )
}
