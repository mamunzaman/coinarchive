import type { DuplicateMatch } from './duplicateDetection'
import { isExactDuplicateMatch, isWarningDuplicateMatch } from './duplicateDetection'

export type DuplicateCheckStatus =
  | 'insufficient'
  | 'checking'
  | 'clear'
  | 'match'
  | 'draft-info'
  | 'reference'
  | 'error'

export type DuplicateCheckState = {
  status: DuplicateCheckStatus
  matches: DuplicateMatch[]
}

export function resolveDuplicateCheckStatus(
  canCheck: boolean,
  isChecking: boolean,
  hasError: boolean,
  matches: DuplicateMatch[],
): DuplicateCheckStatus {
  if (!canCheck) {
    return 'insufficient'
  }

  if (isChecking) {
    return 'checking'
  }

  if (hasError) {
    return 'error'
  }

  if (matches.some(isExactDuplicateMatch)) {
    return 'match'
  }

  if (matches.some(isWarningDuplicateMatch)) {
    return 'match'
  }

  if (matches.some((match) => match.tier === 'draft')) {
    return 'draft-info'
  }

  if (matches.some((match) => match.tier === 'rejected')) {
    return 'reference'
  }

  return 'clear'
}

export function getDuplicateCheckLabel(status: DuplicateCheckStatus): string {
  switch (status) {
    case 'insufficient':
      return 'Not enough info yet'
    case 'checking':
      return 'Checking…'
    case 'clear':
      return 'No duplicate warning'
    case 'match':
      return 'Duplicate review required'
    case 'draft-info':
      return 'Unfinished draft found'
    case 'reference':
      return 'Similar rejected entry'
    case 'error':
      return 'Error checking duplicate'
  }
}

export function getDuplicateCheckTone(
  status: DuplicateCheckStatus,
): 'neutral' | 'success' | 'warning' | 'danger' | 'primary' | 'info' {
  switch (status) {
    case 'checking':
      return 'primary'
    case 'clear':
      return 'success'
    case 'match':
      return 'warning'
    case 'draft-info':
    case 'reference':
      return 'info'
    case 'error':
      return 'danger'
    default:
      return 'neutral'
  }
}
