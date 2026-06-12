import {
  isKnownMintMarkCode,
  normalizeMintMarkCode,
  type CoinFormValues,
  type MintVariantRow,
} from '../types/coinForm'
import type { FormOptions, TaxonomyOption } from '../types/formOptions'
import {
  normalizeCountryLabel,
  normalizeRichText,
  normalizeTitle,
  normalizeWhitespace,
} from './inputNormalization'

export const AUTO_FORMAT_HINT = 'Cleaned'

export type CoinFormNormalizeContext = {
  formOptions?: FormOptions
}

export type CoinFormCorrection = {
  field: keyof CoinFormValues
  label: string
  original: string
  corrected: string
}

function collapseSpaces(value: string): string {
  return normalizeWhitespace(value)
}

function isValidIsoDateParts(year: string, month: string, day: string): boolean {
  const y = Number.parseInt(year, 10)
  const m = Number.parseInt(month, 10)
  const d = Number.parseInt(day, 10)
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return false
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) {
    return false
  }
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

/** Form format: YYYY-MM-DD. Invalid values are left unchanged for the user to correct. */
export function normalizeReleaseDateForForm(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch && isValidIsoDateParts(isoMatch[1], isoMatch[2], isoMatch[3])) {
    return trimmed
  }

  const compactMatch = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (compactMatch && isValidIsoDateParts(compactMatch[1], compactMatch[2], compactMatch[3])) {
    return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`
  }

  const dateMatch = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/)
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0')
    const month = dateMatch[2].padStart(2, '0')
    const year = dateMatch[3]
    if (isValidIsoDateParts(year, month, day)) {
      return `${year}-${month}-${day}`
    }
  }

  return trimmed
}

function normalizeTitleText(value: string): string {
  return normalizeTitle(value)
}

function matchTaxonomyOption(value: string, options: TaxonomyOption[]): string | null {
  const trimmed = collapseSpaces(value)
  if (!trimmed) {
    return null
  }

  const exact = options.find((option) => option.name === trimmed)
  if (exact) {
    return exact.name
  }

  const lower = trimmed.toLowerCase()
  const caseInsensitive = options.find((option) => option.name.toLowerCase() === lower)
  return caseInsensitive?.name ?? null
}

function normalizeEuroDenomination(value: string): string {
  const trimmed = collapseSpaces(value)
  if (!trimmed) {
    return ''
  }

  const compact = trimmed.replace(/\s+/g, '')
  const euroMatch = compact.match(/^(\d+)(?:€|euro|euros)$/i)
  if (euroMatch) {
    return `${euroMatch[1]} Euro`
  }

  const centMatch = compact.match(/^(\d+)(?:cent|cents)$/i)
  if (centMatch) {
    return `${centMatch[1]} Cent`
  }

  return trimmed
}

export function normalizeCoinQualityLabel(value: string): CoinFormValues['coin_quality'] | string {
  const normalized = collapseSpaces(value)
  const lower = normalized.toLowerCase()

  if (lower === 'unc') {
    return 'UNC'
  }

  if (lower === 'bu') {
    return 'BU'
  }

  if (lower === 'proof') {
    return 'Proof'
  }

  if (lower === 'circulated') {
    return 'Circulated'
  }

  return normalized
}

const COIN_TYPE_LABELS: Record<string, string> = {
  commemorative: 'Commemorative',
  circulation: 'Circulation',
}

function normalizeCoinTypeLabel(value: string, options: TaxonomyOption[]): string {
  const taxonomyMatch = matchTaxonomyOption(value, options)
  if (taxonomyMatch) {
    return taxonomyMatch
  }

  const lower = collapseSpaces(value).toLowerCase()
  return COIN_TYPE_LABELS[lower] ?? collapseSpaces(value)
}

function normalizeDenominationLabel(value: string, options: TaxonomyOption[]): string {
  const taxonomyMatch = matchTaxonomyOption(value, options)
  if (taxonomyMatch) {
    return taxonomyMatch
  }

  return normalizeEuroDenomination(value)
}

export function normalizeIntegerInput(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  if (/^\d+$/.test(trimmed)) {
    return trimmed
  }

  if (/^\d{1,3}(,\d{3})+$/.test(trimmed)) {
    return trimmed.replace(/,/g, '')
  }

  if (/^\d{1,3}(\.\d{3})+$/.test(trimmed)) {
    return trimmed.replace(/\./g, '')
  }

  const digitsOnly = trimmed.replace(/[^\d]/g, '')
  return digitsOnly || trimmed
}

export function normalizeDecimalInput(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  if (/^\d+,\d+$/.test(trimmed)) {
    return trimmed.replace(',', '.')
  }

  if (/^\d+\.\d+$/.test(trimmed) || /^\d+$/.test(trimmed)) {
    return trimmed
  }

  return trimmed
}

export function normalizeMintMarksAvailableInput(value: string): string {
  const uppercased = value.replace(/[a-z]/g, (char) => char.toUpperCase())
  return uppercased.replace(/,\s*([A-Z0-9])/g, ', $1').replace(/\s{2,}/g, ' ')
}

export function normalizeMintMarksAvailable(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  const compact = trimmed.replace(/[\s,]+/g, '').toUpperCase()
  if (compact.length > 0) {
    const letters = compact.split('').filter((char) => isKnownMintMarkCode(char))
    if (letters.length === compact.length) {
      return [...new Set(letters)].join(', ')
    }
  }

  const parts = trimmed.split(/[\s,]+/).filter(Boolean)
  const normalizedParts: string[] = []

  for (const part of parts) {
    const code = normalizeMintMarkCode(part)
    if (isKnownMintMarkCode(code)) {
      normalizedParts.push(code)
    } else {
      normalizedParts.push(part.trim().replace(/\s+/g, ' ').toUpperCase())
    }
  }

  if (normalizedParts.length === 0) {
    return collapseSpaces(trimmed.toUpperCase())
  }

  return [...new Set(normalizedParts)].join(', ')
}

export function normalizeCoinFormField<K extends keyof CoinFormValues>(
  field: K,
  value: CoinFormValues[K],
  context: CoinFormNormalizeContext = {},
): CoinFormValues[K] {
  const options = context.formOptions

  switch (field) {
    case 'title':
      return normalizeTitleText(String(value)) as CoinFormValues[K]
    case 'country':
      return normalizeCountryLabel(String(value), options?.countries ?? []) as CoinFormValues[K]
    case 'denomination':
      return normalizeDenominationLabel(
        String(value),
        options?.values ?? [],
      ) as CoinFormValues[K]
    case 'coin_type':
      return normalizeCoinTypeLabel(String(value), options?.types ?? []) as CoinFormValues[K]
    case 'coin_series':
      return collapseSpaces(String(value)) as CoinFormValues[K]
    case 'coin_designer':
    case 'coin_source_name':
      return collapseSpaces(String(value)) as CoinFormValues[K]
    case 'coin_source_url':
      return String(value).trim() as CoinFormValues[K]
    case 'released_date':
      return normalizeReleaseDateForForm(String(value)) as CoinFormValues[K]
    case 'coin_quality':
      return normalizeCoinQualityLabel(String(value)) as CoinFormValues[K]
    case 'coin_mintage':
    case 'year':
      return normalizeIntegerInput(String(value)) as CoinFormValues[K]
    case 'coin_weight_g':
    case 'coin_diameter_mm':
    case 'coin_thickness_mm':
      return normalizeDecimalInput(String(value)) as CoinFormValues[K]
    case 'mintMarksAvailable':
      return normalizeMintMarksAvailable(String(value)) as CoinFormValues[K]
    case 'singleMintMark': {
      const code = normalizeMintMarkCode(String(value))
      return (isKnownMintMarkCode(code) ? code : collapseSpaces(String(value))) as CoinFormValues[K]
    }
    case 'coin_theme':
    case 'short_description':
    case 'coin_material':
    case 'coin_edge_inscription':
    case 'coin_obverse_description':
    case 'coin_reverse_description':
    case 'coin_collector_notes':
      return normalizeRichText(String(value)) as CoinFormValues[K]
    case 'mintVariants': {
      const rows = value as MintVariantRow[]
      return rows.map((row) => ({
        ...row,
        mintMarkCode: normalizeMintMarkCode(row.mintMarkCode),
        mintMintage: normalizeIntegerInput(row.mintMintage),
        mintNotes: normalizeRichText(row.mintNotes),
      })) as CoinFormValues[K]
    }
    default:
      return value
  }
}

export function getCoinFormFieldCorrection<K extends keyof CoinFormValues>(
  field: K,
  value: CoinFormValues[K],
  context: CoinFormNormalizeContext = {},
): CoinFormCorrection | null {
  const original = String(value ?? '')
  if (!original.trim()) {
    return null
  }

  let corrected: string
  let label: string

  switch (field) {
    case 'country':
      corrected = normalizeCountryLabel(original, context.formOptions?.countries ?? [])
      label = 'Country'
      break
    case 'denomination':
      corrected = normalizeDenominationLabel(original, context.formOptions?.values ?? [])
      label = 'Denomination'
      break
    case 'coin_quality':
      corrected = normalizeCoinQualityLabel(original)
      label = 'Quality'
      break
    case 'released_date':
      corrected = normalizeReleaseDateForForm(original)
      label = 'Release date'
      break
    default:
      return null
  }

  return corrected !== original ? { field, label, original, corrected } : null
}

export function getCoinFormCorrections(
  values: CoinFormValues,
  context: CoinFormNormalizeContext = {},
): CoinFormCorrection[] {
  return [
    getCoinFormFieldCorrection('country', values.country, context),
    getCoinFormFieldCorrection('denomination', values.denomination, context),
    getCoinFormFieldCorrection('coin_quality', values.coin_quality, context),
    getCoinFormFieldCorrection('released_date', values.released_date, context),
  ].filter((correction): correction is CoinFormCorrection => correction !== null)
}

export function normalizeCoinFormValues(
  values: CoinFormValues,
  context: CoinFormNormalizeContext = {},
): CoinFormValues {
  return {
    ...values,
    title: normalizeCoinFormField('title', values.title, context),
    country: normalizeCoinFormField('country', values.country, context),
    year: normalizeCoinFormField('year', values.year, context),
    denomination: normalizeCoinFormField('denomination', values.denomination, context),
    coin_type: normalizeCoinFormField('coin_type', values.coin_type, context),
    coin_series: normalizeCoinFormField('coin_series', values.coin_series, context),
    coin_designer: normalizeCoinFormField('coin_designer', values.coin_designer, context),
    coin_source_name: normalizeCoinFormField('coin_source_name', values.coin_source_name, context),
    coin_source_url: normalizeCoinFormField('coin_source_url', values.coin_source_url, context),
    short_description: normalizeCoinFormField('short_description', values.short_description, context),
    coin_theme: normalizeCoinFormField('coin_theme', values.coin_theme, context),
    released_date: normalizeCoinFormField('released_date', values.released_date, context),
    coin_mintage: normalizeCoinFormField('coin_mintage', values.coin_mintage, context),
    coin_material: normalizeCoinFormField('coin_material', values.coin_material, context),
    coin_quality: normalizeCoinFormField('coin_quality', values.coin_quality, context),
    coin_weight_g: normalizeCoinFormField('coin_weight_g', values.coin_weight_g, context),
    coin_diameter_mm: normalizeCoinFormField('coin_diameter_mm', values.coin_diameter_mm, context),
    coin_thickness_mm: normalizeCoinFormField('coin_thickness_mm', values.coin_thickness_mm, context),
    coin_edge_inscription: normalizeCoinFormField(
      'coin_edge_inscription',
      values.coin_edge_inscription,
      context,
    ),
    coin_obverse_description: normalizeCoinFormField(
      'coin_obverse_description',
      values.coin_obverse_description,
      context,
    ),
    coin_reverse_description: normalizeCoinFormField(
      'coin_reverse_description',
      values.coin_reverse_description,
      context,
    ),
    coin_collector_notes: normalizeCoinFormField(
      'coin_collector_notes',
      values.coin_collector_notes,
      context,
    ),
    singleMintMark: normalizeCoinFormField('singleMintMark', values.singleMintMark, context),
    mintMarksAvailable: normalizeCoinFormField(
      'mintMarksAvailable',
      values.mintMarksAvailable,
      context,
    ),
    mintVariants: normalizeCoinFormField('mintVariants', values.mintVariants, context),
  }
}
