import type { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'

const ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'

type FileUploadFieldProps = {
  label: string
  hint?: string
  error?: string
  fileName?: string | null
  name?: string
  id?: string
  disabled?: boolean
  onFileChange: (file: File | null) => void
}

export function FileUploadField({
  label,
  hint,
  error,
  fileName,
  id,
  disabled,
  onFileChange,
}: FileUploadFieldProps) {
  const { t } = useTranslation()
  const resolvedHint = hint ?? t('upload.hintSingle')
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const errorId = error ? `${fieldId}-error` : undefined

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    onFileChange(file)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium text-navy">
        {label}
      </label>
      <div
        className={[
          'rounded-xl border bg-muted/30 px-4 py-4',
          error ? 'border-red-300' : 'border-border',
        ].join(' ')}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm text-navy">
              {fileName ?? t('upload.noFileSelected')}
            </p>
            <p className="mt-1 text-xs text-navy-muted">{resolvedHint}</p>
          </div>
          <label className="shrink-0">
            <input
              id={fieldId}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              disabled={disabled}
              aria-invalid={error ? true : undefined}
              aria-describedby={errorId}
              onChange={handleChange}
            />
            <span
              className={[
                'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-border bg-white px-5 py-3 text-sm font-semibold text-navy transition-colors',
                disabled ? 'pointer-events-none opacity-50' : 'hover:border-navy/20 hover:bg-muted',
              ].join(' ')}
            >
              {t('upload.chooseFile')}
            </span>
          </label>
        </div>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  )
}
