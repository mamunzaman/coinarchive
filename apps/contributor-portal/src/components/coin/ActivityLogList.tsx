import { useTranslation } from 'react-i18next'
import type { SubmissionActivityLog } from '../../lib/api'
import {
  formatActivityDate,
  getActivityActor,
  getActivityEventIcon,
} from '../../lib/submissionActivityUtils'

type ActivityLogListProps = {
  logs: SubmissionActivityLog[]
  compact?: boolean
}

export function ActivityLogList({ logs, compact = false }: ActivityLogListProps) {
  const { t } = useTranslation()

  if (logs.length === 0) {
    return <p className="text-sm text-navy-muted">{t('detail.activityEmpty')}</p>
  }

  return (
    <ol className="space-y-0">
      {logs.map((log, index) => {
        const Icon = getActivityEventIcon(log.event_type)
        const actor = getActivityActor(log)
        const message = log.event_message?.trim()

        return (
          <li key={log.id} className={['relative flex gap-3 last:pb-0', compact ? 'pb-3' : 'pb-5'].join(' ')}>
            {index < logs.length - 1 ? (
              <span
                className={[
                  'absolute w-px bg-border',
                  compact ? 'left-[11px] top-6 h-[calc(100%-0.5rem)]' : 'left-[13px] top-7 h-[calc(100%-0.75rem)]',
                ].join(' ')}
                aria-hidden
              />
            ) : null}
            <span
              className={[
                'relative z-10 mt-0.5 flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15',
                compact ? 'h-6 w-6' : 'h-7 w-7',
              ].join(' ')}
            >
              <Icon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className={['font-semibold text-navy', compact ? 'text-xs' : 'text-sm'].join(' ')}>
                {log.event_label}
              </p>
              {message ? (
                <p className={['mt-0.5 text-navy-muted', compact ? 'text-xs' : 'text-sm'].join(' ')}>
                  {message}
                </p>
              ) : null}
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-navy-muted">
                <time dateTime={log.created_at}>{formatActivityDate(log.created_at)}</time>
                {actor ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>{actor}</span>
                  </>
                ) : null}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
