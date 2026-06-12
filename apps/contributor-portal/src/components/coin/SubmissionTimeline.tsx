import { CheckCircle2, Circle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TimelineEvent } from '../../lib/submissionTimeline'
import { DetailSectionCard } from './SubmissionDetailCard'

const COMPACT_TIMELINE_LIMIT = 5

type SubmissionTimelineProps = {
  events: TimelineEvent[]
  compact?: boolean
  bare?: boolean
}

export function SubmissionTimeline({ events, compact = false, bare = false }: SubmissionTimelineProps) {
  const { t } = useTranslation()

  if (events.length === 0) {
    return null
  }

  const visibleEvents = compact ? events.slice(0, COMPACT_TIMELINE_LIMIT) : events

  const body = (
    <>
      <ol className="space-y-0">
        {visibleEvents.map((event, index) => (
          <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
            {index < visibleEvents.length - 1 ? (
              <span
                className="absolute left-[10px] top-5 h-[calc(100%-0.25rem)] w-px bg-border/70"
                aria-hidden
              />
            ) : null}
            <span className="relative z-10 mt-0.5 shrink-0">
              {event.completed ? (
                <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
              ) : (
                <Circle className="h-5 w-5 text-navy-muted/40" aria-hidden />
              )}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-medium text-navy">{event.label}</p>
              <p className="mt-0.5 text-xs text-navy-muted">{event.formattedDate}</p>
            </div>
          </li>
        ))}
      </ol>
      {compact && events.length > COMPACT_TIMELINE_LIMIT ? (
        <p className="mt-3 border-t border-border/50 pt-3 text-xs text-navy-muted">
          {t('detail.timelineShowing', { shown: COMPACT_TIMELINE_LIMIT, total: events.length })}
        </p>
      ) : null}
    </>
  )

  if (bare) {
    return body
  }

  return (
    <DetailSectionCard title={t('detail.submissionTimeline')} subtitle={t('detail.timelineSubtitle')}>
      {body}
    </DetailSectionCard>
  )
}
