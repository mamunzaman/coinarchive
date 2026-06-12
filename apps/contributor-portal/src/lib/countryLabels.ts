import i18n from '../i18n'

type CountryLabelEntry = {
  de: string
  en: string
}

const COUNTRY_LABELS: Record<string, CountryLabelEntry> = {
  germany: { de: 'Deutschland', en: 'Germany' },
  france: { de: 'Frankreich', en: 'France' },
  austria: { de: 'Österreich', en: 'Austria' },
  italy: { de: 'Italien', en: 'Italy' },
  spain: { de: 'Spanien', en: 'Spain' },
  portugal: { de: 'Portugal', en: 'Portugal' },
  netherlands: { de: 'Niederlande', en: 'Netherlands' },
  belgium: { de: 'Belgien', en: 'Belgium' },
  luxembourg: { de: 'Luxemburg', en: 'Luxembourg' },
  ireland: { de: 'Irland', en: 'Ireland' },
  finland: { de: 'Finnland', en: 'Finland' },
  greece: { de: 'Griechenland', en: 'Greece' },
  cyprus: { de: 'Zypern', en: 'Cyprus' },
  malta: { de: 'Malta', en: 'Malta' },
  slovenia: { de: 'Slowenien', en: 'Slovenia' },
  slovakia: { de: 'Slowakei', en: 'Slovakia' },
  estonia: { de: 'Estland', en: 'Estonia' },
  latvia: { de: 'Lettland', en: 'Latvia' },
  lithuania: { de: 'Litauen', en: 'Lithuania' },
  croatia: { de: 'Kroatien', en: 'Croatia' },
}

function normalizeCountryKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

export function getCountryDisplayLabel(
  value: string,
  language: string = i18n.language,
): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  const key = normalizeCountryKey(trimmed)
  const mapped = COUNTRY_LABELS[key]
  if (!mapped) {
    return trimmed
  }

  return language.startsWith('en') ? mapped.en : mapped.de
}
