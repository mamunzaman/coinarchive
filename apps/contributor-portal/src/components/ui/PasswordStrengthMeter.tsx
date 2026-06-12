import { useTranslation } from 'react-i18next'
import {
  getPasswordStrength,
  getPasswordStrengthPercent,
  PASSWORD_CRITERIA_LABELS,
} from '../../lib/passwordStrength'

type PasswordStrengthMeterProps = {
  password: string
}

const STRENGTH_BAR_CLASS: Record<ReturnType<typeof getPasswordStrength>['strength'], string> = {
  weak: 'bg-red-500',
  fair: 'bg-amber-500',
  good: 'bg-primary',
  strong: 'bg-emerald-500',
}

const STRENGTH_TEXT_CLASS: Record<ReturnType<typeof getPasswordStrength>['strength'], string> = {
  weak: 'text-red-600',
  fair: 'text-amber-700',
  good: 'text-primary',
  strong: 'text-emerald-700',
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const { t } = useTranslation()
  const { strength, criteria, metCount } = getPasswordStrength(password)
  const percent = getPasswordStrengthPercent(metCount)
  const label = t(`auth.passwordStrengthLevels.${strength}`)

  if (!password) {
    return null
  }

  return (
    <div
      className="rounded-xl border border-border/60 bg-muted/40 px-3 py-3"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-navy-muted">{t('auth.passwordStrength')}</p>
        <p className={`text-xs font-semibold ${STRENGTH_TEXT_CLASS[strength]}`}>{label}</p>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/80"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={t('auth.passwordStrengthAria', { label })}
      >
        <div
          className={`h-full rounded-full transition-all duration-200 ${STRENGTH_BAR_CLASS[strength]}`}
          style={{ width: `${Math.max(percent, password ? 8 : 0)}%` }}
        />
      </div>
      <ul className="mt-3 space-y-1.5">
        {PASSWORD_CRITERIA_LABELS.map(({ key }) => {
          const met = criteria[key]
          return (
            <li
              key={key}
              className={[
                'flex items-center gap-2 text-xs',
                met ? 'text-emerald-700' : 'text-navy-muted',
              ].join(' ')}
            >
              <span
                aria-hidden
                className={[
                  'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                  met ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-navy-muted ring-1 ring-border/80',
                ].join(' ')}
              >
                {met ? '✓' : '·'}
              </span>
              <span>{t(`auth.passwordCriteria.${key}`)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
