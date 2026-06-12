import { useEffect, useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CoinFormValues } from '../../types/coinForm'
import {
  buildAiDescriptionPrompt,
  hasRequiredAiDescriptionFields,
  type AiDescriptionTarget,
} from '../../lib/aiDescriptionPrompts'
import {
  hasGermanLanguageMismatch,
  wordpressAiDescriptionProvider,
  type GeneratedDescriptions,
} from '../../lib/aiDescriptionGenerator'
import { getContentLanguageReviewLabel, resolveContentLanguage } from '../../lib/contentLanguage'
import { ApiError } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'

type AIWritingAssistantProps = {
  values: CoinFormValues
  disabled?: boolean
  usageCount: number
  generatedFields: Set<AiDescriptionTarget>
  onUsageCountChange: (count: number) => void
  onGeneratedFieldsChange: (fields: Set<AiDescriptionTarget>) => void
  onApplyDescriptions: (descriptions: GeneratedDescriptions) => void
  onGeneratingChange?: (isGenerating: boolean) => void
}

type AiButtonConfig = {
  id: string
  labelKey: 'obverse' | 'reverse' | 'collectorNotes' | 'generateAll'
  targets: AiDescriptionTarget[]
}

const BUTTON_CONFIG: AiButtonConfig[] = [
  { id: 'obverse', labelKey: 'obverse', targets: ['obverse'] },
  { id: 'reverse', labelKey: 'reverse', targets: ['reverse'] },
  { id: 'collector', labelKey: 'collectorNotes', targets: ['collector_notes'] },
  {
    id: 'all',
    labelKey: 'generateAll',
    targets: ['obverse', 'reverse', 'historical_background', 'collector_notes', 'seo_description'],
  },
]

function targetHasContent(values: CoinFormValues, target: AiDescriptionTarget): boolean {
  if (target === 'obverse') return Boolean(values.coin_obverse_description.trim())
  if (target === 'reverse') return Boolean(values.coin_reverse_description.trim())
  if (target === 'historical_background') return Boolean(values.coin_historical_background.trim())
  if (target === 'collector_notes') return Boolean(values.coin_collector_notes.trim())
  if (target === 'seo_description') return Boolean(values.short_description.trim())
  return false
}

function getGenerationErrorMessage(error: unknown, t: (key: string) => string): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        return t('ai.errors.loginRequired')
      case 429:
        return t('ai.errors.rateLimited')
      case 501:
        return t('ai.errors.notConfigured')
      case 502:
        return t('ai.errors.invalidResponse')
      default:
        return t('ai.errors.failed')
    }
  }

  return t('ai.errors.failed')
}

export function AIWritingAssistant({
  values,
  disabled = false,
  usageCount,
  generatedFields,
  onUsageCountChange,
  onGeneratedFieldsChange,
  onApplyDescriptions,
  onGeneratingChange,
}: AIWritingAssistantProps) {
  const { t, i18n } = useTranslation()
  const { token } = useAuth()
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeButtonId, setActiveButtonId] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [seoPreview, setSeoPreview] = useState('')
  const canGenerate = hasRequiredAiDescriptionFields(values)
  const contentLanguage = resolveContentLanguage(values.content_language)
  const outputLanguage = getContentLanguageReviewLabel(contentLanguage)

  useEffect(() => {
    onGeneratingChange?.(isGenerating)

    return () => {
      if (isGenerating) {
        onGeneratingChange?.(false)
      }
    }
  }, [isGenerating, onGeneratingChange])

  const buttons = useMemo(
    () =>
      BUTTON_CONFIG.map((button) => ({
        ...button,
        label: t(`ai.buttons.${button.labelKey}`, { language: outputLanguage }),
      })),
    [i18n.language, outputLanguage, t, values.content_language],
  )

  const promptPreview = useMemo(
    () => buildAiDescriptionPrompt(values, 'obverse'),
    [values],
  )

  async function handleGenerate(buttonId: string, targets: AiDescriptionTarget[]) {
    const replacingAiContent = targets.some(
      (target) => generatedFields.has(target) && targetHasContent(values, target),
    )

    if (replacingAiContent && !window.confirm(t('ai.regenerateConfirm'))) {
      return
    }

    setIsGenerating(true)
    setActiveButtonId(buttonId)
    setStatusMessage(t('ai.generating'))

    try {
      const response = await wordpressAiDescriptionProvider.generateDescriptions({ values, targets, token })
      if (contentLanguage === 'de' && hasGermanLanguageMismatch(response.descriptions)) {
        setStatusMessage(t('ai.errors.germanLanguageMismatch'))
        return
      }

      onApplyDescriptions(response.descriptions)
      if (response.descriptions.seo_description) {
        setSeoPreview(response.descriptions.seo_description)
      }
      onGeneratedFieldsChange(new Set([...generatedFields, ...targets]))
      onUsageCountChange(usageCount + 1)
      setStatusMessage(t('ai.applied'))
    } catch (error) {
      setStatusMessage(getGenerationErrorMessage(error, t))
    } finally {
      setIsGenerating(false)
      setActiveButtonId('')
    }
  }

  return (
    <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            <h3 className="font-serif text-base font-semibold text-navy">{t('ai.title')}</h3>
          </div>
          <p className="mt-1 text-sm text-navy-muted">{t('ai.subtitle')}</p>
        </div>
        <p className="text-xs font-semibold text-primary">
          {t('ai.usageCount', { count: usageCount })}
        </p>
      </div>

      {!canGenerate ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {t('ai.requiredFieldsHint')}
        </p>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {buttons.map((button) => (
          <button
            key={button.id}
            type="button"
            disabled={disabled || !canGenerate || isGenerating}
            onClick={() => void handleGenerate(button.id, button.targets)}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-primary/20 bg-white px-3 py-2 text-sm font-semibold text-primary transition-colors hover:border-primary/35 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating && activeButtonId === button.id ? t('ai.generatingShort') : button.label}
          </button>
        ))}
      </div>

      <div role="status" aria-live="polite" className="mt-3 min-h-4 text-xs text-navy-muted">
        {statusMessage}
      </div>

      {seoPreview ? (
        <div className="mt-3 rounded-lg border border-border/70 bg-white px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-muted">
            {t('ai.seoPreview')}
          </p>
          <p className="mt-1 text-xs text-navy">{seoPreview}</p>
        </div>
      ) : null}

      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-semibold text-navy-muted">
          {t('ai.promptPreview')}
        </summary>
        <pre className="mt-2 max-h-44 overflow-auto rounded-lg bg-white p-3 text-xs whitespace-pre-wrap text-navy-muted">
          {promptPreview}
        </pre>
      </details>
    </section>
  )
}
