import type { CoinSubmissionDetail } from './api'
import type { CoinFormValues } from '../types/coinForm'

export type DuplicateMatchTier = 'published' | 'pending' | 'rejected' | 'draft'
export type DuplicateMatchType =
  | 'exact_unique_code'
  | 'exact_coin_code'
  | 'exact_title'
  | 'similar'

export type DuplicateMatch = {
  id: number
  title: string
  year: number | string
  country: string
  status?: string
  coinCode?: string
  uniqueCode?: string
  viewUrl?: string
  matchType?: DuplicateMatchType
  mintMark?: string
  tier: DuplicateMatchTier
}

export type DuplicateIdentityValues = Pick<
  CoinFormValues,
  | 'country'
  | 'title'
  | 'year'
  | 'denomination'
  | 'coin_type'
  | 'coin_series'
  | 'coin_theme'
  | 'short_description'
  | 'singleMintMark'
  | 'hasMintVariants'
>

export type CategorizedDuplicateMatches = {
  warningMatches: DuplicateMatch[]
  draftMatches: DuplicateMatch[]
  referenceMatches: DuplicateMatch[]
  allMatches: DuplicateMatch[]
}

const PUBLISHED_STATUSES = new Set(['publish', 'published', 'approved'])
const PENDING_STATUSES = new Set(['pending', 'submitted'])
const REJECTED_STATUSES = new Set([
  'rejected',
  'declined',
  'failed',
  'trash',
  'needs_revision',
  'needs-revision',
  'needs_changes',
  'needs-changes',
])

const MATCH_TYPE_PRIORITY: Record<DuplicateMatchType, number> = {
  exact_unique_code: 0,
  exact_coin_code: 1,
  exact_title: 2,
  similar: 3,
}

const EXACT_DUPLICATE_MATCH_TYPES = new Set<DuplicateMatchType>([
  'exact_unique_code',
  'exact_coin_code',
  'exact_title',
])

