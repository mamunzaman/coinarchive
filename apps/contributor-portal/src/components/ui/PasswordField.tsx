import { useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { FieldLabelWithHelp } from './FieldHelpTooltip'

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string
  hint?: string
  helpTooltip?: string
  error?: string
  attention?: string
}

export function PasswordField({
  label,
  hint,
  helpTooltip,
  error,
  attention,
  id,
  className = '',
  disabled,
  'aria-describedby': ariaDescribedBy,
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const errorId = error ? `${fieldId}-error` : undefined
  const attentionId = !error && attention ? `${fieldId}-attention` : undefined
  const describedBy =
    [ariaDescribedBy, errorId, attentionId].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-2">
      <FieldLabelWithHelp htmlFor={fieldId} label={label} helpText={helpTooltip} />
      <div className="relative">
        <input
          id={fieldId}
          type={visible ? 'text' : 'password'}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={[
            'field-control w-full pr-11',
            error ? 'field-control--error' : attention ? 'field-control--attention' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute right-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-navy-muted transition-colors hover:bg-muted hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden />
          ) : (
            <Eye className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="field-message field-message--error">
          {error}
        </p>
      ) : null}
      {!error && attention ? (
        <p id={attentionId} className="field-message field-message--attention">
          {attention}
        </p>
      ) : null}
      {!error && !attention && hint ? (
        <p className="field-message field-message--hint">{hint}</p>
      ) : null}
    </div>
  )
}
