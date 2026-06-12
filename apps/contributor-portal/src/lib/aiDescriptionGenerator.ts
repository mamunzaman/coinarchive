import { resolveContentLanguage } from './contentLanguage'
import {
  buildAiDescriptionPayload,
  buildAiDescriptionPrompt,
  type AiDescriptionPromptInput,
  type AiDescriptionTarget,
} from './aiDescriptionPrompts'
import {
  ApiError,
  generateAiDescriptions,
  type AiDescriptionField,
  type CoinSubmissionDetail,
} from './api'
import type { ContentLanguage } from '../types/coinForm'

export type GeneratedDescriptionKey = AiDescriptionTarget | AiDescriptionField

export type GeneratedDescriptions = Partial<Record<GeneratedDescriptionKey, string>>

export type GenerateDescriptionsRequest = {
  values: AiDescriptionPromptInput
  targets: AiDescriptionTarget[]
  token: string | null
}

export type GenerateDescriptionsResponse = {
  provider: 'wordpress' | 'mock'
  prompts: Record<AiDescriptionTarget, string>
  descriptions: GeneratedDescriptions
}

export type AiDescriptionProvider = {
  generateDescriptions(request: GenerateDescriptionsRequest): Promise<GenerateDescriptionsResponse>
}

const TARGET_TO_FIELD: Record<AiDescriptionTarget, AiDescriptionField> = {
  obverse: 'obverse_description',
  reverse: 'reverse_description',
  historical_background: 'historical_background',
  collector_notes: 'collector_notes',
  seo_description: 'seo_description',
}

const FIELD_TO_TARGET: Record<AiDescriptionField, AiDescriptionTarget> = {
  obverse_description: 'obverse',
  reverse_description: 'reverse',
  historical_background: 'historical_background',
  collector_notes: 'collector_notes',
  seo_description: 'seo_description',
}

const AI_DESCRIPTION_TARGETS = new Set<AiDescriptionTarget>([
  'obverse',
  'reverse',
  'historical_background',
  'collector_notes',
  'seo_description',
])

function normalizeAiDescriptionKey(field: string): AiDescriptionTarget | undefined {
  return (
    FIELD_TO_TARGET[field as AiDescriptionField] ??
    (AI_DESCRIPTION_TARGETS.has(field as AiDescriptionTarget)
      ? (field as AiDescriptionTarget)
      : undefined)
  )
}

function coinLabel(values: AiDescriptionPromptInput, language: ContentLanguage): string {
  const denomination = values.denomination.trim()
  const coinType = values.coin_type.trim()
  const country = values.country.trim()
  const year = values.year.trim()

  if (language === 'de') {
    return `${denomination} ${coinType} aus ${country}, Ausgabejahr ${year}`
  }

  return `${denomination} ${coinType} coin issued by ${country} in ${year}`
}

function subjectLabel(values: AiDescriptionPromptInput, language: ContentLanguage): string {
  return (
    values.coin_theme.trim() ||
    values.short_description.trim() ||
    (language === 'de' ? 'das eingereichte Motiv' : 'the submitted design theme')
  )
}

function toHtmlParagraph(value: string): string {
  if (/<\/?[a-z][\s\S]*>/i.test(value.trim())) {
    return value.trim()
  }

  const escaped = value
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return escaped ? `<p>${escaped}</p>` : ''
}

const GERMAN_FALLBACKS: Partial<Record<AiDescriptionTarget, string>> = {
  obverse:
    'Die Details der Vorderseitengestaltung dieser Münze sind in den verfügbaren Angaben nicht näher beschrieben.',
  reverse:
    'Die Details der Rückseitengestaltung dieser 2-Euro-Münze sind in den verfügbaren Angaben nicht näher beschrieben.',
  collector_notes:
    'Für Sammler sind Erhaltungsgrad, Auflage, Prägestätte und vollständige Dokumentation besonders relevant.',
  seo_description:
    'Deutsche Katalogbeschreibung mit verfügbaren Münzdaten, Bildern und Sammlerhinweisen auf CoinArchive.',
}

const ENGLISH_FALLBACK_PATTERNS = [
  /\bthe obverse design details\b/i,
  /\bthe reverse design details\b/i,
  /\bnot specified in the official release data\b/i,
]

