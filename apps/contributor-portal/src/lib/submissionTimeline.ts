import type { CoinSubmissionDetail } from './api'
import { formatSubmittedDate } from './format'

export type TimelineEvent = {
  id: string
  label: string
  date: string
  formattedDate: string
  completed: boolean
}

export function buildSubmissionTimeline(submission: CoinSubmissionDetail): TimelineEvent[] {
  const createdDate = submission.date
  const record = submission as CoinSubmissionDetail & {
    modified_date?: string
    reviewed_date?: string
    published_date?: string
  }

  const status = submission.status.toLowerCase()
  const isPending = status === 'pending' || status === 'draft'
  const isPublished = status === 'publish' || status === 'published'
  const isReviewed =
    isPublished ||
    ['rejected', 'declined', 'failed', 'needs_revision', 'needs-revision', 'needs_changes', 'needs-changes'].includes(
      status,
    )

  const updatedDate = record.modified_date ?? createdDate
  const reviewedDate = record.reviewed_date ?? (isReviewed ? updatedDate : '')
  const publishedDate = record.published_date ?? (isPublished ? updatedDate : '')

  const events: TimelineEvent[] = [
    {
      id: 'created',
      label: 'Created',
      date: createdDate,
      formattedDate: formatSubmittedDate(createdDate),
      completed: true,
    },
    {
      id: 'updated',
      label: 'Updated',
      date: updatedDate,
      formattedDate: formatSubmittedDate(updatedDate),
      completed: Boolean(updatedDate) && updatedDate !== createdDate,
    },
    {
      id: 'submitted',
      label: 'Submitted',
      date: createdDate,
      formattedDate: formatSubmittedDate(createdDate),
      completed: !isPending || status === 'pending',
    },
    {
      id: 'reviewed',
      label: 'Reviewed',
      date: reviewedDate,
      formattedDate: reviewedDate ? formatSubmittedDate(reviewedDate) : 'Pending review',
      completed: isReviewed,
    },
    {
      id: 'published',
      label: 'Published',
      date: publishedDate,
      formattedDate: publishedDate ? formatSubmittedDate(publishedDate) : 'Not published yet',
      completed: isPublished,
    },
  ]

  return events
}
