import { useEffect, useState } from 'react'
import { CheckCircle2, Copy, FileEdit, Sparkles } from 'lucide-react'
import { formatDraftSavedLabel } from '../../hooks/useCoinDraft'
import {
  getDuplicateCheckLabel,
  getDuplicateCheckTone,
  type DuplicateCheckStatus,
} from '../../lib/duplicateCheck'
import type { StepCompletionResult } from '../../lib/stepCompletion'

export type WizardSaveState = 'idle' | 'saving' | 'saved' | 'error'

export type WizardStatusBarProps = {
  completionPercent: number
  stepCompletion: StepCompletionResult[]
  isDirty?: boolean
  hasDraft?: boolean
  isEditMode?: boolean
  isAdmin?: boolean
  duplicateCheckStatus?: DuplicateCheckStatus
  saveState?: WizardSaveState
  lastSavedAt?: string | null
  hasPendingChanges?: boolean
}

type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'primary' | 'info'

function getDraftLabel(
  isDirty: boolean,
  hasDraft: boolean,
  saveState: WizardSaveState,
  lastSavedAt: string | null | undefined,
  hasPendingChanges: boolean,
): { label: string; tone: StatusTone } {
  if (saveState === 'saving') {
    return { label: 'Saving…', tone: 'primary' }
  }

  if (saveState === 'error') {
    return { label: 'Save failed', tone: 'danger' }
  }

  if (hasPendingChanges || (isDirty && saveState === 'idle')) {
    return { label: 'Unsaved changes', tone: 'warning' }
  }

  if (saveState === 'saved' || lastSavedAt) {
    return {
      label: formatDraftSavedLabel(lastSavedAt ?? null),
      tone: 'success',
    }
  }

  if (hasDraft) {
    return { label: 'Draft saved', tone: 'success' }
  }

  return { label: 'No draft yet', tone: 'neutral' }
}

function getReadinessLabel(stepCompletion: StepCompletionResult[]): {
  label: string
  tone: StatusTone
} {
  const core = stepCompletion.find((step) => step.stepId === 'core-identity')
  const images = stepCompletion.find((step) => step.stepId === 'images')

  if (core?.status === 'complete' && images?.status === 'complete') {
    return { label: 'Ready for review', tone: 'success' }
  }

  return { label: 'Needs required info', tone: 'warning' }
}

function getModeLabel(isEditMode: boolean, isAdmin: boolean): string {
  if (isEditMode && isAdmin) {
    return 'Editing submission • Admin controls'
  }

  if (isEditMode) {
    return 'Editing submission'
  }

  if (isAdmin) {
    return 'New entry • Admin controls'
  }

  return 'New entry'
}

const toneDotClass: Record<StatusTone, string> = {
  neutral: 'bg-navy-muted/50',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  primary: 'bg-primary',
  info: 'bg-slate-400',
}

const toneTextClass: Record<StatusTone, string> = {
  neutral: 'text-navy-muted',
  success: 'text-emerald-700',
  warning: 'text-amber-800',
  danger: 'text-red-700',
  primary: 'text-primary',
  info: 'text-slate-700',
}

function StatusSegment({
  label,
  tone = 'neutral',
  icon,
  className = '',
}: {
  label: string
  tone?: StatusTone
  icon?: 'draft' | 'ready' | 'duplicate' | 'mode'
  className?: string
}) {
  const Icon =
    icon === 'ready'
      ? CheckCircle2
      : icon === 'duplicate'
        ? Copy
        : icon === 'mode'
          ? FileEdit
          : Sparkles

  return (
    <span
      className={['inline-flex items-center gap-1.5 font-medium', toneTextClass[tone], className]
        .filter(Boolean)
        .join(' ')}
    >
      {icon ? (
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
      ) : (
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${toneDotClass[tone]}`}
          aria-hidden
        />
      )}
      <span>{label}</span>
    </span>
  )
}

function Separator({ className = '' }: { className?: string }) {
  return (
    <span className={['hidden text-border sm:inline', className].filter(Boolean).join(' ')} aria-hidden>
      •
    </span>
  )
}

export function WizardStatusBar({
  completionPercent,
  stepCompletion,
  isDirty = false,
  hasDraft = false,
  isEditMode = false,
  isAdmin = false,
  duplicateCheckStatus = 'insufficient',
  saveState = 'idle',
  lastSavedAt = null,
  hasPendingChanges = false,
}: WizardStatusBarProps) {
  const [, setSavedLabelTick] = useState(0)

  useEffect(() => {
    if (!lastSavedAt) {
      return
    }

    const timer = window.setInterval(() => {
      setSavedLabelTick((current) => current + 1)
    }, 30_000)

    return () => window.clearInterval(timer)
  }, [lastSavedAt])

  const draft = getDraftLabel(isDirty, hasDraft, saveState, lastSavedAt, hasPendingChanges)
  const readiness = getReadinessLabel(stepCompletion)
  const duplicateTone = getDuplicateCheckTone(duplicateCheckStatus)
  const duplicate = {
    label: getDuplicateCheckLabel(duplicateCheckStatus),
    tone: duplicateTone,
  }
  const showDuplicateAlways =
    duplicateCheckStatus === 'match' ||
    duplicateCheckStatus === 'checking' ||
    duplicateCheckStatus === 'error'
  const modeLabel = getModeLabel(isEditMode, isAdmin)
  const clampedCompletion = Math.max(0, Math.min(100, Math.round(completionPercent)))

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full rounded-xl border border-border/60 bg-white/92 px-3 py-2 shadow-[var(--shadow-card)] backdrop-blur-sm sm:px-4 sm:py-2.5 lg:py-2 xl:py-3"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs sm:gap-x-2.5 sm:gap-y-2 sm:text-sm lg:gap-x-2 lg:text-xs xl:gap-x-3 xl:text-sm">
        <StatusSegment label={draft.label} tone={draft.tone} icon="draft" />
        <Separator />
        <StatusSegment label={`${clampedCompletion}% complete`} tone="neutral" />
        <Separator />
        <StatusSegment
          label={readiness.label}
          tone={readiness.tone}
          icon={readiness.tone === 'success' ? 'ready' : undefined}
        />
        {showDuplicateAlways ? (
          <>
            <Separator />
            <StatusSegment label={duplicate.label} tone={duplicate.tone} icon="duplicate" />
          </>
        ) : (
          <>
            <Separator className="xl:inline" />
            <StatusSegment
              label={duplicate.label}
              tone={duplicate.tone}
              icon="duplicate"
              className="hidden xl:inline-flex"
            />
          </>
        )}
        <Separator className="xl:inline" />
        <StatusSegment
          label={modeLabel}
          tone="neutral"
          icon="mode"
          className="hidden xl:inline-flex"
        />
      </div>
    </div>
  )
}

export function getWizardReadinessFromSteps(
  stepCompletion: StepCompletionResult[],
): 'ready' | 'needs-required' {
  const core = stepCompletion.find((step) => step.stepId === 'core-identity')
  const images = stepCompletion.find((step) => step.stepId === 'images')

  return core?.status === 'complete' && images?.status === 'complete'
    ? 'ready'
    : 'needs-required'
}
