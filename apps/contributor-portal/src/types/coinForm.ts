import {
  getStaticCoinSeriesOptions,
  resolveCoinSeriesFormValue,
} from './formOptions'

export const COIN_RECORD_STATUS_OPTIONS = ['active', 'hidden', 'deprecated'] as const

export type CoinRecordStatus = (typeof COIN_RECORD_STATUS_OPTIONS)[number]

export const COIN_ISSUE_STATUS_OPTIONS = [
  'scheduled',
  'released',
  'withdrawn',
  'cancelled',
] as const

export type CoinIssueStatus = (typeof COIN_ISSUE_STATUS_OPTIONS)[number] | ''

export const CONTENT_LANGUAGE_OPTIONS = ['de', 'en'] as const

export type ContentLanguage = (typeof CONTENT_LANGUAGE_OPTIONS)[number]

export const COIN_QUALITY_OPTIONS = ['UNC', 'BU', 'Proof', 'Circulated'] as const

export type CoinQuality = (typeof COIN_QUALITY_OPTIONS)[number] | ''

export const MINT_MARK_CODES = ['A', 'D', 'F', 'G', 'J'] as const

export type MintMarkCodeValue = (typeof MINT_MARK_CODES)[number]

export const MINT_MARK_CODE_OPTIONS: ReadonlyArray<{
  value: MintMarkCodeValue
  label: string
}> = [
  { value: 'A', label: 'Berlin' },
  { value: 'D', label: 'Munich' },
  { value: 'F', label: 'Stuttgart' },
  { value: 'G', label: 'Karlsruhe' },
  { value: 'J', label: 'Hamburg' },
]

const MINT_MARK_LABEL_TO_CODE: Record<string, MintMarkCodeValue> = {
  Berlin: 'A',
  Munich: 'D',
  Stuttgart: 'F',
  Karlsruhe: 'G',
  Hamburg: 'J',
}

const MINT_MARK_CODE_TO_LABEL: Record<MintMarkCodeValue, string> = {
  A: 'Berlin',
  D: 'Munich',
  F: 'Stuttgart',
  G: 'Karlsruhe',
  J: 'Hamburg',
}

export function isKnownMintMarkCode(value: string): value is MintMarkCodeValue {
  return MINT_MARK_CODES.includes(value as MintMarkCodeValue)
}

export function normalizeMintMarkCode(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  if (isKnownMintMarkCode(trimmed)) {
    return trimmed
  }

  return MINT_MARK_LABEL_TO_CODE[trimmed] ?? trimmed
}

export function getMintMarkLabel(code: string): string | undefined {
  const normalized = normalizeMintMarkCode(code)
  if (!isKnownMintMarkCode(normalized)) {
    return undefined
  }

  return MINT_MARK_CODE_TO_LABEL[normalized]
}

export function formatMintMarkDisplay(code: string): string {
  const normalized = normalizeMintMarkCode(code)
  if (!normalized) {
    return ''
  }

  const label = getMintMarkLabel(normalized)
  return label ? `${normalized} · ${label}` : normalized
}

export type MintVariantRow = {
  clientId?: string
  mintMarkCode: string
  mintMintage: string
  mintNotes: string
}

export type MintVariantAcf = {
  mint_mark_code?: string
  mint_mintage?: string | number
  mint_notes?: string
}

export const EMPTY_MINT_VARIANT_ROW: MintVariantRow = {
  mintMarkCode: '',
  mintMintage: '',
  mintNotes: '',
}

export function createEmptyMintVariantRow(): MintVariantRow {
  return {
    clientId: crypto.randomUUID(),
    ...EMPTY_MINT_VARIANT_ROW,
  }
}

export function ensureMintVariantClientIds(rows: MintVariantRow[]): MintVariantRow[] {
  return rows.map((row) =>
    row.clientId ? row : { ...row, clientId: crypto.randomUUID() },
  )
}

