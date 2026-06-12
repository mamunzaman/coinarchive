import type { TaxonomyOption } from '../types/formOptions'

const RELEASE_DATE_PLACEHOLDER = '[RELEASE_DATE]'
const DEFAULT_SUFFIX_PREVIEW = '001'

const COUNTRY_ISO_CODE_BY_NAME: Record<string, string> = {
  Germany: 'DE',
  France: 'FR',
  Italy: 'IT',
  Spain: 'ES',
  Belgium: 'BE',
  Netherlands: 'NL',
  Austria: 'AT',
  Finland: 'FI',
  Ireland: 'IE',
  Portugal: 'PT',
  Greece: 'GR',
  Luxembourg: 'LU',
  Malta: 'MT',
  Slovenia: 'SI',
  Slovakia: 'SK',
  Estonia: 'EE',
  Latvia: 'LV',
  Lithuania: 'LT',
  Cyprus: 'CY',
  Monaco: 'MC',
  'San Marino': 'SM',
  'Vatican City': 'VA',
  Andorra: 'AD',
  Croatia: 'HR',
}

export type CoinCodePreviewResult = {
  coinCode: string
  releaseDateMissing: boolean
  baseComplete: boolean
}

function normalizeCoinCodePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

function isValidDateParts(year: string, month: string, day: string): boolean {
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

export function normalizeReleaseDate(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  if (/^\d{8}$/.test(trimmed)) {
    const year = trimmed.slice(0, 4)
    const month = trimmed.slice(4, 6)
    const day = trimmed.slice(6, 8)
    return isValidDateParts(year, month, day) ? trimmed : ''
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch && isValidDateParts(isoMatch[1], isoMatch[2], isoMatch[3])) {
    return `${isoMatch[1]}${isoMatch[2]}${isoMatch[3]}`
  }

  const euMatch = trimmed.match(/^(\d{2})[./](\d{2})[./](\d{4})$/)
  if (euMatch && isValidDateParts(euMatch[3], euMatch[2], euMatch[1])) {
    return `${euMatch[3]}${euMatch[2]}${euMatch[1]}`
  }

  return ''
}

function normalizeCountryLookupKey(value: string): string {
  return value.trim().toLowerCase()
}

function buildCountryIsoLookup(): Map<string, string> {
  const map = new Map<string, string>()

  for (const [name, code] of Object.entries(COUNTRY_ISO_CODE_BY_NAME)) {
    map.set(normalizeCountryLookupKey(name), code)
    map.set(normalizeCountryLookupKey(name).replace(/\s+/g, '-'), code)
    map.set(code.toLowerCase(), code)
  }

  return map
}

const COUNTRY_ISO_LOOKUP = buildCountryIsoLookup()

function lookupCountryIso(value: string): string | undefined {
  const key = normalizeCountryLookupKey(value)
  return COUNTRY_ISO_LOOKUP.get(key) ?? COUNTRY_ISO_LOOKUP.get(key.replace(/\s+/g, '-'))
}

function getTaxonomyOptionValue(option: TaxonomyOption): string | undefined {
  const extended = option as TaxonomyOption & { value?: string }
  return typeof extended.value === 'string' ? extended.value : undefined
}

function isIsoCountryCode(value: string): boolean {
  return /^[A-Z]{2}$/.test(normalizeCoinCodePart(value))
}

function resolveCountryCode(country: string, countries: TaxonomyOption[]): string {
  const trimmed = country.trim()
  if (!trimmed) {
    return ''
  }

  if (isIsoCountryCode(trimmed)) {
    return normalizeCoinCodePart(trimmed)
  }

  const directMapHit = lookupCountryIso(trimmed)
  if (directMapHit) {
    return directMapHit
  }

  const inputKey = normalizeCountryLookupKey(trimmed)
  const match = countries.find((option) => {
    const value = getTaxonomyOptionValue(option)
    return (
      normalizeCountryLookupKey(option.name) === inputKey ||
      normalizeCountryLookupKey(option.slug) === inputKey ||
      (value ? normalizeCountryLookupKey(value) === inputKey : false)
    )
  })

  if (match) {
    if (isIsoCountryCode(match.slug)) {
      return normalizeCoinCodePart(match.slug)
    }

    const optionValue = getTaxonomyOptionValue(match)
    if (optionValue && isIsoCountryCode(optionValue)) {
      return normalizeCoinCodePart(optionValue)
    }

    const fromName = lookupCountryIso(match.name)
    if (fromName) {
      return fromName
    }

    const fromSlug = lookupCountryIso(match.slug)
    if (fromSlug) {
      return fromSlug
    }

    if (optionValue) {
      const fromValue = lookupCountryIso(optionValue)
      if (fromValue) {
        return fromValue
      }
    }
  }

  const normalized = normalizeCoinCodePart(trimmed)
  if (normalized.length >= 2) {
    return normalized.slice(0, 2)
  }

  return normalized
}

function normalizeSuffixPreview(suffix?: string): string {
  const normalized = normalizeCoinCodePart(suffix ?? DEFAULT_SUFFIX_PREVIEW)
  return normalized || DEFAULT_SUFFIX_PREVIEW
}

export function generateCoinCodePreview(
  country: string,
  year: string,
  denomination: string,
  coinType: string,
  countries: TaxonomyOption[] = [],
  releaseDate = '',
  suffix?: string,
): CoinCodePreviewResult {
  const countryCode = resolveCountryCode(country, countries)
  const yearPart = Number.parseInt(year, 10)
  const valuePart = normalizeCoinCodePart(denomination)
  const typePart = normalizeCoinCodePart(coinType)
  const baseComplete = Boolean(countryCode && yearPart > 0 && valuePart && typePart)

  if (!baseComplete) {
    return {
      coinCode: '',
      releaseDateMissing: !normalizeReleaseDate(releaseDate),
      baseComplete: false,
    }
  }

  const base = `${countryCode}-${yearPart}-${valuePart}-${typePart}`
  const normalizedReleaseDate = normalizeReleaseDate(releaseDate)
  const releaseDateMissing = !normalizedReleaseDate
  const releasePart = normalizedReleaseDate || RELEASE_DATE_PLACEHOLDER
  const suffixPart = normalizeSuffixPreview(suffix)

  const coinCode = `${base}-${releasePart}-${suffixPart}`

  return {
    coinCode,
    releaseDateMissing,
    baseComplete: true,
  }
}
