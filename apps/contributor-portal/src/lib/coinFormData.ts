import type { CoinFormImages, CoinFormValues, ContentLanguage, MintVariantRow } from '../types/coinForm'
import i18n from '../i18n'
import { getCoinQualityDisplayLabel } from './coinDisplayLabels'
import { COIN_ISSUE_STATUS_OPTIONS, COIN_QUALITY_OPTIONS, EMPTY_COIN_FORM_VALUES } from '../types/coinForm'
import { hasMintFormData, isMintVariantRowFilled, normalizeMintMarkCode } from '../types/coinForm'
import type { CoinSubmissionDetail } from './api'
import { resolveCoinSeriesFormValue, resolveTaxonomyFormValue, type FormOptions } from '../types/formOptions'

const OPTIONAL_STRING_FIELDS = [
  'coin_designer',
  'coin_theme',
  'released_date',
  'coin_mintage',
  'coin_material',
  'coin_quality',
  'coin_weight_g',
  'coin_diameter_mm',
  'coin_thickness_mm',
  'coin_edge_inscription',
  'coin_obverse_description',
  'coin_reverse_description',
  'coin_historical_background',
  'coin_collector_notes',
  'coin_source_name',
  'coin_source_url',
] as const satisfies ReadonlyArray<keyof CoinFormValues>

export type AppendCoinFormDataOptions = {
  includeEmptyOptionalFields?: boolean
  isAdmin?: boolean
  formOptions?: FormOptions
  contentLanguage?: ContentLanguage
  /** SEO slug from generateCoinPostSlug(); appended only when COIN_FORM_SUPPORTS_POST_SLUG is true. */
  postSlug?: string
}

/** TODO: Set true when WordPress submit-coin / update endpoints accept post_slug or permalink_slug. */
export const COIN_FORM_SUPPORTS_POST_SLUG = false

function appendBooleanField(formData: FormData, key: string, value: boolean): void {
  formData.append(key, value ? '1' : '0')
}

function appendMintFormData(
  formData: FormData,
  values: CoinFormValues,
  includeEmptyOptionalFields: boolean,
): void {
  if (!includeEmptyOptionalFields && !hasMintFormData(values)) {
    return
  }

  formData.append('has_mint_variants', values.hasMintVariants ? '1' : '0')

  if (!values.hasMintVariants) {
    const singleMintMark = values.singleMintMark.trim()
    if (singleMintMark || includeEmptyOptionalFields) {
      formData.append('single_mint_mark', singleMintMark)
    }
    return
  }

  const mintMarksAvailable = values.mintMarksAvailable.trim()
  if (mintMarksAvailable || includeEmptyOptionalFields) {
    formData.append('mint_marks_available', mintMarksAvailable)
    formData.append('coin_mint_marks_available', mintMarksAvailable)
  }

  const filledVariants = values.mintVariants.filter(isMintVariantRowFilled)
  const mintVariantPayload = filledVariants.map((row: MintVariantRow) => ({
    mint_mark_code: normalizeMintMarkCode(row.mintMarkCode),
    mint_mintage: row.mintMintage.trim(),
    mint_notes: row.mintNotes.trim(),
  }))

  formData.set('mint_variants', JSON.stringify(mintVariantPayload))
}

export function appendCoinFormData(
  formData: FormData,
  values: CoinFormValues,
  images?: CoinFormImages,
  options?: AppendCoinFormDataOptions,
): void {
  formData.append('content_language', values.content_language)
  formData.append('title', values.title.trim())
  formData.append('country', values.country.trim())
  formData.append('year', values.year.trim())
  formData.append('denomination', values.denomination.trim())
  formData.append('coin_type', values.coin_type.trim())
  formData.append(
    'coin_series',
    options?.formOptions && options.contentLanguage
      ? resolveCoinSeriesFormValue(
          values.coin_series,
          options.formOptions.series,
          options.contentLanguage,
        )
      : values.coin_series.trim(),
  )
  formData.append('short_description', values.short_description.trim())

  if (COIN_FORM_SUPPORTS_POST_SLUG && options?.postSlug?.trim()) {
    formData.append('post_slug', options.postSlug.trim())
  }

  const includeEmptyOptionalFields = options?.includeEmptyOptionalFields ?? false

  for (const key of OPTIONAL_STRING_FIELDS) {
    const value = values[key].trim()
    if (value || includeEmptyOptionalFields || key === 'coin_historical_background') {
      formData.append(key, value)
    }
  }

  const issueStatus = values.coin_issue_status.trim()
  if (issueStatus || includeEmptyOptionalFields) {
    formData.append('coin_issue_status', issueStatus)
  }

  if (options?.isAdmin) {
    appendBooleanField(formData, 'coin_is_published_catalogue', values.coin_is_published_catalogue)
    appendBooleanField(formData, 'coin_is_featured', values.coin_is_featured)
    appendBooleanField(formData, 'coin_is_app_enabled', values.coin_is_app_enabled)
    formData.append('coin_record_status', values.coin_record_status)
  }

  if (images?.obverse) {
    appendObverseImageFields(formData, images.obverse, images.oldObverseImageId ?? null)
  }

  if (images?.reverse) {
    appendReverseImageFields(formData, images.reverse, images.oldReverseImageId ?? null)
  }

  if (images?.replaceGallery) {
    appendReplaceGalleryFields(formData, images.replaceGallery)
  }

  if (images?.gallery?.length) {
    for (const file of images.gallery) {
      formData.append('gallery_images[]', file)
    }
  }

  if (images?.removeGalleryImageIds?.length) {
    for (const id of images.removeGalleryImageIds) {
      formData.append('remove_gallery_image_ids[]', String(id))
    }
  }

  if (images?.deleteGalleryAttachmentIds?.length) {
    for (const id of images.deleteGalleryAttachmentIds) {
      formData.append('delete_gallery_attachment_ids[]', String(id))
    }
  }

  appendMintFormData(formData, values, includeEmptyOptionalFields)
}