export type CoinFormValues = {
  content_language: ContentLanguage
  title: string
  country: string
  year: string
  denomination: string
  coin_type: string
  coin_series: string
  short_description: string
  coin_designer: string
  coin_theme: string
  released_date: string
  coin_issue_status: CoinIssueStatus
  coin_source_name: string
  coin_source_url: string
  coin_mintage: string
  coin_material: string
  coin_quality: CoinQuality
  coin_weight_g: string
  coin_diameter_mm: string
  coin_thickness_mm: string
  coin_edge_inscription: string
  coin_obverse_description: string
  coin_reverse_description: string
  coin_historical_background: string
  coin_collector_notes: string
  coin_is_published_catalogue: boolean
  coin_is_featured: boolean
  coin_is_app_enabled: boolean
  coin_record_status: CoinRecordStatus
  hasMintVariants: boolean
  singleMintMark: string
  mintMarksAvailable: string
  mintVariants: MintVariantRow[]
}

export const REVIEW_EMPTY_VALUE = 'Not provided'

export const REVIEW_DEFAULT_IMAGE_NOTE = 'Will use WordPress default image'

export function formatMintStatusLabel(hasMintVariants: boolean): string {
  return hasMintVariants ? 'Multiple mint variants' : 'Single mint'
}

export type CoinAcfDetail = {
  coin_code?: string
  /** Legacy alias; mirrors coin_code on older API responses */
  unique_code?: string
  coin_theme?: string
  coin_designer?: string
  coin_issue_status?: string
  coin_source_name?: string
  coin_source_url?: string
  coin_country_code?: string
  coin_year?: number
  coin_short_description?: string
  released_date?: string
  coin_mintage?: string
  coin_material?: string
  coin_quality?: string
  coin_weight_g?: number | null
  coin_diameter_mm?: number | null
  coin_thickness_mm?: number | null
  coin_edge_inscription?: string
  coin_obverse_description?: string
  coin_reverse_description?: string
  coin_historical_background?: string
  coin_collector_notes?: string
  content_language?: string
  ai_assisted?: boolean
  aiAssisted?: boolean
  coin_is_published_catalogue?: number | boolean
  coin_is_featured?: number | boolean
  coin_is_app_enabled?: number | boolean
  coin_record_status?: string
  has_mint_variants?: number | boolean
  coin_has_mint_variants?: number | boolean
  single_mint_mark?: string
  coin_single_mint_mark?: string
  mint_marks_available?: string
  coin_mint_marks_available?: string
  mint_variants?: MintVariantAcf[]
  coin_mint_variants?: MintVariantAcf[]
}

export const EMPTY_COIN_FORM_VALUES: CoinFormValues = {
  content_language: 'de',
  title: '',
  country: '',
  year: '',
  denomination: '',
  coin_type: '',
  coin_series: '',
  short_description: '',
  coin_designer: '',
  coin_theme: '',
  released_date: '',
  coin_issue_status: '',
  coin_source_name: '',
  coin_source_url: '',
  coin_mintage: '',
  coin_material: '',
  coin_quality: '',
  coin_weight_g: '',
  coin_diameter_mm: '',
  coin_thickness_mm: '',
  coin_edge_inscription: '',
  coin_obverse_description: '',
  coin_reverse_description: '',
  coin_historical_background: '',
  coin_collector_notes: '',
  coin_is_published_catalogue: false,
  coin_is_featured: false,
  coin_is_app_enabled: true,
  coin_record_status: 'active',
  hasMintVariants: false,
  singleMintMark: '',
  mintMarksAvailable: '',
  mintVariants: [],
}

export type GalleryReplacement = {
  imageId: number
  file: File
}

export type CoinFormImages = {
  obverse?: File | null
  reverse?: File | null
  oldObverseImageId?: number
  oldReverseImageId?: number
  gallery?: File[]
  removeGalleryImageIds?: number[]
  replaceGallery?: GalleryReplacement
  deleteGalleryAttachmentIds?: number[]
}

