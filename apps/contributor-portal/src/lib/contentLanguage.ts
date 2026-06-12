import i18n from '../i18n'
import { CONTENT_LANGUAGE_OPTIONS, type ContentLanguage } from '../types/coinForm'

export function isContentLanguage(value: string): value is ContentLanguage {
  return CONTENT_LANGUAGE_OPTIONS.includes(value as ContentLanguage)
}

export function contentLanguageFromAcf(value: string | undefined): ContentLanguage {
  return value === 'en' ? 'en' : 'de'
}

export function getContentLanguageSelectOptions(): Array<{ value: ContentLanguage; label: string }> {
  return CONTENT_LANGUAGE_OPTIONS.map((language) => ({
    value: language,
    label: i18n.t(`contentLanguage.options.${language}`),
  }))
}

export function getContentLanguageReviewLabel(language: ContentLanguage): string {
  return i18n.t(`contentLanguage.names.${language}`)
}

export function resolveContentLanguage(language: string | undefined): ContentLanguage {
  return language === 'en' ? 'en' : 'de'
}

export function resolveSubmissionContentLanguage(source: {
  content_language?: string
  content_language_badge?: string
  acf?: { content_language?: string }
}): ContentLanguage {
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

  return resolveContentLanguage(source.acf?.content_language)
}

export function getContentLanguagePromptInstruction(language: ContentLanguage): string {
  if (language === 'en') {
    return 'ANSWER ONLY IN ENGLISH. Do not write German sentences. If information is missing, write a short professional catalogue description and mention missing details neutrally.'
  }

  return 'ANTWORTE AUSSCHLIESSLICH AUF DEUTSCH. Schreibe keine englischen Sätze. Wenn Informationen fehlen, formuliere eine kurze deutsche Katalogbeschreibung und erwähne fehlende Details neutral.'
}
