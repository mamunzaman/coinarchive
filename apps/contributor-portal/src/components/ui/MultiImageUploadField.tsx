import type { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { validateImageFile } from '../../lib/validation'

const ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'

type MultiImageUploadFieldProps = {
  label: string
  hint?: string
  error?: string
  files: File[]
  name?: string
  id?: string
  disabled?: boolean
  hideFileList?: boolean
  onFilesChange: (files: File[]) => void
}

export function MultiImageUploadField({
  label,
  hint,
  error,
  files,
  id,
  disabled,
  hideFileList = false,
  onFilesChange,
}: MultiImageUploadFieldProps) {
  const { t } = useTranslation()
  const resolvedHint = hint ?? t('upload.hintMulti')
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const errorId = error ? `${fieldId}-error` : undefined

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    event.target.value = ''

    if (selected.length === 0) {
      return
    }

    onFilesChange([...files, ...selected])
  }

  function removeFile(index: number) {
    onFilesChange(files.filter((_, fileIndex) => fileIndex !== index))
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
            <p className="text-sm text-navy">
              {files.length === 0
                ? t('upload.noFilesSelected')
                : t('upload.filesSelected', { count: files.length })}
            </p>
            <p className="mt-1 text-xs text-navy-muted">{resolvedHint}</p>
          </div>
          <label className="shrink-0">
            <input
              id={fieldId}
              type="file"
              accept={ACCEPT}
              multiple
              className="sr-only"
              disabled={disabled}
              aria-invalid={error ? true : undefined}
              aria-describedby={errorId}
              onChange={handleChange}
            />
            <span
              className={[
                'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-semibold text-navy transition-colors',
                disabled ? 'pointer-events-none opacity-50' : 'hover:border-navy/20 hover:bg-muted',
              ].join(' ')}
            >
              {t('upload.chooseFiles')}
            </span>
          </label>
        </div>

        {files.length > 0 && !hideFileList ? (
          <ul className="mt-4 flex flex-col gap-2 border-t border-border/60 pt-4">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${file.size}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-white px-4 py-3"
              >
                <span className="min-w-0 truncate text-sm text-navy">{file.name}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeFile(index)}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg px-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  {t('upload.remove')}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function validateGalleryFiles(files: File[]): string | null {
  for (const file of files) {
    const error = validateImageFile(file)
    if (error) {
      return `${file.name}: ${error}`
    }
  }

  return null
}
