import type { CoinSubmission, CoinSubmissionDetail } from './api'

export type SubmissionRevisionInfo = {
  needsRevision: boolean
  notes: string[]
}

const REVISION_STATUSES = new Set([
  'rejected',
  'declined',
  'failed',
  'needs_revision',
  'needs-revision',
  'needs_changes',
  'needs-changes',
])

function collectNotes(record: Record<string, unknown>): string[] {
  const notes: string[] = []
  const candidates = [
    record.admin_notes,
    record.revision_notes,
    record.review_notes,
    record.admin_feedback,
    record.contributor_feedback,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      notes.push(candidate.trim())
    }

    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        if (typeof item === 'string' && item.trim()) {
          notes.push(item.trim())
        }
      }
    }
  }

  return [...new Set(notes)]
}

export function getSubmissionRevisionInfo(
  submission: CoinSubmission | CoinSubmissionDetail,
): SubmissionRevisionInfo {
  const record = submission as CoinSubmission & Record<string, unknown>
  const notes = collectNotes(record)
  const needsRevision =
    REVISION_STATUSES.has(submission.status.toLowerCase()) || notes.length > 0

  return { needsRevision, notes }
}
