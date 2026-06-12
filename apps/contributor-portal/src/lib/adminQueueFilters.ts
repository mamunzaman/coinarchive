import type { AdminSubmissionListItem } from './adminApi'
import i18n from '../i18n'
import {
  getSubmissionDuplicateRisk,
  hasSubmissionDuplicateRiskData,
  type SubmissionDuplicateRiskLevel,
} from './duplicateProtection'
import { getSubmissionObverseUrl, getSubmissionReverseUrl } from './submissionListUtils'

export type AdminQueueStatusFilter =
  | 'all'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'needs_revision'
  | 'draft'

export const ADMIN_QUEUE_DEFAULT_STATUS_FILTER: AdminQueueStatusFilter = 'pending'

export type AdminQueueDuplicateFilter =
  | 'all'
  | 'risk'
  | 'exact'
  | 'similar'
  | 'none'

export type AdminQueueLanguageFilter = 'all' | 'de' | 'en'

export type AdminQueueReviewFilter =
  | 'all'
  | 'pending'
  | 'needs_revision'
  | 'approved_today'
  | 'exact_duplicates'
  | 'similar_duplicates'
  | 'missing_images'
  | 'missing_release_date'
  | 'missing_descriptions'
  | 'incomplete_mint_data'
  | 'incomplete_data'

export const ADMIN_QUEUE_DEFAULT_REVIEW_FILTER: AdminQueueReviewFilter = 'pending'

export type AdminQueueSortOption =
  | 'newest'
  | 'oldest'
  | 'title-az'
  | 'contributor-az'
  | 'country-az'
  | 'status'
  | 'duplicate-risk'
  | 'review-priority'

export type AdminContentLanguageMeta = {
  language: 'de' | 'en'
  badge: string
  label: string
  notice: string
  missingTranslationLanguage: 'de' | 'en' | ''
  missingTranslationLanguageLabel: string
  translationStatus: string
  translationStatusLabel: string
  translationPostId: number | string | null
}

type AdminContentLanguageRecord = {
  content_language?: string
  content_language_label?: string
  content_language_badge?: string
  content_language_notice?: string
  missing_translation_language?: string
  missing_translation_language_label?: string
  translation_status?: string
  translation_status_label?: string
  translation_post_id?: number | string | null
}

export type AdminQueueCounts = Record<AdminQueueStatusFilter, number>

export type AdminQueueSummaryCounts = {
  pendingReview: number
  revisionRequested: number
  approvedToday: number
  highDuplicateRisk: number
  missingImages: number
  incompleteData: number
}

export type AdminQueueQuality = {
  score: number
  missing: string[]
  hasMissingImages: boolean
  missingReleaseDate: boolean
  missingDescription: boolean
  incompleteMintData: boolean
  incompleteData: boolean
}

const NEEDS_REVISION_STATUSES = new Set([
  'needs_revision',
  'needs-revision',
  'needs_changes',
  'needs-changes',
])

const REJECTED_STATUSES = new Set(['rejected', 'declined', 'failed', 'trash'])

const APPROVED_STATUSES = new Set(['publish', 'published', 'approved'])

function normalizeContentLanguage(language?: string | null): 'de' | 'en' {
  return language?.trim().toLowerCase() === 'en' ? 'en' : 'de'
}

function getTranslationStatusFallback(
  status: string,
  missingLanguageLabel: string,
): string {
  const normalized = status.trim().toLowerCase().replace(/-/g, '_')

  if (!normalized) {
    return ''
  }

  if (normalized.includes('available') || normalized === 'linked') {
    return i18n.t('admin.translationAvailable')
  }

  if (normalized.includes('pending')) {
    return i18n.t('admin.translationLinkPending')
  }

  if (normalized.includes('missing')) {
    return i18n.t('admin.translationMissing', { language: missingLanguageLabel })
  }

  return status
}