const TIER_PRIORITY: Record<DuplicateMatchTier, number> = {
  published: 0,
  pending: 1,
  rejected: 2,
  draft: 3,
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

function normalizeTitle(value: string): string {
  return normalize(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function normalizeStatus(status: string | undefined): string {
  return (status ?? '').trim().toLowerCase().replace(/-/g, '_')
}

export function getDuplicateMatchTier(status: string | undefined): DuplicateMatchTier {
  const normalized = normalizeStatus(status)

  if (normalized === 'draft') {
    return 'draft'
  }

  if (PUBLISHED_STATUSES.has(normalized)) {
    return 'published'
  }

  if (PENDING_STATUSES.has(normalized)) {
    return 'pending'
  }

  if (REJECTED_STATUSES.has(normalized)) {
    return 'rejected'
  }

  return 'pending'
}

export function isWarningDuplicateMatch(match: DuplicateMatch): boolean {
  return match.tier === 'published' || match.tier === 'pending'
}

export function isDraftDuplicateMatch(match: DuplicateMatch): boolean {
  return match.tier === 'draft'
}

export function isReferenceDuplicateMatch(match: DuplicateMatch): boolean {
  return match.tier === 'rejected'
}

export function sortDuplicateMatchesByPriority(matches: DuplicateMatch[]): DuplicateMatch[] {
  return [...matches].sort((left, right) => {
    const leftMatchPriority = MATCH_TYPE_PRIORITY[left.matchType ?? 'similar']
    const rightMatchPriority = MATCH_TYPE_PRIORITY[right.matchType ?? 'similar']

    if (leftMatchPriority !== rightMatchPriority) {
      return leftMatchPriority - rightMatchPriority
    }

    return TIER_PRIORITY[left.tier] - TIER_PRIORITY[right.tier]
  })
}

export function categorizeDuplicateMatches(matches: DuplicateMatch[]): CategorizedDuplicateMatches {
  const warningMatches: DuplicateMatch[] = []
  const draftMatches: DuplicateMatch[] = []
  const referenceMatches: DuplicateMatch[] = []

  for (const match of sortDuplicateMatchesByPriority(matches)) {
    if (isWarningDuplicateMatch(match)) {
      warningMatches.push(match)
    } else if (isDraftDuplicateMatch(match)) {
      draftMatches.push(match)
    } else if (isReferenceDuplicateMatch(match)) {
      referenceMatches.push(match)
    }
  }

  return {
    warningMatches,
    draftMatches,
    referenceMatches,
    allMatches: sortDuplicateMatchesByPriority(matches),
  }
}

export function getDuplicateMatchHref(match: DuplicateMatch): string {
  return match.viewUrl ?? `/my-submissions/${match.id}/edit`
}

export function getFormMintMark(values: DuplicateIdentityValues): string {
  if (values.hasMintVariants) {
    return ''
  }

  return normalize(values.singleMintMark)
}

export function getSubmissionMintMark(submission: CoinSubmissionDetail): string {
  const acf = submission.acf
  return normalize(acf?.single_mint_mark ?? acf?.coin_single_mint_mark ?? '')
}

function getSubmissionCoinCode(submission: CoinSubmissionDetail): string {
  return normalize(submission.acf?.coin_code ?? '')
}

function getSubmissionUniqueCode(submission: CoinSubmissionDetail): string {
  return normalize(submission.acf?.unique_code ?? '')
}

function getSubjectValue(values: DuplicateIdentityValues): string {
  const source = values as DuplicateIdentityValues & {
    commemorative_subject?: string
    coin_name?: string
    theme?: string
    series?: string
  }

  return normalize(
    source.commemorative_subject ??
      source.coin_name ??
      source.theme ??
      values.coin_theme ??
      values.coin_series ??
      '',
  )
}

function getSubmissionSubjectValue(submission: CoinSubmissionDetail): string {
  const acf = submission.acf as
    | (NonNullable<CoinSubmissionDetail['acf']> & {
        commemorative_subject?: string
        coin_name?: string
        theme?: string
        series?: string
      })
    | undefined

  return normalize(
    acf?.commemorative_subject ??
      acf?.coin_name ??
      acf?.theme ??
      acf?.coin_theme ??
      submission.coin_series ??
      acf?.series ??
      '',
  )
}

export function hasExactTitleMatch(
  values: DuplicateIdentityValues,
  submission: Pick<CoinSubmissionDetail, 'title'>,
): boolean {
  const formTitle = normalizeTitle(values.title)
  const submissionTitle = normalizeTitle(submission.title)

  return formTitle !== '' && submissionTitle !== '' && formTitle === submissionTitle
}

function hasSimilarTitle(values: DuplicateIdentityValues, submission: CoinSubmissionDetail): boolean {
  const formTitle = normalizeTitle(values.title)
  const submissionTitle = normalizeTitle(submission.title)

  if (!formTitle || !submissionTitle) {
    return false
  }

  if (formTitle === submissionTitle) {
    return true
  }

  return formTitle.length >= 12 && submissionTitle.includes(formTitle)
}

export function isExactDuplicateMatch(match: DuplicateMatch): boolean {
  return EXACT_DUPLICATE_MATCH_TYPES.has(match.matchType ?? 'similar')
}

export function isSimilarDuplicateMatch(match: DuplicateMatch): boolean {
  return match.matchType === 'similar'
}

export function getExactDuplicateMatches(matches: DuplicateMatch[]): DuplicateMatch[] {
  return matches.filter(isExactDuplicateMatch)
}

export function getSimilarDuplicateMatches(matches: DuplicateMatch[]): DuplicateMatch[] {
  return matches.filter(isSimilarDuplicateMatch)
}

export function resolveDuplicateMatchType(
  values: DuplicateIdentityValues,
  submission: CoinSubmissionDetail,
  coinCode?: string,
  uniqueCode?: string,
): DuplicateMatchType | null {
  const normalizedUniqueCode = normalize(uniqueCode ?? '')
  const submissionUniqueCode = getSubmissionUniqueCode(submission)

  if (normalizedUniqueCode && submissionUniqueCode && normalizedUniqueCode === submissionUniqueCode) {
    return 'exact_unique_code'
  }

  const normalizedCoinCode = normalize(coinCode ?? '')
  const submissionCoinCode = getSubmissionCoinCode(submission)

  if (normalizedCoinCode && submissionCoinCode && normalizedCoinCode === submissionCoinCode) {
    return 'exact_coin_code'
  }

  if (hasExactTitleMatch(values, submission)) {
    return 'exact_title'
  }

  return isDuplicateMatchForm(values, submission) ? 'similar' : null
}

export function refineDuplicateMatchType(
  values: DuplicateIdentityValues,
  match: DuplicateMatch,
): DuplicateMatchType {
  if (match.matchType === 'exact_unique_code' || match.matchType === 'exact_coin_code') {
    return match.matchType
  }

  if (hasExactTitleMatch(values, { title: match.title })) {
    return 'exact_title'
  }

  return match.matchType ?? 'similar'
}

export function isDuplicateMatchForm(
  values: DuplicateIdentityValues,
  submission: CoinSubmissionDetail,
): boolean {
  if (
    !values.country.trim() ||
    !values.year.trim() ||
    !values.denomination.trim() ||
    !values.coin_type.trim()
  ) {
    return false
  }

  const yearValue = Number.parseInt(values.year, 10)
  if (Number.isNaN(yearValue) || yearValue <= 0) {
    return false
  }

  if (
    normalize(values.country) !== normalize(submission.country) ||
    yearValue !== Number(submission.year) ||
    normalize(values.denomination) !== normalize(submission.denomination) ||
    normalize(values.coin_type) !== normalize(submission.coin_type)
  ) {
    return false
  }

  const formMint = getFormMintMark(values)
  const submissionMint = getSubmissionMintMark(submission)

  if (formMint && submissionMint && formMint !== submissionMint) {
    return false
  }

  const formSubject = getSubjectValue(values)
  const submissionSubject = getSubmissionSubjectValue(submission)
  const titleMatches = hasSimilarTitle(values, submission)

  if (formSubject && submissionSubject && formSubject !== submissionSubject && !titleMatches) {
    return false
  }

  return true
}

export function findDuplicateMatches(
  values: DuplicateIdentityValues,
  submissions: CoinSubmissionDetail[],
  excludeSubmissionId?: number,
  options: { coinCode?: string; uniqueCode?: string } = {},
): DuplicateMatch[] {
  return submissions
    .filter((submission) => submission.id !== excludeSubmissionId)
    .map((submission) => {
      const matchType = resolveDuplicateMatchType(
        values,
        submission,
        options.coinCode,
        options.uniqueCode,
      )

      return matchType ? { submission, matchType } : null
    })
    .filter(
      (match): match is { submission: CoinSubmissionDetail; matchType: DuplicateMatchType } =>
        match !== null,
    )
    .map((submission) => {
      const submissionMint = getSubmissionMintMark(submission.submission)

      return {
        id: submission.submission.id,
        title: submission.submission.title,
        year: submission.submission.year,
        country: submission.submission.country,
        status: submission.submission.status,
        coinCode: submission.submission.acf?.coin_code,
        uniqueCode: submission.submission.acf?.unique_code,
        matchType: submission.matchType,
        mintMark: submissionMint || undefined,
        tier: getDuplicateMatchTier(submission.submission.status),
      }
    })
}