export type CoinSubmissionSource = {
  id: number
  title: string
  status: string
  date?: string
  country: string
  denomination: string
  coin_type: string
  coin_series?: string
  year: number
  short_description: string
  content_language?: string
  content_language_label?: string
  content_language_badge?: string
  acf?: CoinAcfDetail
}

function stringFromNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
}

function qualityFromAcf(value: string | undefined): CoinQuality {
  if (!value) {
    return ''
  }
  return COIN_QUALITY_OPTIONS.includes(value as (typeof COIN_QUALITY_OPTIONS)[number])
    ? (value as CoinQuality)
    : ''
}

function acfBoolean(value: number | boolean | undefined, fallback = false): boolean {
  if (value === undefined || value === null) {
    return fallback
  }

  if (typeof value === 'boolean') {
    return value
  }

  return Number(value) === 1
}

function recordStatusFromAcf(value: string | undefined): CoinRecordStatus {
  if (value && COIN_RECORD_STATUS_OPTIONS.includes(value as CoinRecordStatus)) {
    return value as CoinRecordStatus
  }

  return 'active'
}

function issueStatusFromAcf(value: string | undefined): CoinIssueStatus {
  if (value && COIN_ISSUE_STATUS_OPTIONS.includes(value as (typeof COIN_ISSUE_STATUS_OPTIONS)[number])) {
    return value as CoinIssueStatus
  }

  return ''
}

export function isMintVariantRowFilled(row: MintVariantRow): boolean {
  return Boolean(row.mintMarkCode.trim() || row.mintMintage.trim() || row.mintNotes.trim())
}

export function stripEmptyMintVariantRows(values: CoinFormValues): CoinFormValues {
  if (!values.hasMintVariants) {
    return values
  }

  return {
    ...values,
    mintVariants: values.mintVariants.filter(isMintVariantRowFilled),
  }
}

/** Removes fully empty mint rows before pending/final submit validation and payload. */
export function prepareCoinFormValuesForSubmit(values: CoinFormValues): CoinFormValues {
  return stripEmptyMintVariantRows(values)
}

export function hasMintFormData(values: Pick<
  CoinFormValues,
  'hasMintVariants' | 'singleMintMark' | 'mintMarksAvailable' | 'mintVariants'
>): boolean {
  if (values.hasMintVariants) {
    return true
  }

  if (values.singleMintMark.trim() || values.mintMarksAvailable.trim()) {
    return true
  }

  return values.mintVariants.some(isMintVariantRowFilled)
}

function mintVariantsFromAcf(acf?: CoinAcfDetail): MintVariantRow[] {
  const raw = acf?.mint_variants ?? acf?.coin_mint_variants

  if (!Array.isArray(raw)) {
    return []
  }

  return raw.map((row) => ({
    clientId: crypto.randomUUID(),
    mintMarkCode: normalizeMintMarkCode(row.mint_mark_code ?? ''),
    mintMintage: row.mint_mintage != null ? String(row.mint_mintage) : '',
    mintNotes: row.mint_notes ?? '',
  }))
}

function hasMintVariantsFromAcf(acf?: CoinAcfDetail): boolean {
  if (acf?.has_mint_variants !== undefined) {
    return acfBoolean(acf.has_mint_variants)
  }

  if (acf?.coin_has_mint_variants !== undefined) {
    return acfBoolean(acf.coin_has_mint_variants)
  }

  if (mintVariantsFromAcf(acf).length > 0) {
    return true
  }

  const marksAvailable = acf?.mint_marks_available ?? acf?.coin_mint_marks_available ?? ''
  return Boolean(marksAvailable.trim())
}

