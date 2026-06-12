import type { CoinSubmission } from '../lib/api'

export type SubmissionViewMode = 'gallery' | 'table'

export type SubmissionStatusFilter = 'all' | 'pending' | 'needs_revision' | 'published' | 'drafts'

export type SubmissionSortOption = 'recent' | 'oldest' | 'title-asc' | 'title-desc'

type SubmissionListRecord = CoinSubmission & {
  country?: string | null
  year?: number | string | null
  denomination?: string | null
  coin_code?: string | null
  unique_code?: string | null
  modified_date?: string | null
  thumbnail_url?: string | null
  obverse_url?: string | null
  reverse_url?: string | null
  image_url?: string | null
  default_image_url?: string | null
  default_obverse_url?: string | null
  default_reverse_url?: string | null
}

function normalizeSubmissionStatus(status: string): string {
  return status.trim().toLowerCase().replace(/-/g, '_')
}

export function isNeedsRevisionStatus(status: string): boolean {
  return normalizeSubmissionStatus(status) === 'needs_revision'
}

export function isEditableSubmissionStatus(status: string): boolean {
  const normalized = normalizeSubmissionStatus(status)
  return normalized === 'pending' || normalized === 'needs_revision'
}

export function canEditSubmission(submission: CoinSubmission): boolean {
  return isEditableSubmissionStatus(submission.status)
}

export function getSubmissionEditLabel(submission: Pick<CoinSubmission, 'status'>): string {
  return isNeedsRevisionStatus(submission.status) ? 'Update submission' : 'Edit submission'
}

export function canDeleteSubmission(submission: Pick<CoinSubmission, 'status'>): boolean {
  return submission.status === 'pending'
}

export function getSubmissionObverseUrl(submission: CoinSubmission): string | null {
  const record = submission as SubmissionListRecord
  return (
    submission.images?.obverse?.url ??
    submission.preview_image?.url ??
    record.obverse_url ??
    record.default_obverse_url ??
    record.default_image_url ??
    record.image_url ??
    null
  )
}

export function getSubmissionReverseUrl(submission: CoinSubmission): string | null {
  const record = submission as SubmissionListRecord
  return (
    submission.images?.reverse?.url ??
    record.reverse_url ??
    record.default_reverse_url ??
    submission.preview_image?.url ??
    submission.images?.obverse?.url ??
    record.default_image_url ??
    record.image_url ??
    null
  )
}

export function getSubmissionPreviewUrl(submission: CoinSubmission): string | null {
  const faceUrl = getSubmissionObverseUrl(submission) ?? getSubmissionReverseUrl(submission)
  if (faceUrl) {
    return faceUrl
  }

  if (submission.images?.gallery?.[0]?.url) {
    return submission.images.gallery[0].url
  }

  const record = submission as SubmissionListRecord

  return (
    record.thumbnail_url ??
    record.default_image_url ??
    record.image_url ??
    null
  )
}

export function getSubmissionCoinCode(submission: CoinSubmission): string {
  const record = submission as SubmissionListRecord
  return (record.coin_code ?? record.unique_code ?? '').trim()
}

export function getSubmissionUpdatedAt(submission: CoinSubmission): string {
  const record = submission as SubmissionListRecord
  return record.modified_date ?? submission.date
}

export function getSubmissionMetadata(submission: CoinSubmission): {
  country: string
  year: string
  denomination: string
} {
  const record = submission as SubmissionListRecord
  return {
    country: (record.country ?? '').trim(),
    year: record.year != null ? String(record.year).trim() : '',
    denomination: (record.denomination ?? '').trim(),
  }
}

export function matchesStatusFilter(submission: CoinSubmission, filter: SubmissionStatusFilter): boolean {
  if (filter === 'all') {
    return true
  }

  if (filter === 'pending') {
    return submission.status === 'pending'
  }

  if (filter === 'needs_revision') {
    return isNeedsRevisionStatus(submission.status)
  }

  if (filter === 'drafts') {
    return submission.status === 'draft'
  }

  return submission.status === 'publish' || submission.status === 'published'
}

export function matchesSearchQuery(submission: CoinSubmission, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }

  return (
    submission.title.toLowerCase().includes(normalized) ||
    submission.id.toString().includes(normalized) ||
    getSubmissionCoinCode(submission).toLowerCase().includes(normalized) ||
    Object.values(getSubmissionMetadata(submission)).some((value) =>
      value.toLowerCase().includes(normalized),
    )
  )
}

function parseSubmissionDate(date: string): number {
  const parsed = new Date(date.includes('T') ? date : date.replace(' ', 'T'))
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
}

export function filterAndSortSubmissions(
  submissions: CoinSubmission[],
  options: {
    query: string
    statusFilter: SubmissionStatusFilter
    sort: SubmissionSortOption
  },
): CoinSubmission[] {
  const filtered = submissions.filter(
    (submission) =>
      matchesSearchQuery(submission, options.query) &&
      matchesStatusFilter(submission, options.statusFilter),
  )

  return [...filtered].sort((left, right) => {
    switch (options.sort) {
      case 'oldest':
        return parseSubmissionDate(left.date) - parseSubmissionDate(right.date)
      case 'title-asc':
        return left.title.localeCompare(right.title, undefined, { sensitivity: 'base' })
      case 'title-desc':
        return right.title.localeCompare(left.title, undefined, { sensitivity: 'base' })
      case 'recent':
      default:
        return parseSubmissionDate(right.date) - parseSubmissionDate(left.date)
    }
  })
}
