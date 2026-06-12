import type { CoinSubmission } from './api'
import { loadFormDraft, type FormDraftPayload } from './formDraftStorage'
import { EMPTY_COIN_FORM_VALUES, type CoinFormValues } from '../types/coinForm'

export type CompletenessResult = {
  score: number
  requiredFilled: number
  requiredTotal: number
  recommendedFilled: number
  recommendedTotal: number
  missingRecommended: string[]
}

type CompletenessContext = {
  values: CoinFormValues
  hasObverse: boolean
  hasReverse: boolean
  hasGallery: boolean
}

function hasMintInfo(values: CoinFormValues): boolean {
  if (values.hasMintVariants) {
    return values.mintVariants.some(
      (row) =>
        row.mintMarkCode.trim() ||
        row.mintMintage.trim() ||
        row.mintNotes.trim(),
    )
  }

  return Boolean(values.singleMintMark.trim())
}

function hasReferences(values: CoinFormValues): boolean {
  return Boolean(
    values.coin_historical_background.trim() ||
      values.coin_collector_notes.trim() ||
      values.coin_obverse_description.trim() ||
      values.coin_reverse_description.trim(),
  )
}

export type CompletionTone = 'high' | 'medium' | 'low'

export function getCompletionTone(score: number): CompletionTone {
  if (score >= 80) {
    return 'high'
  }

  if (score >= 50) {
    return 'medium'
  }

  return 'low'
}

export function computeDraftCompleteness(draft: FormDraftPayload): CompletenessResult {
  return computeCompletenessScore({
    values: draft.values,
    hasObverse: Boolean(draft.obverseFile),
    hasReverse: Boolean(draft.reverseFile),
    hasGallery: draft.galleryFiles.length > 0,
  })
}

export function computeDraftCompletenessFromKey(key: string): CompletenessResult | null {
  const draft = loadFormDraft(key)
  if (!draft) {
    return null
  }

  return computeDraftCompleteness(draft)
}

function hasSubmissionListObverse(submission: CoinSubmission): boolean {
  return Boolean(submission.images?.obverse?.url ?? submission.preview_image?.url)
}

function hasSubmissionListReverse(submission: CoinSubmission): boolean {
  return Boolean(submission.images?.reverse?.url)
}

function hasSubmissionListGallery(submission: CoinSubmission): boolean {
  return (submission.images?.gallery?.length ?? 0) > 0
}

function isSubmittedListStatus(status: string): boolean {
  return status !== 'draft'
}

function buildEstimatedValuesFromListSubmission(submission: CoinSubmission): CoinFormValues {
  const submitted = isSubmittedListStatus(submission.status)

  return {
    ...EMPTY_COIN_FORM_VALUES,
    title: submission.title,
    country: submitted ? 'filled' : '',
    year: submitted ? '1' : '',
    denomination: submitted ? 'filled' : '',
    coin_type: submitted ? 'filled' : '',
    short_description: submitted ? 'filled' : '',
  }
}

export function computeSubmissionListCompleteness(submission: CoinSubmission): CompletenessResult {
  return computeCompletenessScore({
    values: buildEstimatedValuesFromListSubmission(submission),
    hasObverse: hasSubmissionListObverse(submission),
    hasReverse: hasSubmissionListReverse(submission),
    hasGallery: hasSubmissionListGallery(submission),
  })
}

export function computeCompletenessScore(context: CompletenessContext): CompletenessResult {
  const { values, hasObverse, hasReverse, hasGallery } = context

  const requiredChecks = [
    Boolean(values.title.trim()),
    Boolean(values.country.trim()),
    Boolean(values.year.trim()),
    Boolean(values.denomination.trim()),
    Boolean(values.coin_type.trim()),
    Boolean(values.short_description.trim()),
    Boolean(values.released_date.trim()),
    hasObverse,
    hasReverse,
  ]

  const recommendedItems: Array<{ label: string; filled: boolean }> = [
    { label: 'Mint information', filled: hasMintInfo(values) },
    { label: 'Gallery images', filled: hasGallery },
    { label: 'Material', filled: Boolean(values.coin_material.trim()) },
    { label: 'Weight', filled: Boolean(values.coin_weight_g.trim()) },
    { label: 'Edge inscription', filled: Boolean(values.coin_edge_inscription.trim()) },
    { label: 'Designer / theme', filled: Boolean(values.coin_theme.trim()) },
    { label: 'References / notes', filled: hasReferences(values) },
  ]

  const requiredFilled = requiredChecks.filter(Boolean).length
  const recommendedFilled = recommendedItems.filter((item) => item.filled).length
  const requiredTotal = requiredChecks.length
  const recommendedTotal = recommendedItems.length

  const requiredScore = (requiredFilled / requiredTotal) * 70
  const recommendedScore = (recommendedFilled / recommendedTotal) * 30
  const score = Math.round(requiredScore + recommendedScore)

  return {
    score,
    requiredFilled,
    requiredTotal,
    recommendedFilled,
    recommendedTotal,
    missingRecommended: recommendedItems.filter((item) => !item.filled).map((item) => item.label),
  }
}
