import i18n from '../i18n'
import type { DuplicateCheckStatus } from './duplicateCheck'
import {
  isExactDuplicateMatch,
  isSimilarDuplicateMatch,
  type DuplicateMatch,
} from './duplicateDetection'

export type DuplicateProtectionState =
  | 'EXACT_DUPLICATE'
  | 'SIMILAR_MATCH'
  | 'NO_MATCH'

export function getDuplicateProtectionMessage(state: DuplicateProtectionState): string {
  switch (state) {
    case 'EXACT_DUPLICATE':
      return i18n.t('duplicate.exact')
    case 'SIMILAR_MATCH':
      return i18n.t('duplicate.similar')
    case 'NO_MATCH':
      return i18n.t('duplicate.noMatch')
  }
}

export function getExactDuplicateSubmitBlockMessage(): string {
  return getDuplicateProtectionMessage('EXACT_DUPLICATE')
}

/** @deprecated Use getDuplicateProtectionMessage() for translated text. */
export const DUPLICATE_PROTECTION_MESSAGES: Record<DuplicateProtectionState, string> = {
  EXACT_DUPLICATE: 'This coin already exists in CoinArchive and cannot be submitted again.',
  SIMILAR_MATCH: 'Similar coins were found. Please review before submitting.',
  NO_MATCH: 'No duplicate matches found.',
}

/** @deprecated Use getExactDuplicateSubmitBlockMessage() for translated text. */
export const EXACT_DUPLICATE_SUBMIT_BLOCK_MESSAGE = DUPLICATE_PROTECTION_MESSAGES.EXACT_DUPLICATE

type ResolveDuplicateProtectionOptions = {
  canCheck?: boolean
  isChecking?: boolean
  hasError?: boolean
  checkStatus?: DuplicateCheckStatus
  exactUniqueCode?: boolean
  exactCoinCode?: boolean
  exactTitle?: boolean
  exactDuplicate?: boolean
}

export function resolveDuplicateProtectionState(
  matches: DuplicateMatch[],
  options: ResolveDuplicateProtectionOptions = {},
): DuplicateProtectionState | null {
  const { isChecking = false, hasError = false, canCheck = true } = options

  if (!canCheck || isChecking || hasError) {
    return null
  }

  if (
    options.exactUniqueCode ||
    options.exactCoinCode ||
    options.exactTitle ||
    options.exactDuplicate ||
    matches.some(isExactDuplicateMatch)
  ) {
    return 'EXACT_DUPLICATE'
  }

  if (matches.some(isSimilarDuplicateMatch)) {
    return 'SIMILAR_MATCH'
  }

  return 'NO_MATCH'
}

export function isSubmitBlockedByDuplicateProtection(
  state: DuplicateProtectionState | null,
): boolean {
  return state === 'EXACT_DUPLICATE'
}

export function getOwnSubmissionDetailHref(submissionId: number): string {
  return `/my-submissions/${submissionId}`
}

export type SubmissionDuplicateRiskLevel = 'exact' | 'similar' | 'none' | 'unknown'

export type SubmissionDuplicateRisk = {
  level: SubmissionDuplicateRiskLevel
  label: string
  reason?: string
  count?: number
  checked: boolean
}

type DuplicateRiskRecord = Record<string, unknown>

const EXACT_RISK_VALUES = new Set([
  'exact',
  'exact_duplicate',
  'exact_unique_code',
  'exact_coin_code',
  'exact_title',
])

const SIMILAR_RISK_VALUES = new Set(['similar', 'similar_match', 'risk', 'duplicate_risk'])
const CLEAN_RISK_VALUES = new Set(['none', 'clean', 'no_match', 'no_duplicate', 'checked_clean'])

function getString(record: DuplicateRiskRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return ''
}

function getNumber(record: DuplicateRiskRecord, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }

    if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value)
    }
  }

  return null
}

function getBoolean(record: DuplicateRiskRecord, keys: string[]): boolean {
  return keys.some((key) => record[key] === true)
}

function getDuplicateMatchType(match: unknown): string {
  if (typeof match !== 'object' || match === null) {
    return ''
  }

  const record = match as DuplicateRiskRecord
  return getString(record, ['matchType', 'match_type', 'type', 'duplicate_type']).toLowerCase()
}

function getDuplicateMatches(record: DuplicateRiskRecord): unknown[] {
  const matches = record.duplicate_matches ?? record.duplicateMatches ?? record.matches
  return Array.isArray(matches) ? matches : []
}

export function hasSubmissionDuplicateRiskData(submission: object): boolean {
  const record = submission as DuplicateRiskRecord
  const keys = [
    'duplicate_risk',
    'duplicateRisk',
    'duplicate_status',
    'duplicateStatus',
    'duplicate_level',
    'duplicateLevel',
    'duplicate_matches',
    'duplicateMatches',
    'matches',
    'duplicate_count',
    'duplicateCount',
    'similar_match_count',
    'similarMatchCount',
    'exact_duplicate',
    'exactDuplicate',
    'exact_unique_code',
    'exact_coin_code',
    'exact_title',
    'duplicate_checked',
    'duplicateChecked',
  ]

  return keys.some((key) => key in record)
}

export function getSubmissionDuplicateRisk(submission: object): SubmissionDuplicateRisk {
  const record = submission as DuplicateRiskRecord
  const matches = getDuplicateMatches(record)
  const duplicateValue = getString(record, [
    'duplicate_risk',
    'duplicateRisk',
    'duplicate_status',
    'duplicateStatus',
    'duplicate_level',
    'duplicateLevel',
  ]).toLowerCase()
  const reason = getString(record, ['duplicate_reason', 'duplicateReason', 'duplicate_message', 'duplicateMessage'])
  const explicitCount = getNumber(record, [
    'duplicate_count',
    'duplicateCount',
    'duplicate_matches_count',
    'duplicateMatchesCount',
    'similar_match_count',
    'similarMatchCount',
  ])
  const count = explicitCount ?? matches.length
  const exactFlag = getBoolean(record, [
    'exact_duplicate',
    'exactDuplicate',
    'exact_unique_code',
    'exact_coin_code',
    'exact_title',
  ])
  const similarFlag = getBoolean(record, ['similar_match', 'similarMatch', 'duplicate_risk', 'duplicateRisk'])
  const matchTypes = matches.map(getDuplicateMatchType)

  if (
    exactFlag ||
    EXACT_RISK_VALUES.has(duplicateValue) ||
    matchTypes.some((type) => EXACT_RISK_VALUES.has(type))
  ) {
    return {
      level: 'exact',
      label: 'Exact duplicate',
      reason: reason || 'Exact duplicate signal is present in the list data.',
      count: count > 0 ? count : undefined,
      checked: true,
    }
  }

  if (
    similarFlag ||
    SIMILAR_RISK_VALUES.has(duplicateValue) ||
    count > 0 ||
    matchTypes.some((type) => SIMILAR_RISK_VALUES.has(type))
  ) {
    return {
      level: 'similar',
      label: count > 1 ? `${count} similar matches` : 'Similar match',
      reason: reason || 'Duplicate match data is present in the list data.',
      count: count > 0 ? count : undefined,
      checked: true,
    }
  }

  if (
    CLEAN_RISK_VALUES.has(duplicateValue) ||
    record.duplicate_checked === true ||
    record.duplicateChecked === true
  ) {
    return {
      level: 'none',
      label: 'No risk',
      reason: reason || 'Duplicate check is marked clean in the list data.',
      checked: true,
    }
  }

  return {
    level: 'unknown',
    label: 'Not checked',
    checked: false,
  }
}
