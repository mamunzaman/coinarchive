import type { CoinSubmission } from './api'

export type SubmissionStats = {
  total: number
  pending: number
  published: number
  rejected: number
  drafts: number
}

const REJECTED_STATUSES = new Set(['rejected', 'declined', 'failed', 'trash'])
const APPROVED_STATUSES = new Set(['publish', 'published', 'approved'])

function parseSubmissionDate(date: string): number {
  const parsed = new Date(date.includes('T') ? date : date.replace(' ', 'T'))
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
}

export function computeSubmissionStats(submissions: CoinSubmission[]): SubmissionStats {
  return submissions.reduce<SubmissionStats>(
    (stats, submission) => {
      stats.total += 1

      if (submission.status === 'pending') {
        stats.pending += 1
      } else if (submission.status === 'draft') {
        stats.drafts += 1
      } else if (APPROVED_STATUSES.has(submission.status)) {
        stats.published += 1
      } else if (REJECTED_STATUSES.has(submission.status)) {
        stats.rejected += 1
      }

      return stats
    },
    { total: 0, pending: 0, published: 0, rejected: 0, drafts: 0 },
  )
}

export function getApprovalRate(stats: Pick<SubmissionStats, 'published' | 'rejected'>): number | null {
  const reviewedTotal = stats.published + stats.rejected
  if (reviewedTotal === 0) {
    return null
  }

  return Math.round((stats.published / reviewedTotal) * 100)
}

export function sortSubmissionsByRecent(submissions: CoinSubmission[]): CoinSubmission[] {
  return [...submissions].sort(
    (left, right) => parseSubmissionDate(right.date) - parseSubmissionDate(left.date),
  )
}

export function getRecentSubmissions(
  submissions: CoinSubmission[],
  limit = 5,
): CoinSubmission[] {
  return sortSubmissionsByRecent(submissions).slice(0, limit)
}

export function getLatestPendingSubmission(
  submissions: CoinSubmission[],
): CoinSubmission | null {
  return (
    sortSubmissionsByRecent(submissions).find((submission) => submission.status === 'pending') ??
    null
  )
}

function isNeedsRevisionStatus(status: string): boolean {
  return status.trim().toLowerCase().replace(/-/g, '_') === 'needs_revision'
}

export function getLatestNeedsRevisionSubmission(
  submissions: CoinSubmission[],
): CoinSubmission | null {
  return (
    sortSubmissionsByRecent(submissions).find((submission) =>
      isNeedsRevisionStatus(submission.status),
    ) ?? null
  )
}
