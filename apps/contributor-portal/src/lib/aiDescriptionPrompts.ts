import type { CoinFormValues } from '../types/coinForm'
import { getContentLanguagePromptInstruction, resolveContentLanguage } from './contentLanguage'
import type { GenerateAiDescriptionsPayload } from './api'

export type AiDescriptionTarget =
  | 'obverse'
  | 'reverse'
  | 'historical_background'
  | 'collector_notes'
  | 'seo_description'

export type AiDescriptionPromptInput = Pick<
  CoinFormValues,
  | 'content_language'
  | 'country'
  | 'year'
  | 'denomination'
  | 'coin_type'
  | 'coin_theme'
  | 'short_description'
  | 'released_date'
  | 'hasMintVariants'
  | 'singleMintMark'
  | 'mintMarksAvailable'
  | 'mintVariants'
>

export function hasRequiredAiDescriptionFields(values: AiDescriptionPromptInput): boolean {
  return Boolean(
    values.country.trim() &&
      values.year.trim() &&
      values.denomination.trim() &&
      values.coin_type.trim(),
  )
}

function getMintSummary(values: AiDescriptionPromptInput): string {
  if (values.hasMintVariants) {
    const variants = values.mintVariants
      .filter((row) => row.mintMarkCode.trim() || row.mintMintage.trim())
      .map((row) => [row.mintMarkCode.trim(), row.mintMintage.trim()].filter(Boolean).join(': '))
      .filter(Boolean)

    return variants.length > 0 ? variants.join('; ') : 'Multiple mint variants'
  }

  return values.singleMintMark.trim() || values.mintMarksAvailable.trim() || 'Not specified'
}

export function buildAiDescriptionPayload(
  values: AiDescriptionPromptInput,
  fieldsRequested: GenerateAiDescriptionsPayload['fields_requested'],
): GenerateAiDescriptionsPayload {
  const subject = values.coin_theme.trim() || values.short_description.trim()

  const contentLanguage = resolveContentLanguage(values.content_language)
  const languageInstruction = getContentLanguagePromptInstruction(contentLanguage)

  return {
    content_language: contentLanguage,
    language_instruction: languageInstruction,
    prompt: [
      languageInstruction,
      'Generate only the requested fields. Keep every generated description in the requested content language.',
      `Fields requested: ${fieldsRequested.join(', ')}`,
    ].join('\n'),
    country: values.country.trim(),
    year: values.year.trim(),
    denomination: values.denomination.trim(),
    coin_type: values.coin_type.trim(),
    theme: values.coin_theme.trim() || undefined,
    subject: subject || undefined,
    release_date: values.released_date.trim() || undefined,
    mint_data: getMintSummary(values),
    fields_requested: fieldsRequested,
  }
}

export function buildAiDescriptionPrompt(
  values: AiDescriptionPromptInput,
  target: AiDescriptionTarget,
): string {
  const contentLanguage = resolveContentLanguage(values.content_language)
  const subject = values.coin_theme.trim() || values.short_description.trim() || 'Not specified'
  const targetInstruction =
    target === 'historical_background'
      ? 'historical_background: Write a short factual historical background based only on submitted fields. Do not invent events, mintage, designer, rarity, or market value. If specific historical context is missing, use neutral wording.'
      : `Target: ${target.replace(/_/g, ' ')}`

  return [
    getContentLanguagePromptInstruction(contentLanguage),
    'Write a professional CoinArchive catalogue description.',
    targetInstruction,
    `Country: ${values.country.trim() || 'Not specified'}`,
    `Year: ${values.year.trim() || 'Not specified'}`,
    `Denomination: ${values.denomination.trim() || 'Not specified'}`,
    `Coin type: ${values.coin_type.trim() || 'Not specified'}`,
    `Theme or subject: ${subject}`,
    `Mint data: ${getMintSummary(values)}`,
    `Release date: ${values.released_date.trim() || 'Not specified'}`,
    'Tone: accurate, concise, collector-friendly, no unsupported facts.',
  ].join('\n')
}