function replaceKnownEnglishFallback(
  target: AiDescriptionTarget,
  value: string,
  language: ContentLanguage,
): string {
  if (language !== 'de' || !ENGLISH_FALLBACK_PATTERNS.some((pattern) => pattern.test(value))) {
    return value
  }

  const fallback = GERMAN_FALLBACKS[target]
  return target === 'historical_background'
    ? toHtmlParagraph(fallback ?? GERMAN_FALLBACKS.obverse ?? '')
    : fallback ?? value
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, ' ')
}

export function looksClearlyEnglishForGerman(value: string | undefined | null): boolean {
  const text = stripHtml(value ?? '').toLowerCase()
  if (!text.trim()) {
    return false
  }

  const words = text.match(/[\p{L}]+/gu) ?? []
  const wordSet = new Set(words)
  const germanMarkers = [
    'der',
    'die',
    'das',
    'und',
    'ist',
    'zeigt',
    'münze',
    'jahr',
    'ausgabe',
    'thema',
    'nicht',
    'angegeben',
  ]
  const hasGermanMarker = germanMarkers.some((marker) => wordSet.has(marker))
  if (hasGermanMarker) {
    return false
  }

  const englishMarkers = [
    /\bthe\s+/,
    /\bcoin\b/,
    /\bdesign\b/,
    /\bdetails\b/,
    /\bofficial release\b/,
    /\bnot specified\b/,
  ]
  const englishMarkerCount = englishMarkers.filter((pattern) => pattern.test(text)).length

  return englishMarkerCount >= 2
}

export function hasGermanLanguageMismatch(descriptions: GeneratedDescriptions): boolean {
  return Object.values(descriptions).some(looksClearlyEnglishForGerman)
}

function mapAiDescriptionsResponse(
  responseDescriptions: Partial<Record<GeneratedDescriptionKey, string>>,
  language: ContentLanguage,
  targets: AiDescriptionTarget[],
): GeneratedDescriptions {
  const descriptions: GeneratedDescriptions = {}

  for (const [field, value] of Object.entries(responseDescriptions)) {
    const target = normalizeAiDescriptionKey(field)

    if (target && typeof value === 'string') {
      const normalized = replaceKnownEnglishFallback(target, value, language)
      descriptions[target] = target === 'historical_background' ? toHtmlParagraph(normalized) : normalized
    }
  }

  if (
    targets.includes('historical_background') &&
    !descriptions.historical_background &&
    responseDescriptions.collector_notes &&
    typeof responseDescriptions.collector_notes === 'string'
  ) {
    descriptions.historical_background = toHtmlParagraph(
      replaceKnownEnglishFallback(
        'historical_background',
        responseDescriptions.collector_notes,
        language,
      ),
    )
  }

  return descriptions
}

export const mockAiDescriptionProvider: AiDescriptionProvider = {
  async generateDescriptions({ values, targets }) {
    await new Promise((resolve) => window.setTimeout(resolve, 450))

    const contentLanguage = resolveContentLanguage(values.content_language)
    const label = coinLabel(values, contentLanguage)
    const subject = subjectLabel(values, contentLanguage)
    const isGerman = contentLanguage === 'de'
    const descriptions: GeneratedDescriptions = {}

    for (const target of targets) {
      if (target === 'obverse') {
        descriptions.obverse = isGerman
          ? `Die Vorderseite dieser ${label} zeigt ${subject}. Inschriften, Symbole und Layout sollten anhand des eingereichten Bildes geprüft werden.`
          : `This commemorative ${label} presents an obverse design focused on ${subject}. The composition should be reviewed against the submitted image for exact inscriptions, symbols, and layout details.`
      }
      if (target === 'reverse') {
        descriptions.reverse = isGerman
          ? `Die Rückseite dieser ${values.denomination.trim()}-Ausgabe aus ${values.country.trim()} folgt dem eingereichten Münztyp und Nennwert. Prägezeichen und Randdetails sollten am Referenzbild bestätigt werden.`
          : `The reverse of this ${values.denomination.trim()} issue follows the coin type and denomination standards for ${values.country.trim()}. Confirm the final reverse design, mint marks, and edge details against the uploaded reference image.`
      }
      if (target === 'historical_background') {
        descriptions.historical_background = toHtmlParagraph(
          isGerman
            ? `Diese ${label} wird hier mit dem eingereichten Thema, Ausgabedatum und Prägeinformationen dokumentiert. Historische Ereignisse, Designer, Seltenheit und Marktwert nur nach Quellenprüfung ergänzen.`
            : `This ${label} is documented here with the submitted theme, release date, and mint information. Specific historical events, designer attribution, rarity, and market value should be added only after source verification.`,
        )
      }
      if (target === 'collector_notes') {
        descriptions.collector_notes = isGerman
          ? `Für Sammler sind Erhaltungsgrad, Auflage, Prägestätte und vollständige Dokumentation besonders relevant. Zusätzlich sollten Motiv, Ausgabekontext und mögliche Varianten vor Veröffentlichung geprüft werden.`
          : `Collector interest may focus on the ${values.year.trim()} issue, ${subject}, release context, mint data, and image quality. Verify mintage, condition, and any variant-specific details before publication.`
      }
      if (target === 'seo_description') {
        descriptions.seo_description = isGerman
          ? `${values.country.trim()} ${values.year.trim()} ${values.denomination.trim()} ${values.coin_type.trim()} mit Motiv ${subject}. Katalogdetails, Bilder und Sammlerhinweise auf CoinArchive.`
          : `${values.country.trim()} ${values.year.trim()} ${values.denomination.trim()} ${values.coin_type.trim()} coin featuring ${subject}. View catalogue details, images, and collector notes on CoinArchive.`
      }
    }

    return {
      provider: 'mock',
      prompts: Object.fromEntries(
        targets.map((target) => [target, buildAiDescriptionPrompt(values, target)]),
      ) as Record<AiDescriptionTarget, string>,
      descriptions,
    }
  },
}

