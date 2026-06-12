import type { CoinFormValues, CoinRecordStatus } from '../types/coinForm'
import { COIN_RECORD_STATUS_OPTIONS } from '../types/coinForm'

export type RevisionFieldChange = {
  field: string
  label: string
  previous: string
  current: string
}

const FIELD_LABELS: Partial<Record<keyof CoinFormValues, string>> = {
  title: 'Title',
  country: 'Country',
  year: 'Year',
  denomination: 'Denomination',
  coin_type: 'Coin type',
  coin_series: 'Series',
  short_description: 'Description',
  coin_designer: 'Designer / Artist',
  coin_issue_status: 'Issue status',
  coin_source_name: 'Official source',
  coin_source_url: 'Official source URL',
  coin_historical_background: 'Historical background',
  coin_theme: 'Theme',
  coin_material: 'Material',
  coin_mintage: 'Mintage',
  singleMintMark: 'Mint mark',
  coin_is_published_catalogue: 'Published in catalogue',
  coin_is_featured: 'Featured coin',
  coin_is_app_enabled: 'App enabled',
  coin_record_status: 'Record status',
}

export function formatStatusBoolean(value: boolean): string {
  return value ? 'Yes' : 'No'
}

export function formatRecordStatusLabel(value: string | undefined): string {
  if (!value) {
    return '—'
  }

  if (COIN_RECORD_STATUS_OPTIONS.includes(value as CoinRecordStatus)) {
    return value.charAt(0).toUpperCase() + value.slice(1)
  }

  return value
}

function formatValue(field: keyof CoinFormValues, value: unknown): string {
  if (field === 'coin_record_status') {
    return formatRecordStatusLabel(typeof value === 'string' ? value : undefined)
  }

  if (field === 'coin_issue_status') {
    const label = typeof value === 'string' ? value.trim() : ''
    return label ? label.charAt(0).toUpperCase() + label.slice(1) : '—'
  }

  if (
    field === 'coin_is_published_catalogue' ||
    field === 'coin_is_featured' ||
    field === 'coin_is_app_enabled'
  ) {
    return formatStatusBoolean(Boolean(value))
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (typeof value === 'string') {
    return value.trim() || '—'
  }

  return String(value ?? '—')
}

export function compareCoinFormValues(
  previous: CoinFormValues,
  current: CoinFormValues,
): RevisionFieldChange[] {
  const changes: RevisionFieldChange[] = []

  for (const field of Object.keys(FIELD_LABELS) as Array<keyof CoinFormValues>) {
    const previousValue = formatValue(field, previous[field])
    const currentValue = formatValue(field, current[field])

    if (previousValue !== currentValue) {
      changes.push({
        field,
        label: FIELD_LABELS[field] ?? field,
        previous: previousValue,
        current: currentValue,
      })
    }
  }

  return changes
}

export type GalleryImageChangeInput = {
  pendingAddCount?: number
  removedImageIds?: readonly number[]
  replacementCount?: number
  permanentDeleteIds?: readonly number[]
}

export function hasGalleryImageChanges(input: GalleryImageChangeInput): boolean {
  return (
    (input.pendingAddCount ?? 0) > 0 ||
    (input.removedImageIds?.length ?? 0) > 0 ||
    (input.replacementCount ?? 0) > 0 ||
    (input.permanentDeleteIds?.length ?? 0) > 0
  )
}

export function hasSubmissionGalleryDrift(
  currentGalleryIds: readonly number[],
  baselineGalleryIds: readonly number[],
): boolean {
  if (currentGalleryIds.length !== baselineGalleryIds.length) {
    return true
  }

  const current = [...currentGalleryIds].sort((left, right) => left - right)
  const baseline = [...baselineGalleryIds].sort((left, right) => left - right)

  return current.some((id, index) => id !== baseline[index])
}

export function getImageChangeLabels(options: {
  obverseChanged: boolean
  reverseChanged: boolean
  galleryChanged: boolean
}): string[] {
  const labels: string[] = []

  if (options.obverseChanged) {
    labels.push('Obverse image replaced')
  }

  if (options.reverseChanged) {
    labels.push('Reverse image replaced')
  }

  if (options.galleryChanged) {
    labels.push('Gallery updated')
  }

  return labels
}