function appendCleanupOldAttachment(formData: FormData): void {
  formData.append('cleanup_old_attachment', '1')
}

function appendObverseImageFields(
  formData: FormData,
  file: File,
  oldAttachmentId?: number | null,
): void {
  formData.append('obverse_image', file, file.name)

  if (oldAttachmentId && oldAttachmentId > 0) {
    formData.append('old_obverse_image_id', String(oldAttachmentId))
    appendCleanupOldAttachment(formData)
  }
}

function appendReverseImageFields(
  formData: FormData,
  file: File,
  oldAttachmentId?: number | null,
): void {
  formData.append('reverse_image', file, file.name)

  if (oldAttachmentId && oldAttachmentId > 0) {
    formData.append('old_reverse_image_id', String(oldAttachmentId))
    appendCleanupOldAttachment(formData)
  }
}

function appendReplaceGalleryFields(
  formData: FormData,
  replacement: NonNullable<CoinFormImages['replaceGallery']>,
): void {
  formData.append('replace_gallery_image_id', String(replacement.imageId))
  formData.append('replace_gallery_image', replacement.file, replacement.file.name)
  appendCleanupOldAttachment(formData)
}

function appendImageFields(
  formData: FormData,
  images: Pick<
    CoinFormImages,
    | 'obverse'
    | 'reverse'
    | 'oldObverseImageId'
    | 'oldReverseImageId'
    | 'gallery'
    | 'removeGalleryImageIds'
    | 'replaceGallery'
    | 'deleteGalleryAttachmentIds'
  >,
  submission?: CoinSubmissionDetail,
): void {
  if (images.obverse) {
    appendObverseImageFields(
      formData,
      images.obverse,
      images.oldObverseImageId ?? submission?.images.obverse?.id ?? null,
    )
  }

  if (images.reverse) {
    appendReverseImageFields(
      formData,
      images.reverse,
      images.oldReverseImageId ?? submission?.images.reverse?.id ?? null,
    )
  }

  if (images.replaceGallery) {
    appendReplaceGalleryFields(formData, images.replaceGallery)
  }

  if (images.gallery?.length) {
    for (const file of images.gallery) {
      formData.append('gallery_images[]', file, file.name)
    }
  }

  if (images.removeGalleryImageIds?.length) {
    for (const id of images.removeGalleryImageIds) {
      formData.append('remove_gallery_image_ids[]', String(id))
    }
  }

  if (images.deleteGalleryAttachmentIds?.length) {
    for (const id of images.deleteGalleryAttachmentIds) {
      formData.append('delete_gallery_attachment_ids[]', String(id))
    }
  }
}

/** Backend update requires core fields; echo current submission values unchanged. */
export function appendSubmissionImageUpdateFormData(
  formData: FormData,
  submission: CoinSubmissionDetail,
  images: Pick<
    CoinFormImages,
    | 'obverse'
    | 'reverse'
    | 'oldObverseImageId'
    | 'oldReverseImageId'
    | 'gallery'
    | 'removeGalleryImageIds'
    | 'replaceGallery'
    | 'deleteGalleryAttachmentIds'
  >,
): void {
  formData.append('title', submission.title.trim())
  formData.append('country', submission.country.trim())
  formData.append('year', String(submission.year))
  formData.append('denomination', submission.denomination.trim())
  formData.append('coin_type', submission.coin_type.trim())
  formData.append('coin_series', (submission.coin_series ?? '').trim())
  formData.append('short_description', submission.short_description.trim())

  appendImageFields(formData, images, submission)
}

