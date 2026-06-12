import i18n from '../i18n'
import type { CoinQuality } from '../types/coinForm'

function normalizeOptionKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

export function getCoinQualityDisplayLabel(
  value: string,
  language: string = i18n.language,
): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  const key = `coin.quality.${trimmed as CoinQuality}`
  if (i18n.exists(key, { lng: language })) {
    return i18n.t(key, { lng: language })
  }

  return trimmed
}

export function getCoinTypeDisplayLabel(
  value: string,
  language: string = i18n.language,
): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  const slug = normalizeOptionKey(trimmed)
  const key = `coin.type.${slug}`
  if (i18n.exists(key, { lng: language })) {
    return i18n.t(key, { lng: language })
  }

  return trimmed
}

export function getCoinSeriesDisplayLabel(
  value: string,
  language: string = i18n.language,
): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  const slug = normalizeOptionKey(trimmed)
  const keys = [
    `coin.series.${slug}`,
    slug === 'unity_justice_and_freedom' ? 'coin.series.unity_and_justice_and_freedom' : '',
    slug === 'unityandjusticeandfreedom' ? 'coin.series.unity_and_justice_and_freedom' : '',
  ].filter(Boolean)

  for (const key of keys) {
    if (i18n.exists(key, { lng: language })) {
      return i18n.t(key, { lng: language })
    }
  }

  return trimmed
}

export function getCoinIssueStatusDisplayLabel(
  value: string,
  language: string = i18n.language,
): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  const key = `coin.issueStatus.${trimmed}`
  if (i18n.exists(key, { lng: language })) {
    return i18n.t(key, { lng: language })
  }

  return trimmed
}
