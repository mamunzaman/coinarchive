import {
  getCompletionTone,
  type CompletenessResult,
} from '../../lib/completenessScore'

type CompletionIndicatorProps = {
  result: CompletenessResult
  variant?: 'compact' | 'card'
  showRequired?: boolean
  className?: string
}

const TONE_TEXT = {
  high: 'text-emerald-700',
  medium: 'text-amber-800',
  low: 'text-amber-800',
} as const

const TONE_BAR = {
  high: 'bg-emerald-500',
  medium: 'bg-amber-500',
  low: 'bg-amber-400',
} as const

export function getCompletionAccentClass(result: CompletenessResult): string {
  return TONE_BAR[getCompletionTone(result.score)]
}

export function CompletionIndicator({
  result,
  variant = 'card',
  showRequired = true,
  className = '',
}: CompletionIndicatorProps) {
  const tone = getCompletionTone(result.score)
  const textClass = TONE_TEXT[tone]
  const barClass = TONE_BAR[tone]

  const label = showRequired
    ? `${result.score}% complete · ${result.requiredFilled}/${result.requiredTotal} required`
    : `${result.score}% complete`

  if (variant === 'compact') {
    return (
      <span
        className={['font-medium', textClass, className].filter(Boolean).join(' ')}
        aria-label={label}
      >
        {result.score}% complete
      </span>
    )
  }

  return (
    <div className={['min-w-0', className].filter(Boolean).join(' ')}>
      <p className="text-[11px] leading-snug text-navy-muted">
        <span className={['font-medium', textClass].join(' ')}>{result.score}% complete</span>
        {showRequired ? (
          <span>
            {' '}
            · {result.requiredFilled}/{result.requiredTotal} required
          </span>
        ) : null}
      </p>
      <div
        className="mt-1 h-0.5 w-full max-w-[7.5rem] overflow-hidden rounded-full bg-panel"
        role="progressbar"
        aria-valuenow={result.score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={['h-full rounded-full', barClass].join(' ')}
          style={{ width: `${result.score}%` }}
        />
      </div>
    </div>
  )
}