export function getAdminContentLanguageMeta(
  submission: AdminContentLanguageRecord,
): AdminContentLanguageMeta {
  const language = normalizeContentLanguage(submission.content_language)
  const missingTranslationLanguage = normalizeContentLanguage(
    submission.missing_translation_language ?? (language === 'de' ? 'en' : 'de'),
  )
  const missingTranslationLanguageLabel =
    submission.missing_translation_language_label?.trim() ||
    i18n.t(`admin.contentLanguage.${missingTranslationLanguage}`)
  const translationStatus = submission.translation_status?.trim() ?? ''

  return {
    language,
    badge: submission.content_language_badge?.trim() || language.toUpperCase(),
    label:
      submission.content_language_label?.trim() ||
      i18n.t(`admin.contentLanguage.${language}`),
    notice: submission.content_language_notice?.trim() ?? '',
    missingTranslationLanguage,
    missingTranslationLanguageLabel,
    translationStatus,
    translationStatusLabel:
      submission.translation_status_label?.trim() ||
      getTranslationStatusFallback(translationStatus, missingTranslationLanguageLabel),
    translationPostId: submission.translation_post_id ?? null,
  }
}

function parseSubmissionDate(date: string): number {
  const parsed = new Date(date.includes('T') ? date : date.replace(' ', 'T'))
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
}

function normalizeStatus(status: string): string {
  return status.trim().toLowerCase().replace(/-/g, '_')
}

function getRecordString(submission: AdminSubmissionListItem, keys: string[]): string {
  const record = submission as unknown as Record<string, unknown>
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value)
    }
  }
  return ''
}

function hasAdminQueueMintData(submission: AdminSubmissionListItem): boolean {
  const record = submission as unknown as Record<string, unknown>
  if (record.hasMintVariants === true || record.has_mint_variants === true) {
    const variants = record.mintVariants ?? record.mint_variants ?? record.coin_mint_variants
    return Array.isArray(variants) && variants.length > 0
  }

  return Boolean(
    getRecordString(submission, [
      'singleMintMark',
      'single_mint_mark',
      'coin_single_mint_mark',
      'mintMarksAvailable',
      'mint_marks_available',
      'coin_mint_marks_available',
    ]),
  )
}

function isToday(date: string): boolean {
  const time = parseSubmissionDate(date)
  if (!time) {
    return false
  }
  const value = new Date(time)
  const now = new Date()
  return value.toDateString() === now.toDateString()
}

export function getAdminSubmissionCountry(submission: AdminSubmissionListItem): string {
  return (submission.country ?? '').trim()
}

export function getSubmissionUpdatedAt(submission: AdminSubmissionListItem): string {
  return submission.modified_date ?? submission.date
}

export function getSubmissionCoinCode(submission: AdminSubmissionListItem): string {
  if (submission.coin_code?.trim()) {
    return submission.coin_code.trim()
  }

  if (submission.unique_code?.trim()) {
    return submission.unique_code.trim()
  }

  return ''
}

export function getSubmissionCompletenessScore(submission: AdminSubmissionListItem): number | null {
  const score = submission.completeness_score
  return typeof score === 'number' && Number.isFinite(score) ? score : null
}

export function getAdminQueueQuality(submission: AdminSubmissionListItem): AdminQueueQuality {
  const checks = [
    { label: 'title', filled: Boolean(submission.title.trim()) },
    { label: 'country', filled: Boolean(getAdminSubmissionCountry(submission)) },
    { label: 'year', filled: submission.year !== undefined && String(submission.year).trim() !== '' },
    { label: 'denomination', filled: Boolean(submission.denomination?.trim()) },
    { label: 'obverse image', filled: Boolean(getSubmissionObverseUrl(submission)) },
    {
      label: 'release date',
      filled: Boolean(getRecordString(submission, ['released_date', 'release_date'])),
    },
    {
      label: 'description',
      filled: Boolean(
        getRecordString(submission, [
          'short_description',
          'description',
          'coin_obverse_description',
          'coin_reverse_description',
        ]),
      ),
    },
    { label: 'mint data', filled: hasAdminQueueMintData(submission) },
  ]

  const missing = checks.filter((check) => !check.filled).map((check) => check.label)
  const hasReverse = Boolean(getSubmissionReverseUrl(submission))
  if (!hasReverse) {
    missing.push('reverse image')
  }

  const explicitScore = getSubmissionCompletenessScore(submission)
  const score = explicitScore ?? Math.round((checks.filter((check) => check.filled).length / checks.length) * 100)

  return {
    score,
    missing,
    hasMissingImages: !checks.find((check) => check.label === 'obverse image')?.filled || !hasReverse,
    missingReleaseDate: missing.includes('release date'),
    missingDescription: missing.includes('description'),
    incompleteMintData: missing.includes('mint data'),
    incompleteData: missing.length > 0 || score < 85,
  }
}

