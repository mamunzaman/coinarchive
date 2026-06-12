import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityLogList } from './ActivityLogList'
import { SubmissionActivityModal } from './SubmissionActivityModal'
import { Button } from '../ui/Button'
import { DetailSectionCard } from './SubmissionDetailCard'
import type { SubmissionActivityLogsPayload } from '../../lib/api'

const COMPACT_ACTIVITY_LIMIT = 5

type SubmissionActivityTimelineProps = {
  activityLogs: SubmissionActivityLogsPayload
  submissionId: number
  compact?: boolean
  bare?: boolean
}

export function SubmissionActivityTimeline({
  activityLogs,
  submissionId,
  compact = false,
  bare = false,
}: SubmissionActivityTimelineProps) {
  const { t } = useTranslation()
  const [showAllActivity, setShowAllActivity] = useState(false)
  const recent = activityLogs.recent ?? []
  const total = activityLogs.total ?? recent.length
  const visibleLogs = compact ? recent.slice(0, COMPACT_ACTIVITY_LIMIT) : recent

  const body = (
    <>
      <ActivityLogList logs={visibleLogs} compact={compact} />

      {total > COMPACT_ACTIVITY_LIMIT ? (
        <div className="mt-4 border-t border-border/50 pt-3">
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full sm:w-auto"
            onClick={() => setShowAllActivity(true)}
          >
            {t('widgets.viewFullActivity')}
          </Button>
        </div>
      ) : null}
    </>
  )

  return (
    <>
      {bare ? (
        body
      ) : (
        <DetailSectionCard
          title={t('widgets.activity')}
          subtitle={
            total > 0
              ? t('widgets.activityEvents', { count: total })
              : t('widgets.submissionHistory')
          }
        >
          {body}
        </DetailSectionCard>
      )}

      <SubmissionActivityModal
        open={showAllActivity}
        submissionId={submissionId}
        onClose={() => setShowAllActivity(false)}
      />
    </>
  )
}