function isEndpointUnavailable(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 0 || error.status === 404 || error.status === 405)
}

export const wordpressAiDescriptionProvider: AiDescriptionProvider = {
  async generateDescriptions({ values, targets, token }) {
    const fieldsRequested = targets.map((target) => TARGET_TO_FIELD[target])
    const contentLanguage = resolveContentLanguage(values.content_language)

    try {
      const payload = buildAiDescriptionPayload(values, fieldsRequested)
      const response = await generateAiDescriptions(
        payload,
        token ?? '',
      )
      let descriptions = mapAiDescriptionsResponse(response.descriptions, contentLanguage, targets)

      if (contentLanguage === 'de' && hasGermanLanguageMismatch(descriptions)) {
        const retryResponse = await generateAiDescriptions(
          {
            ...payload,
            prompt: [
              payload.prompt,
              'Die vorherige Antwort enthielt Englisch. Antworte jetzt ausschließlich auf Deutsch und ersetze alle englischen Fallback-Sätze durch neutrale deutsche Katalogformulierungen.',
            ]
              .filter(Boolean)
              .join('\n'),
          },
          token ?? '',
        )
        descriptions = mapAiDescriptionsResponse(
          retryResponse.descriptions,
          contentLanguage,
          targets,
        )
      }

      return {
        provider: 'wordpress',
        prompts: Object.fromEntries(
          targets.map((target) => [target, buildAiDescriptionPrompt(values, target)]),
        ) as Record<AiDescriptionTarget, string>,
        descriptions,
      }
    } catch (error) {
      if (import.meta.env.DEV && isEndpointUnavailable(error)) {
        return mockAiDescriptionProvider.generateDescriptions({ values, targets, token })
      }

      throw error
    }
  },
}

export function isMockAiGeneratedDescription(value: string | undefined | null): boolean {
  const text = value?.trim() ?? ''
  return (
    text.startsWith('This commemorative ') ||
    text.startsWith('The reverse of this ') ||
    text.startsWith('Collector interest may focus on ') ||
    text.includes('Specific historical events, designer attribution, rarity, and market value')
  )
}

export function hasAiAssistedDescriptionContent(submission: CoinSubmissionDetail): boolean {
  const record = submission as unknown as Record<string, unknown>
  const acf = submission.acf as (NonNullable<CoinSubmissionDetail['acf']> & Record<string, unknown>) | undefined

  if (
    record.ai_assisted === true ||
    record.aiAssisted === true ||
    acf?.ai_assisted === true ||
    acf?.aiAssisted === true
  ) {
    return true
  }

  return [
    submission.acf?.coin_obverse_description,
    submission.acf?.coin_reverse_description,
    submission.acf?.coin_historical_background,
    submission.acf?.coin_collector_notes,
  ].some(isMockAiGeneratedDescription)
}