export function hasDuplicateRisk(submission: AdminSubmissionListItem): boolean {
  const risk = getSubmissionDuplicateRisk(submission)
  return risk.level === 'exact' || risk.level === 'similar'
}

export function hasAdminQueueDuplicateRiskData(submissions: AdminSubmissionListItem[]): boolean {
  return submissions.some(hasSubmissionDuplicateRiskData)
}

export function getAdminQueueDuplicateLevels(
  submissions: AdminSubmissionListItem[],
): Set<SubmissionDuplicateRiskLevel> {
  return new Set(submissions.map((submission) => getSubmissionDuplicateRisk(submission).level))
}

export function matchesAdminQueueDuplicateFilter(
  submission: AdminSubmissionListItem,
  filter: AdminQueueDuplicateFilter,
): boolean {
  if (filter === 'all') {
    return true
  }

  const risk = getSubmissionDuplicateRisk(submission)
  if (filter === 'risk') {
    return risk.level === 'exact' || risk.level === 'similar'
  }

  return risk.level === filter
}

export function getAdminQueueStatusCategory(
  status: string,
): Exclude<AdminQueueStatusFilter, 'all'> | 'other' {
  const normalized = normalizeStatus(status)

  if (normalized === 'pending') {
    return 'pending'
  }

  if (normalized === 'draft') {
    return 'draft'
  }

  if (APPROVED_STATUSES.has(normalized)) {
    return 'approved'
  }

  if (NEEDS_REVISION_STATUSES.has(normalized)) {
    return 'needs_revision'
  }

  if (REJECTED_STATUSES.has(normalized)) {
    return 'rejected'
  }

  return 'other'
}

export function isPendingAdminSubmission(submission: AdminSubmissionListItem): boolean {
  return normalizeStatus(submission.status) === 'pending'
}

export function countPendingAdminSubmissions(submissions: AdminSubmissionListItem[]): number {
  return submissions.filter(isPendingAdminSubmission).length
}

export function isDefaultAdminQueueView(options: {
  query: string
  statusFilter: AdminQueueStatusFilter
  countryFilter: string
  languageFilter: AdminQueueLanguageFilter
  duplicateFilter: AdminQueueDuplicateFilter
  reviewFilter: AdminQueueReviewFilter
  sort: AdminQueueSortOption
}): boolean {
  return (
    options.query.trim() === '' &&
    options.statusFilter === ADMIN_QUEUE_DEFAULT_STATUS_FILTER &&
    options.countryFilter === '' &&
    options.languageFilter === 'all' &&
    options.duplicateFilter === 'all' &&
    options.reviewFilter === ADMIN_QUEUE_DEFAULT_REVIEW_FILTER &&
    options.sort === 'review-priority'
  )
}

export function matchesAdminQueueReviewFilter(
  submission: AdminSubmissionListItem,
  filter: AdminQueueReviewFilter,
): boolean {
  if (filter === 'all') {
    return true
  }

  const risk = getSubmissionDuplicateRisk(submission)
  const quality = getAdminQueueQuality(submission)

  switch (filter) {
    case 'pending':
      return isPendingAdminSubmission(submission)
    case 'needs_revision':
      return getAdminQueueStatusCategory(submission.status) === 'needs_revision'
    case 'approved_today':
      return getAdminQueueStatusCategory(submission.status) === 'approved' && isToday(getSubmissionUpdatedAt(submission))
    case 'exact_duplicates':
      return risk.level === 'exact'
    case 'similar_duplicates':
      return risk.level === 'similar'
    case 'missing_images':
      return quality.hasMissingImages
    case 'missing_release_date':
      return quality.missingReleaseDate
    case 'missing_descriptions':
      return quality.missingDescription
    case 'incomplete_mint_data':
      return quality.incompleteMintData
    case 'incomplete_data':
      return quality.incompleteData
    default:
      return true
  }
}

