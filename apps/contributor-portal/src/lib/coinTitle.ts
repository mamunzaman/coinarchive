import type { CoinFormValues } from '../types/coinForm'
import {
  normalizeCoinFormValues,
  type CoinFormNormalizeContext,
} from './coinFormNormalize'

const SOFT_MAX_LENGTH = 70
const SLUG_MAX_LENGTH = 90
const DESCRIPTION_SUBJECT_MAX = 45
const EN_DASH = ' – '

const THEME_ACRONYMS = new Set([
  'EU',
  'UEFA',
  'FIFA',
  'UN',
  'WWI',
  'WWII',
  'WW1',
  'WW2',
  'NATO',
  'USA',
  'UK',
])

const THEME_SMALL_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'by',
  'for',
  'from',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
  'vs',
  'vs.',
])

function collapseSpaces(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeEuroDenominationForTitle(value: string): string {
  const trimmed = collapseSpaces(value)
  if (!trimmed) {
    return ''
  }

  const euroMatch = trimmed.match(/^(\d+)\s*(?:€|euro|euros?)$/i)
  if (euroMatch) {
    return `${euroMatch[1]} Euro`
  }

  const euroSymbolMatch = trimmed.match(/^(\d+)€$/i)
  if (euroSymbolMatch) {
    return `${euroSymbolMatch[1]} Euro`
  }

  return trimmed
}

function isCommemorativeCoinType(coinType: string): boolean {
  return coinType.trim().toLowerCase().includes('commemorative')
}

function buildCoinKindLabel(coinType: string): string {
  return isCommemorativeCoinType(coinType) ? 'Commemorative Coin' : 'Coin'
}

function formatThemeWord(word: string, index: number): string {
  const match = word.match(/^([^A-Za-z0-9]*)([A-Za-z0-9]+)([^A-Za-z0-9]*)$/)
  if (!match) {
    return word
  }

  const [, prefix, core, suffix] = match
  const upperCore = core.toUpperCase()

  if (THEME_ACRONYMS.has(upperCore)) {
    return `${prefix}${upperCore}${suffix}`
  }

  if (/^\d+$/.test(core)) {
    return word
  }

  if (core !== core.toLowerCase() && core !== core.toUpperCase()) {
    return word
  }

  if (core === core.toUpperCase() && /[A-Z]/.test(core)) {
    return word
  }

  if (index > 0 && THEME_SMALL_WORDS.has(core.toLowerCase())) {
    return `${prefix}${core.toLowerCase()}${suffix}`
  }

  if (core === core.toLowerCase()) {
    return `${prefix}${core.charAt(0).toUpperCase()}${core.slice(1)}${suffix}`
  }

  return word
}

export function formatTitleTheme(value: string): string {
  const collapsed = collapseSpaces(value)
  if (!collapsed) {
    return ''
  }

  return collapsed.split(' ').map((word, index) => formatThemeWord(word, index)).join(' ')
}

type CoinTitleSubjectSource = CoinFormValues & {
  commemorative_subject?: string
  coin_name?: string
  theme?: string
  series?: string
  description?: string
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, ' ')
}

function firstNonEmptySubject(...candidates: Array<string | undefined>): string {
  for (const candidate of candidates) {
    const trimmed = collapseSpaces(candidate ?? '')
    if (trimmed) {
      return trimmed
    }
  }

  return ''
}

function firstDescriptionPhrase(value: string): string {
  const cleaned = collapseSpaces(stripHtml(value).replace(/[\r\n\t]+/g, ' '))
  if (!cleaned) {
    return ''
  }

  const phraseMatch = cleaned.match(/^[^.!?;]+/)
  let phrase = collapseSpaces(phraseMatch?.[0] ?? cleaned)

  if (phrase.length <= DESCRIPTION_SUBJECT_MAX) {
    return phrase
  }

  phrase = phrase.slice(0, DESCRIPTION_SUBJECT_MAX).trimEnd()
  const lastSpace = phrase.lastIndexOf(' ')
  if (lastSpace >= 20) {
    phrase = phrase.slice(0, lastSpace).trimEnd()
  }

  return phrase
}

function resolveCoinSubjectRaw(values: CoinFormValues): string {
  const source = values as CoinTitleSubjectSource

  const subject = firstNonEmptySubject(
    source.commemorative_subject,
    source.coin_name,
    source.theme,
    source.coin_theme,
    values.coin_series,
  )

  if (subject) {
    return subject
  }

  return firstDescriptionPhrase(source.description ?? source.short_description)
}

function resolveThemeName(values: CoinFormValues): string {
  return formatTitleTheme(resolveCoinSubjectRaw(values))
}

function dedupeCoinWord(title: string): string {
  return title
    .replace(/\bCommemorative Coin Commemorative Coin\b/gi, 'Commemorative Coin')
    .replace(/\bCoin Coin\b/gi, 'Coin')
}

function softLimitTitle(title: string): string {
  if (title.length <= SOFT_MAX_LENGTH) {
    return title
  }

  const dashIndex = title.indexOf(EN_DASH)
  if (dashIndex > 0) {
    const suffix = title.slice(dashIndex)
    const maxPrefixLen = SOFT_MAX_LENGTH - suffix.length
    if (maxPrefixLen >= 15) {
      const prefix = title.slice(0, dashIndex).trim()
      if (prefix.length > maxPrefixLen) {
        return `${prefix.slice(0, maxPrefixLen).trim()}${suffix}`
      }
    }
  }

  return title
}

export function generateCoinPostTitle(
  values: CoinFormValues,
  context: CoinFormNormalizeContext = {},
): string {
  const normalized = normalizeCoinFormValues(values, context)

  const country = collapseSpaces(normalized.country)
  const year = collapseSpaces(normalized.year)
  const denomination = normalizeEuroDenominationForTitle(normalized.denomination)
  const kindLabel = buildCoinKindLabel(normalized.coin_type)
  const themeName = resolveThemeName(normalized)

  const prefixParts = [country, year, denomination, kindLabel].filter(Boolean)
  const prefix = prefixParts.join(' ')

  if (!prefix && !themeName) {
    return 'Untitled Coin'
  }

  if (!prefix) {
    return dedupeCoinWord(themeName)
  }

  let title = themeName ? `${prefix}${EN_DASH}${themeName}` : prefix
  title = dedupeCoinWord(collapseSpaces(title))
  return softLimitTitle(title)
}

export function resolveCoinPostTitle(
  values: CoinFormValues,
  context: CoinFormNormalizeContext = {},
): string {
  const normalized = normalizeCoinFormValues(values, context)
  const trimmed = normalized.title.trim()
  return trimmed || generateCoinPostTitle(normalized, context)
}

export function hasManualTitleOverride(
  titleManualOverride: boolean | undefined,
): boolean {
  return Boolean(titleManualOverride)
}

export function generateCoinPostSlug(title: string): string {
  const trimmed = title.trim()
  if (!trimmed) {
    return ''
  }

  let slug = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  slug = slug
    .replace(/[–—―−]/g, '-')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (slug.length <= SLUG_MAX_LENGTH) {
    return slug
  }

  slug = slug.slice(0, SLUG_MAX_LENGTH).replace(/-+$/g, '')
  const lastHyphen = slug.lastIndexOf('-')
  if (lastHyphen >= 60) {
    slug = slug.slice(0, lastHyphen)
  }

  return slug.replace(/-+$/g, '')
}
