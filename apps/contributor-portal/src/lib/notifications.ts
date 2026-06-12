import type { CoinSubmission } from './api'
import { formatSubmittedDate } from './format'
import type { DraftIndexEntry } from './formDraftStorage'

export type ContributorNotificationSeverity = 'success' | 'warning' | 'danger' | 'info'

export type ContributorNotificationType =
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'revision'
  | 'draft'
  | 'updated'

export type ContributorNotification = {
  id: string
  type: ContributorNotificationType
  title: string
  message: string
  date: string
  formattedDate: string
  severity: ContributorNotificationSeverity
  href: string
}

export const READ_NOTIFICATIONS_KEY = 'caes_read_notifications'

const REVIEW_STATUSES = new Set(['needs_revision', 'needs_changes'])
const REJECTED_STATUSES = new Set(['rejected', 'declined', 'failed', 'trash'])
const APPROVED_STATUSES = new Set(['publish', 'published', 'approved'])

function normalizeStatus(status: string): string {
  return status.trim().toLowerCase().replace(/-/g, '_')
}

function parseTime(date: string): number {
  const parsed = new Date(date.includes('T') ? date : date.replace(' ', 'T'))
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
}

function getSubmissionUpdatedAt(submission: CoinSubmission): string {
  const record = submission as CoinSubmission & { modified_date?: string | null }
  return record.modified_date || submission.date
}

function notificationFromSubmission(submission: CoinSubmission): ContributorNotification {
  const status = normalizeStatus(submission.status)
  const updatedAt = getSubmissionUpdatedAt(submission)
  const detailHref = `/my-submissions/${submission.id}`
  const editHref = `/my-submissions/${submission.id}/edit`

  if (APPROVED_STATUSES.has(status)) {
    return {
      id: `submission-${submission.id}-approved-${updatedAt}`,
      type: 'approved',
      title: 'Submission approved',
      message: submission.title,
      date: updatedAt,
      formattedDate: formatSubmittedDate(updatedAt),
      severity: 'success',
      href: detailHref,
    }
  }

  if (REJECTED_STATUSES.has(status)) {
    return {
      id: `submission-${submission.id}-rejected-${updatedAt}`,
      type: 'rejected',
      title: 'Submission rejected',
      message: submission.title,
      date: updatedAt,
      formattedDate: formatSubmittedDate(updatedAt),
      severity: 'danger',
      href: detailHref,
    }
  }

  if (REVIEW_STATUSES.has(status)) {
    return {
      id: `submission-${submission.id}-revision-${updatedAt}`,
      type: 'revision',
      title: 'Revision requested',
      message: submission.title,
      date: updatedAt,
      formattedDate: formatSubmittedDate(updatedAt),
      severity: 'warning',
      href: editHref,
    }
  }

  if (status === 'draft') {
    return {
      id: `submission-${submission.id}-draft-${updatedAt}`,
      type: 'draft',
      title: 'Draft saved',
      message: submission.title,
      date: updatedAt,
      formattedDate: formatSubmittedDate(updatedAt),
      severity: 'info',
      href: editHref,
    }
  }

  if (status === 'pending') {
    return {
      id: `submission-${submission.id}-submitted-${updatedAt}`,
      type: 'submitted',
      title: 'Submission received',
      message: submission.title,
      date: updatedAt,
      formattedDate: formatSubmittedDate(updatedAt),
      severity: 'info',
      href: detailHref,
    }
  }

  return {
    id: `submission-${submission.id}-updated-${updatedAt}`,
    type: 'updated',
    title: 'Submission updated',
    message: submission.title,
    date: updatedAt,
    formattedDate: formatSubmittedDate(updatedAt),
    severity: 'info',
    href: detailHref,
  }
}

function notificationFromDraft(draft: DraftIndexEntry): ContributorNotification {
  return {
    id: `local-draft-${draft.key}-${draft.updatedAt}`,
    type: 'draft',
    title: 'Draft saved',
    message: draft.title,
    date: draft.updatedAt,
    formattedDate: formatSubmittedDate(draft.updatedAt),
    severity: 'info',
    href: draft.kind === 'new' ? '/new-coin' : `/my-submissions/${draft.submissionId}/edit`,
  }
}

export function buildContributorNotifications(
  submissions: CoinSubmission[],
  drafts: DraftIndexEntry[] = [],
): ContributorNotification[] {
  return [
    ...submissions.map(notificationFromSubmission),
    ...drafts.map(notificationFromDraft),
  ].sort((left, right) => parseTime(right.date) - parseTime(left.date))
}

export function readStoredNotificationIds(): string[] {
  try {
    const raw = localStorage.getItem(READ_NOTIFICATIONS_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function writeStoredNotificationIds(ids: string[]) {
  localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(ids))
}

