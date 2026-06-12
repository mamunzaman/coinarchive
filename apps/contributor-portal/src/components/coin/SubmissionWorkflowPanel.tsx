import { AlertTriangle, Check, Circle, Clock3, Sparkles } from 'lucide-react'
import { DuplicateCheckPanel } from './DuplicateCheckPanel'
import { useTranslation } from 'react-i18next'
import type { DuplicateCheckStatus } from '../../lib/duplicateCheck'
import type { DuplicateMatch } from '../../lib/duplicateDetection'
import { useMemo } from 'react'
import { computeCompletenessScore } from '../../lib/completenessScore'
import {
  getCatalogueHealthSteps,
  getWizardNextAction,
  type StepCompletionResult,
  type StepCompletionStatus,
} from '../../lib/stepCompletion'
import type { CoinFormValues } from '../../types/coinForm'
import type { CoinFormStepId } from '../../types/coinFormSteps'
import { Button } from '../ui/Button'

type SubmissionWorkflowPanelProps = {
  values: CoinFormValues
  obverseFile: File | null
  reverseFile: File | null
  galleryFiles: File[]
  hasExistingObverse?: boolean
  hasExistingReverse?: boolean
  existingGalleryCount?: number
  obversePreviewUrl?: string | null
  reversePreviewUrl?: string | null
  lastSavedAt: string | null
  saveError?: string | null
  stepCompletion?: StepCompletionResult[]
  duplicateCheckStatus?: DuplicateCheckStatus
  duplicateMatches?: DuplicateMatch[]
  onJumpToStep?: (stepId: CoinFormStepId) => void
  embedded?: boolean
}

const QUICK_JUMPS: Array<{ stepId: CoinFormStepId; labelKey: string }> = [
  { stepId: 'core-identity', labelKey: 'workflow.quickCore' },
  { stepId: 'images', labelKey: 'workflow.quickImages' },
  { stepId: 'mint-information', labelKey: 'workflow.quickMint' },
  { stepId: 'specifications', labelKey: 'workflow.quickSpecs' },
  { stepId: 'descriptions', labelKey: 'workflow.quickNotes' },
  { stepId: 'review-submission', labelKey: 'workflow.quickReview' },
]

function formatSavedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-navy-muted xl:text-[11px] xl:tracking-[0.18em]">
      {children}
    </p>
  )
}

function HealthStatusIcon({ status }: { status: StepCompletionStatus }) {
  if (status === 'complete') {
    return <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={2.5} aria-hidden />
  }

  if (status === 'attention') {
    return <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" strokeWidth={2.25} aria-hidden />
  }

  return <Circle className="h-3 w-3 shrink-0 text-navy-muted/45" strokeWidth={2} aria-hidden />
}

function ImageStatusRow({ label, ready }: { label: string; ready: boolean }) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-between gap-2 text-xs xl:text-sm">
      <span className="text-navy-muted">{label}</span>
      <span
        className={[
          'inline-flex items-center gap-1 font-medium',
          ready ? 'text-emerald-700' : 'text-amber-800',
        ].join(' ')}
      >
        {ready ? (
          <Check className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
        ) : (
          <Circle className="h-2.5 w-2.5 shrink-0 fill-amber-400/90 text-transparent" aria-hidden />
        )}
        {ready ? t('workflow.ready') : t('workflow.missing')}
      </span>
    </div>
  )
}