export function applyMintVariantsModeChange(
  current: CoinFormValues,
  hasMintVariants: boolean,
): Pick<CoinFormValues, 'hasMintVariants' | 'singleMintMark' | 'mintMarksAvailable' | 'mintVariants'> {
  if (hasMintVariants) {
    return {
      hasMintVariants: true,
      singleMintMark: '',
      mintMarksAvailable: current.mintMarksAvailable,
      mintVariants: ensureMintVariantClientIds(
        current.mintVariants.filter(isMintVariantRowFilled),
      ),
    }
  }

  return {
    hasMintVariants: false,
    singleMintMark: current.singleMintMark,
    mintMarksAvailable: '',
    mintVariants: [],
  }
}

function contentLanguageFromSubmission(source: CoinSubmissionSource): ContentLanguage {
  const fromTop = source.content_language?.trim().toLowerCase()
  if (fromTop === 'en' || fromTop === 'de') {
    return fromTop
  }

  const fromBadge = source.content_language_badge?.trim().toUpperCase()
  if (fromBadge === 'EN') {
    return 'en'
  }
  if (fromBadge === 'DE') {
    return 'de'
  }

  return source.acf?.content_language === 'en' ? 'en' : 'de'
}

export function coinFormValuesFromSubmission(source: CoinSubmissionSource): CoinFormValues {
  const acf = source.acf
  const contentLanguage = contentLanguageFromSubmission(source)
  const seriesOptions = getStaticCoinSeriesOptions(contentLanguage)
  const extended = source as CoinSubmissionSource & {
    coin_designer?: string
    coin_issue_status?: string
    coin_source_name?: string
    coin_source_url?: string
  }

  return {
    content_language: contentLanguage,
    title: source.title,
    country: source.country,
    year: source.year ? String(source.year) : '',
    denomination: source.denomination,
    coin_type: source.coin_type,
    coin_series: resolveCoinSeriesFormValue(source.coin_series ?? '', seriesOptions, contentLanguage),
    short_description: source.short_description,
    coin_designer: acf?.coin_designer ?? extended.coin_designer ?? '',
    coin_theme: acf?.coin_theme ?? '',
    released_date: acf?.released_date ?? '',
    coin_issue_status: issueStatusFromAcf(acf?.coin_issue_status ?? extended.coin_issue_status),
    coin_source_name: acf?.coin_source_name ?? extended.coin_source_name ?? '',
    coin_source_url: acf?.coin_source_url ?? extended.coin_source_url ?? '',
    coin_mintage: acf?.coin_mintage ?? '',
    coin_material: acf?.coin_material ?? '',
    coin_quality: qualityFromAcf(acf?.coin_quality),
    coin_weight_g: stringFromNumber(acf?.coin_weight_g),
    coin_diameter_mm: stringFromNumber(acf?.coin_diameter_mm),
    coin_thickness_mm: stringFromNumber(acf?.coin_thickness_mm),
    coin_edge_inscription: acf?.coin_edge_inscription ?? '',
    coin_obverse_description: acf?.coin_obverse_description ?? '',
    coin_reverse_description: acf?.coin_reverse_description ?? '',
    coin_historical_background: acf?.coin_historical_background ?? '',
    coin_collector_notes: acf?.coin_collector_notes ?? '',
    coin_is_published_catalogue: acfBoolean(acf?.coin_is_published_catalogue),
    coin_is_featured: acfBoolean(acf?.coin_is_featured),
    coin_is_app_enabled: acfBoolean(acf?.coin_is_app_enabled, true),
    coin_record_status: recordStatusFromAcf(acf?.coin_record_status),
    hasMintVariants: hasMintVariantsFromAcf(acf),
    singleMintMark: acf?.single_mint_mark ?? acf?.coin_single_mint_mark ?? '',
    mintMarksAvailable: acf?.mint_marks_available ?? acf?.coin_mint_marks_available ?? '',
    mintVariants: mintVariantsFromAcf(acf),
  }
}

export function mergeSubmissionWithAcf<T extends CoinSubmissionSource>(
  submission: T,
  acf?: CoinAcfDetail,
): T & { acf?: CoinAcfDetail } {
  return {
    ...submission,
    acf: acf ?? submission.acf,
  }
}
