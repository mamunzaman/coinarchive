import type { ContentLanguage } from './coinForm'

export type TaxonomyOption = {
  id: number
  name: string
  slug: string
}

export type DefaultImageRef = {
  id: number
  url: string
  thumb_url?: string
}

export type DefaultImages = {
  obverse: DefaultImageRef | null
  reverse: DefaultImageRef | null
}

export type FormOptions = {
  countries: TaxonomyOption[]
  values: TaxonomyOption[]
  types: TaxonomyOption[]
  series: TaxonomyOption[]
}

export const TAXONOMY_OTHER_VALUE = '__other__'

export const TAXONOMY_OPTIONS_FAILED_MESSAGE =
  'Options could not be loaded. Please refresh and try again.'

export const TAXONOMY_INVALID_OPTION_MESSAGE = 'Please select a valid existing option.'

export const TAXONOMY_STALE_VALUE_MESSAGE =
  'This saved value is no longer available in the taxonomy list. Please choose a valid option.'

export function isKnownTaxonomyOption(value: string, options: TaxonomyOption[]): boolean {
  return Boolean(findTaxonomyOption(value, options))
}

export function findTaxonomyOption(
  value: string,
  options: TaxonomyOption[],
): TaxonomyOption | undefined {
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }

  const lower = trimmed.toLowerCase()
  return options.find(
    (option) =>
      option.name === trimmed ||
      option.name.toLowerCase() === lower ||
      option.slug === trimmed ||
      option.slug.toLowerCase() === lower,
  )
}

export function resolveTaxonomyFormValue(value: string, options: TaxonomyOption[]): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  return findTaxonomyOption(trimmed, options)?.name ?? trimmed
}

function normalizeCoinSeriesLookupValue(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  const lower = trimmed.toLowerCase()
  return COIN_SERIES_LEGACY_ALIASES[lower] ?? trimmed
}

export function findStaticCoinSeriesMatch(
  value: string,
): (typeof STATIC_COIN_SERIES)[number] | undefined {
  const trimmed = normalizeCoinSeriesLookupValue(value)
  if (!trimmed) {
    return undefined
  }

  const lower = trimmed.toLowerCase()
  return STATIC_COIN_SERIES.find(
    (item) =>
      item.slug === lower ||
      item.slug === trimmed ||
      item.en.toLowerCase() === lower ||
      item.de.toLowerCase() === lower ||
      item.en === trimmed ||
      item.de === trimmed,
  )
}

export function resolveCoinSeriesFormValue(
  value: string,
  options: TaxonomyOption[],
  contentLanguage: ContentLanguage,
): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  const match = findTaxonomyOption(trimmed, options)
  if (match) {
    return match.name
  }

  const staticMatch = findStaticCoinSeriesMatch(trimmed)
  if (staticMatch) {
    return contentLanguage === 'en' ? staticMatch.en : staticMatch.de
  }

  return trimmed
}

export function isRecognizedCoinSeriesValue(
  value: string,
  options: TaxonomyOption[],
): boolean {
  const trimmed = value.trim()
  if (!trimmed) {
    return false
  }

  return Boolean(findTaxonomyOption(trimmed, options) ?? findStaticCoinSeriesMatch(trimmed))
}

export function getTaxonomySelectValue(value: string, options: TaxonomyOption[]): string {
  if (!value.trim()) {
    return ''
  }

  if (isKnownTaxonomyOption(value, options)) {
    return value.trim()
  }

  return TAXONOMY_OTHER_VALUE
}

export const EMPTY_FORM_OPTIONS: FormOptions = {
  countries: [],
  values: [],
  types: [],
  series: [],
}

export const EMPTY_DEFAULT_IMAGES: DefaultImages = {
  obverse: null,
  reverse: null,
}

const COIN_SERIES_LEGACY_ALIASES: Record<string, string> = {
  unity: 'unity-and-justice-and-freedom',
  'justice and freedom': 'unity-and-justice-and-freedom',
  'unity, justice and freedom': 'unity-and-justice-and-freedom',
  'unity-justice-and-freedom': 'unity-and-justice-and-freedom',
  'unity-justice-freedom': 'unity-and-justice-and-freedom',
  'einigkeit, recht und freiheit': 'unity-and-justice-and-freedom',
}

const STATIC_COIN_SERIES: Array<{ slug: string; en: string; de: string }> = [
  {
    slug: 'unity-and-justice-and-freedom',
    en: 'Unity and Justice and Freedom',
    de: 'Einigkeit und Recht und Freiheit',
  },
  { slug: 'states-of-germany', en: 'States of Germany', de: 'Bundesländer' },
  { slug: 'erasmus-programme', en: 'Erasmus Programme', de: 'Erasmus-Programm' },
  { slug: 'european-capitals-of-culture', en: 'European Capitals of Culture', de: 'Kulturhauptstädte Europas' },
  { slug: 'olympic-games', en: 'Olympic Games', de: 'Olympische Spiele' },
  { slug: 'unesco-world-heritage', en: 'UNESCO World Heritage', de: 'UNESCO-Welterbe' },
]

export function getStaticCoinSeriesOptions(contentLanguage: ContentLanguage): TaxonomyOption[] {
  return STATIC_COIN_SERIES.map((item, index) => ({
    id: index + 1,
    slug: item.slug,
    name: contentLanguage === 'en' ? item.en : item.de,
  }))
}

export function resolveFormOptions(
  options: FormOptions,
  contentLanguage: ContentLanguage = 'de',
): FormOptions {
  return {
    ...options,
    series:
      options.series.length > 0 ? options.series : getStaticCoinSeriesOptions(contentLanguage),
  }
}