export function matchesAdminQueueStatusFilter(
  submission: AdminSubmissionListItem,
  filter: AdminQueueStatusFilter,
): boolean {
  if (filter === 'all') {
    return true
  }

  return getAdminQueueStatusCategory(submission.status) === filter
}

export function matchesAdminQueueLanguageFilter(
  submission: AdminSubmissionListItem,
  filter: AdminQueueLanguageFilter,
): boolean {
  if (filter === 'all') {
    return true
  }

  return getAdminContentLanguageMeta(submission).language === filter
}

export function computeAdminQueueCounts(submissions: AdminSubmissionListItem[]): AdminQueueCounts {
  const counts: AdminQueueCounts = {
    all: submissions.length,
    pending: 0,
    approved: 0,
    rejected: 0,
    needs_revision: 0,
    draft: 0,
  }

  for (const submission of submissions) {
    const category = getAdminQueueStatusCategory(submission.status)
    if (category !== 'other') {
      counts[category] += 1
    }
  }

  return counts
}

export function getAdminQueueCountries(submissions: AdminSubmissionListItem[]): string[] {
  const countries = new Set<string>()

  for (const submission of submissions) {
    const country = getAdminSubmissionCountry(submission)
    if (country) {
      countries.add(country)
    }
  }

  return [...countries].sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }))
}

export function matchesAdminQueueSearch(
  submission: AdminSubmissionListItem,
  query: string,
): boolean {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return true
  }

  const coinCode = getSubmissionCoinCode(submission).toLowerCase()
  const year = submission.year != null ? String(submission.year) : ''

  return (
    submission.title.toLowerCase().includes(normalizedQuery) ||
    submission.id.toString().includes(normalizedQuery) ||
    (submission.contributor_name ?? '').toLowerCase().includes(normalizedQuery) ||
    (submission.contributor_email ?? '').toLowerCase().includes(normalizedQuery) ||
    getAdminSubmissionCountry(submission).toLowerCase().includes(normalizedQuery) ||
    year.includes(normalizedQuery) ||
    coinCode.includes(normalizedQuery)
  )
}

export function filterAdminQueueSubmissions(
  submissions: AdminSubmissionListItem[],
  options: {
    query: string
    statusFilter: AdminQueueStatusFilter
    countryFilter: string
    duplicateFilter?: AdminQueueDuplicateFilter
    languageFilter?: AdminQueueLanguageFilter
    reviewFilter?: AdminQueueReviewFilter
  },
): AdminSubmissionListItem[] {
  return submissions.filter((submission) => {
    if (
      options.reviewFilter &&
      !matchesAdminQueueReviewFilter(submission, options.reviewFilter)
    ) {
      return false
    }

    if (!matchesAdminQueueStatusFilter(submission, options.statusFilter)) {
      return false
    }

    if (
      options.countryFilter &&
      getAdminSubmissionCountry(submission).toLowerCase() !== options.countryFilter.toLowerCase()
    ) {
      return false
    }

    if (
      options.duplicateFilter &&
      !matchesAdminQueueDuplicateFilter(submission, options.duplicateFilter)
    ) {
      return false
    }

    if (
      options.languageFilter &&
      !matchesAdminQueueLanguageFilter(submission, options.languageFilter)
    ) {
      return false
    }

    return matchesAdminQueueSearch(submission, options.query)
  })
}

function getDuplicateRiskSortRank(submission: AdminSubmissionListItem): number {
  const risk = getSubmissionDuplicateRisk(submission)
  switch (risk.level) {
    case 'exact':
      return 0
    case 'similar':
      return 1
    case 'unknown':
      return 2
    case 'none':
    default:
      return 3
  }
}