export const TWO_EURO_DEFAULT_SPECIFICATIONS = {
  coin_material: 'Bimetall (Nickelmessing / Kupfernickel)',
  coin_weight_g: '8.50',
  coin_diameter_mm: '25.75',
  coin_thickness_mm: '2.20',
  coin_quality: 'UNC',
} as const satisfies Partial<CoinFormValues>

export type TwoEuroDefaultSpecField = keyof typeof TWO_EURO_DEFAULT_SPECIFICATIONS

export type SpecificationDisplayField = TwoEuroDefaultSpecField

export function shouldUseTwoEuroSpecificationDisplayFallback(
  values: CoinFormValues,
  mode: 'new' | 'edit' = 'new',
): boolean {
  if (mode === 'new') {
    return true
  }

  const denomination = values.denomination.trim().toLowerCase()
  return denomination.includes('2') && denomination.includes('euro')
}

export function getSpecificationDisplayValue(
  values: CoinFormValues,
  field: SpecificationDisplayField,
  options: { mode?: 'new' | 'edit' } = {},
): string {
  const raw = String(values[field] ?? '').trim()
  let result = raw

  if (!result && shouldUseTwoEuroSpecificationDisplayFallback(values, options.mode ?? 'new')) {
    result = TWO_EURO_DEFAULT_SPECIFICATIONS[field]
  }

  if (field === 'coin_quality' && result) {
    return getCoinQualityDisplayLabel(result) || result
  }

  return result
}

export function applyResolvedTaxonomyValues(
  values: CoinFormValues,
  formOptions: FormOptions,
  contentLanguage: ContentLanguage,
): CoinFormValues {
  return {
    ...values,
    country: resolveTaxonomyFormValue(values.country, formOptions.countries),
    denomination: resolveTaxonomyFormValue(values.denomination, formOptions.values),
    coin_type: resolveTaxonomyFormValue(values.coin_type, formOptions.types),
    coin_series: resolveCoinSeriesFormValue(
      values.coin_series,
      formOptions.series,
      contentLanguage,
    ),
  }
}

export function createNewCoinFormValues(): CoinFormValues {
  return {
    ...EMPTY_COIN_FORM_VALUES,
    ...TWO_EURO_DEFAULT_SPECIFICATIONS,
  }
}

export const NEW_COIN_FORM_INITIAL_VALUES = createNewCoinFormValues()

export const MATERIAL_PRESET_OPTIONS = [
  'Bimetall (Nickelmessing / Kupfernickel)',
  'Silber',
  'Gold',
  'Kupfernickel',
  'Sonstiges',
] as const

export function getCoinQualitySelectOptions(): Array<{ value: string; label: string }> {
  return [
    { value: '', label: i18n.t('coin.quality.selectOptional') },
    ...COIN_QUALITY_OPTIONS.map((option) => ({
      value: option,
      label: getCoinQualityDisplayLabel(option),
    })),
  ]
}

export function getCoinIssueStatusSelectOptions(): Array<{ value: string; label: string }> {
  return [
    { value: '', label: i18n.t('coin.issueStatus.selectOptional') },
    ...COIN_ISSUE_STATUS_OPTIONS.map((option) => ({
      value: option,
      label: i18n.t(`coin.issueStatus.${option}`),
    })),
  ]
}

export function getFilledTwoEuroSpecFields(values: CoinFormValues): TwoEuroDefaultSpecField[] {
  return (Object.keys(TWO_EURO_DEFAULT_SPECIFICATIONS) as TwoEuroDefaultSpecField[]).filter(
    (field) => String(values[field] ?? '').trim() !== '',
  )
}

export function buildTwoEuroSpecUpdates(
  values: CoinFormValues,
  overwrite: boolean,
): Partial<Pick<CoinFormValues, TwoEuroDefaultSpecField>> {
  const updates: Partial<Pick<CoinFormValues, TwoEuroDefaultSpecField>> = {}

  if (overwrite || !values.coin_material.trim()) {
    updates.coin_material = TWO_EURO_DEFAULT_SPECIFICATIONS.coin_material
  }
  if (overwrite || !values.coin_weight_g.trim()) {
    updates.coin_weight_g = TWO_EURO_DEFAULT_SPECIFICATIONS.coin_weight_g
  }
  if (overwrite || !values.coin_diameter_mm.trim()) {
    updates.coin_diameter_mm = TWO_EURO_DEFAULT_SPECIFICATIONS.coin_diameter_mm
  }
  if (overwrite || !values.coin_thickness_mm.trim()) {
    updates.coin_thickness_mm = TWO_EURO_DEFAULT_SPECIFICATIONS.coin_thickness_mm
  }
  if (overwrite || !values.coin_quality) {
    updates.coin_quality = TWO_EURO_DEFAULT_SPECIFICATIONS.coin_quality
  }

  return updates
}