export function SubmissionWorkflowPanel({
  values,
  obverseFile,
  reverseFile,
  galleryFiles,
  hasExistingObverse = false,
  hasExistingReverse = false,
  existingGalleryCount = 0,
  lastSavedAt,
  saveError,
  stepCompletion = [],
  duplicateCheckStatus = 'insufficient',
  duplicateMatches = [],
  onJumpToStep,
  embedded = false,
}: SubmissionWorkflowPanelProps) {
  const { t } = useTranslation()
  const hasObverse = Boolean(obverseFile || hasExistingObverse)
  const hasReverse = Boolean(reverseFile || hasExistingReverse)
  const galleryCount = galleryFiles.length + existingGalleryCount

  const completeness = useMemo(
    () =>
      computeCompletenessScore({
        values,
        hasObverse,
        hasReverse,
        hasGallery: galleryCount > 0,
      }),
    [values, hasObverse, hasReverse, galleryCount],
  )

  const catalogueHealth = useMemo(() => getCatalogueHealthSteps(stepCompletion), [stepCompletion])
  const nextAction = useMemo(() => getWizardNextAction(stepCompletion), [stepCompletion])

  const visibleQuickJumps = useMemo(() => {
    if (stepCompletion.length === 0) {
      return QUICK_JUMPS.filter((jump) => jump.stepId !== 'status-admin')
    }

    const visibleIds = new Set(stepCompletion.map((step) => step.stepId))
    return QUICK_JUMPS.filter((jump) => visibleIds.has(jump.stepId))
  }, [stepCompletion])

  return (
    <div
      className={
        embedded
          ? 'min-w-0'
          : 'rounded-xl border border-border/70 bg-white p-3 shadow-[var(--shadow-card)] xl:p-4'
      }
    >
      {embedded ? (
        <p className="mb-2.5 text-[11px] text-navy-muted">{t('workflow.hint')}</p>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              {t('workflow.actionCenter')}
            </p>
            <p className="mt-0.5 text-[11px] text-navy-muted xl:text-xs">{t('workflow.hint')}</p>
          </div>
          <Sparkles className="h-4 w-4 shrink-0 text-primary/70" aria-hidden />
        </div>
      )}

      <div className={embedded ? 'space-y-3' : 'mt-3 space-y-3 xl:mt-4 xl:space-y-4'}>
        <section>
          <SectionLabel>{t('workflow.catalogueHealth')}</SectionLabel>
          <div className="mt-1.5 flex items-end justify-between gap-2 xl:mt-2">
            <p className="font-serif text-xl font-semibold text-navy xl:text-2xl">{completeness.score}%</p>
            <p className="text-[10px] text-navy-muted xl:text-[11px]">
              {t('workflow.required', {
                filled: completeness.requiredFilled,
                total: completeness.requiredTotal,
              })}
            </p>
          </div>
          <div
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-panel xl:mt-2 xl:h-2"
            role="progressbar"
            aria-valuenow={completeness.score}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('workflow.catalogueReadiness')}
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${completeness.score}%` }}
            />
          </div>
          {catalogueHealth.length > 0 ? (
            <ul className="mt-2 space-y-1 xl:mt-2.5 xl:space-y-1.5">
              {catalogueHealth.map((step) => (
                <li key={step.stepId} className="flex items-start gap-2 text-xs text-navy xl:text-sm">
                  <HealthStatusIcon status={step.status} />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{step.label}</span>
                    {step.status === 'attention' && step.issues && step.issues.length > 0 ? (
                      <ul className="mt-0.5 space-y-0.5">
                        {step.issues.slice(0, 2).map((issue) => (
                          <li key={`${step.stepId}-${issue.field}`} className="truncate text-[11px] text-amber-800 xl:text-xs">
                            {issue.message}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="border-t border-border/50 pt-3 xl:pt-3.5">
          <SectionLabel>{t('workflow.imageStatus')}</SectionLabel>
          <div className="mt-1.5 space-y-1 xl:mt-2 xl:space-y-1.5">
            <ImageStatusRow label={t('form.obverse')} ready={hasObverse} />
            <ImageStatusRow label={t('form.reverse')} ready={hasReverse} />
            <div className="flex items-center justify-between gap-2 text-xs xl:text-sm">
              <span className="text-navy-muted">{t('detail.gallery')}</span>
              <span className="font-medium text-navy">{galleryCount}</span>
            </div>
          </div>
        </section>

        <section className="border-t border-border/50 pt-3 xl:pt-3.5">
          <SectionLabel>{t('workflow.duplicateCheck')}</SectionLabel>
          <div className="mt-1.5 xl:mt-2">
            <DuplicateCheckPanel status={duplicateCheckStatus} matches={duplicateMatches} />
          </div>
        </section>

        <section className="border-t border-border/50 pt-3 xl:pt-3.5">
          <SectionLabel>{t('workflow.nextAction')}</SectionLabel>
          <p className="mt-1.5 text-xs font-semibold text-navy xl:mt-2 xl:text-sm">{nextAction.message}</p>
          {onJumpToStep ? (
            <Button
              type="button"
              variant="secondary"
              className="mt-2 !min-h-9 w-full !px-3 !py-2 text-xs xl:!min-h-10 xl:text-sm"
              onClick={() => onJumpToStep(nextAction.stepId)}
            >
              {nextAction.isReview ? t('workflow.goToReview') : t('workflow.goToStep')}
            </Button>
          ) : null}
        </section>

        {onJumpToStep ? (
          <section className="border-t border-border/50 pt-3 xl:pt-3.5">
            <SectionLabel>{t('workflow.quickJumps')}</SectionLabel>
            <div className="mt-2 flex flex-wrap gap-1.5 xl:gap-2">
              {visibleQuickJumps.map((jump) => (
                <button
                  key={jump.stepId}
                  type="button"
                  onClick={() => onJumpToStep(jump.stepId)}
                  className={[
                    'rounded-full border border-border/70 bg-page/60 px-2.5 py-1 text-[11px] font-semibold text-navy-muted transition-colors',
                    'hover:border-primary/30 hover:bg-primary/5 hover:text-navy',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                    'xl:px-3 xl:py-1.5 xl:text-xs',
                  ].join(' ')}
                >
                  {t(jump.labelKey)}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="border-t border-border/50 pt-3 xl:pt-3.5">
          <SectionLabel>{t('workflow.autosave')}</SectionLabel>
          {saveError ? (
            <p className="mt-1.5 text-xs text-red-700 xl:mt-2 xl:text-sm">{saveError}</p>
          ) : lastSavedAt ? (
            <div className="mt-1.5 flex items-start gap-2 text-xs text-navy xl:mt-2 xl:text-sm">
              <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary xl:h-4 xl:w-4" aria-hidden />
              <div>
                <p>{t('workflow.draftSavedAutomatically')}</p>
                <p className="mt-0.5 text-[11px] text-navy-muted xl:text-xs">{formatSavedAt(lastSavedAt)}</p>
              </div>
            </div>
          ) : (
            <p className="mt-1.5 text-xs text-navy-muted xl:mt-2 xl:text-sm">
              {t('workflow.autosaveHint')}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