function getReviewPriorityRank(submission: AdminSubmissionListItem): number {
  const risk = getSubmissionDuplicateRisk(submission)
  const quality = getAdminQueueQuality(submission)

  if (risk.level === 'exact') return 0
  if (getAdminQueueStatusCategory(submission.status) === 'needs_revision') return 1
  if (quality.hasMissingImages) return 2
  if (quality.incompleteData) return 3
  if (isPendingAdminSubmission(submission)) return 4
  return 5
}

export function sortAdminQueueSubmissions(
  submissions: AdminSubmissionListItem[],
  sort: AdminQueueSortOption,
): AdminSubmissionListItem[] {
  return [...submissions].sort((left, right) => {
    switch (sort) {
      case 'oldest':
        return parseSubmissionDate(getSubmissionUpdatedAt(left)) - parseSubmissionDate(getSubmissionUpdatedAt(right))
      case 'title-az':
        return left.title.localeCompare(right.title, undefined, { sensitivity: 'base' })
      case 'contributor-az': {
        const leftName = (left.contributor_name ?? left.contributor_email ?? left.title).toLowerCase()
        const rightName = (right.contributor_name ?? right.contributor_email ?? right.title).toLowerCase()
        return leftName.localeCompare(rightName, undefined, { sensitivity: 'base' })
      }
      case 'country-az': {
        const leftCountry = (left.country ?? '').toLowerCase()
        const rightCountry = (right.country ?? '').toLowerCase()
        return leftCountry.localeCompare(rightCountry, undefined, { sensitivity: 'base' })
      }
      case 'status':
        return left.status.localeCompare(right.status, undefined, { sensitivity: 'base' })
      case 'duplicate-risk': {
        const riskDiff = getDuplicateRiskSortRank(left) - getDuplicateRiskSortRank(right)
        return riskDiff || parseSubmissionDate(getSubmissionUpdatedAt(right)) - parseSubmissionDate(getSubmissionUpdatedAt(left))
      }
      case 'review-priority': {
        const priorityDiff = getReviewPriorityRank(left) - getReviewPriorityRank(right)
        return priorityDiff || parseSubmissionDate(getSubmissionUpdatedAt(right)) - parseSubmissionDate(getSubmissionUpdatedAt(left))
      }
      case 'newest':
      default:
        return parseSubmissionDate(getSubmissionUpdatedAt(right)) - parseSubmissionDate(getSubmissionUpdatedAt(left))
    }
  })
}

export function getContributorLabel(submission: AdminSubmissionListItem): string {
  if (submission.contributor_name?.trim()) {
    return submission.contributor_name.trim()
  }

  if (submission.contributor_email?.trim()) {
    return submission.contributor_email.trim()
  }

  return '—'
}

export function getAdminQueueDuplicateRiskCount(submissions: AdminSubmissionListItem[]): number {
  return submissions.filter(hasDuplicateRisk).length
}

export function computeAdminQueueSummaryCounts(
  submissions: AdminSubmissionListItem[],
): AdminQueueSummaryCounts {
  return submissions.reduce<AdminQueueSummaryCounts>(
    (counts, submission) => {
      const quality = getAdminQueueQuality(submission)
      const risk = getSubmissionDuplicateRisk(submission)

      if (isPendingAdminSubmission(submission)) counts.pendingReview += 1
      if (getAdminQueueStatusCategory(submission.status) === 'needs_revision') counts.revisionRequested += 1
      if (getAdminQueueStatusCategory(submission.status) === 'approved' && isToday(getSubmissionUpdatedAt(submission))) {
        counts.approvedToday += 1
      }
      if (risk.level === 'exact') counts.highDuplicateRisk += 1
      if (quality.hasMissingImages) counts.missingImages += 1
      if (quality.incompleteData) counts.incompleteData += 1

      return counts
    },
    {
      pendingReview: 0,
      revisionRequested: 0,
      approvedToday: 0,
      highDuplicateRisk: 0,
      missingImages: 0,
      incompleteData: 0,
    },
  )
}
