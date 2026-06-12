import { lazy, Suspense, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Crop } from 'lucide-react'
import { CoinImagePreviewSlot } from '../coin/CoinImagePreviewSlot'
import type { CoinImageClearActionVariant } from '../../lib/imagePreview'
import type { ImagePreviewSource } from '../../lib/imagePreview'
import { getImagePreviewLabel } from '../../lib/imagePreview'

const ImageCropModal = lazy(() =>
  import('./ImageCropModal').then((module) => ({ default: module.ImageCropModal })),
)

const ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'

type CoinImageClearAction = {
  label: string
  variant: CoinImageClearActionVariant
  ariaLabel: string
}

type CroppableFileUploadFieldProps = {
  label: string
  hint?: string
  error?: string
  attention?: string
  fileName?: string | null
  previewUrl?: string | null
  previewSource?: ImagePreviewSource
  previewLabel?: string
  previewAlt?: string
  formOptionsLoading?: boolean
  isNewSelection?: boolean
  clearAction?: CoinImageClearAction | null
  clearNotice?: string | null
  name?: string
  id?: string
  disabled?: boolean
  cropTitle?: string
  onFileChange: (file: File | null) => void
  onClear?: () => void
}

export function CroppableFileUploadField({
  label,
  hint = 'JPG, PNG, WEBP up to 5MB — crop after selecting',
  error,
  attention,
  fileName,
  previewUrl,
  previewSource = 'none',
  previewLabel,
  previewAlt = 'Selected image preview',
  formOptionsLoading = false,
  isNewSelection = false,
  clearAction = null,
  clearNotice = null,
  id,
  disabled,
  cropTitle,
  onFileChange,
  onClear,
}: CroppableFileUploadFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const errorId = error ? `${fieldId}-error` : undefined
  const attentionId = !error && attention ? `${fieldId}-attention` : undefined
  const clearNoticeId = clearNotice ? `${fieldId}-clear-notice` : undefined
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [cropOpen, setCropOpen] = useState(false)

  function handleRawSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    event.target.value = ''

    if (!file) {
      return
    }

    setPendingFile(file)
    setCropOpen(true)
  }

  function handleClear() {
    setCropOpen(false)
    setPendingFile(null)
    onClear?.()
  }

  const displayName = previewLabel ?? getImagePreviewLabel(
    fileName ? 'selected' : previewSource,
    fileName,
  )

  const showDefaultBadge = previewSource === 'default' && !isNewSelection

  return (
    <>
      <div className="flex h-full min-w-0 flex-col gap-1.5">
        <div className="flex min-h-7 items-center justify-between gap-2">
          <label htmlFor={fieldId} className="min-w-0 truncate text-sm font-medium text-navy">
            {label}
          </label>
          <div className="flex min-h-5 shrink-0 items-center justify-end gap-1.5">
            {isNewSelection ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                New image selected
              </span>
            ) : null}
            {showDefaultBadge ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                Default
              </span>
            ) : null}
          </div>
        </div>
        <div
          className={[
            'coin-upload-card gap-3 rounded-xl border bg-muted/30 p-3 xl:gap-4 xl:p-5',
            error
              ? 'border-red-300'
              : attention
                ? 'border-amber-300/90 ring-1 ring-amber-200/70'
                : 'border-border',
          ].join(' ')}
        >
          <div className="coin-upload-card__body">
            <CoinImagePreviewSlot
              previewUrl={previewUrl}
              previewSource={previewSource}
              formOptionsLoading={formOptionsLoading}
              isNewSelection={isNewSelection}
              alt={previewAlt}
              size="field"
            />
            <div className="coin-upload-card__meta">
              <p
                className="truncate text-sm font-medium leading-5 text-navy"
                title={displayName}
              >
                {displayName}
              </p>
              <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-[11px] leading-snug text-navy-muted xl:mt-1.5 xl:min-h-[2.75rem] xl:text-xs xl:leading-relaxed">
                {hint}
              </p>
            </div>
          </div>
          <div className="coin-upload-card__actions">
            <label className="block w-full min-w-0">
              <input
                id={fieldId}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                disabled={disabled}
                aria-invalid={error ? true : undefined}
                aria-describedby={[errorId, attentionId, clearNoticeId].filter(Boolean).join(' ') || undefined}
                onChange={handleRawSelect}
              />
              <span
                className={[
                  'flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition-colors xl:min-h-11 xl:px-5 xl:py-3',
                  disabled ? 'pointer-events-none opacity-50' : 'hover:bg-primary/10',
                ].join(' ')}
              >
                <Crop className="h-4 w-4 shrink-0" aria-hidden />
                {fileName ? 'Replace & crop' : 'Choose & crop'}
              </span>
            </label>
            {clearAction && onClear ? (
              <button
                type="button"
                disabled={disabled}
                aria-label={clearAction.ariaLabel}
                onClick={handleClear}
                className={[
                  'flex min-h-10 w-full items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition-colors xl:min-h-11 xl:px-5 xl:py-3',
                  clearAction.variant === 'destructive'
                    ? 'border-red-200/90 bg-white text-red-700 hover:border-red-300 hover:bg-red-50'
                    : 'border-border/80 bg-white text-navy-muted hover:border-navy/15 hover:bg-page hover:text-navy',
                  disabled ? 'pointer-events-none opacity-50' : '',
                ].join(' ')}
              >
                {clearAction.label}
              </button>
            ) : (
              <div className="min-h-10 xl:min-h-11" aria-hidden="true" />
            )}
          </div>
        </div>
        <div className="min-h-[1.125rem]">
          {error ? (
            <p id={errorId} role="alert" className="text-xs text-red-600">
              {error}
            </p>
          ) : null}
          {!error && attention ? (
            <p id={attentionId} className="text-xs text-amber-800">
              {attention}
            </p>
          ) : null}
          {!error && !attention && clearNotice ? (
            <p id={clearNoticeId} className="text-xs text-navy-muted">
              {clearNotice}
            </p>
          ) : null}
        </div>
      </div>

      {cropOpen ? (
        <Suspense fallback={null}>
          <ImageCropModal
            open={cropOpen}
            file={pendingFile}
            title={cropTitle ?? `Crop ${label.toLowerCase()}`}
            onClose={() => {
              setCropOpen(false)
              setPendingFile(null)
            }}
            onSave={(file) => {
              onFileChange(file)
              setPendingFile(null)
            }}
          />
        </Suspense>
      ) : null}
    </>
  )
}
