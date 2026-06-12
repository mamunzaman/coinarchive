import { Check, Crop, ImageMinus, Images, RotateCcw, Undo2 } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SubmissionCoinFaces } from './SubmissionCoinFaces'
import { SubmissionDetailGallery } from './SubmissionDetailGallery'
import { DetailSectionCard } from './SubmissionDetailCard'
import { EditableGalleryGrid } from './EditableGalleryGrid'
import { SubmissionImageZoomModal } from './SubmissionImageZoomModal'
import { Button } from '../ui/Button'
import { ICON_ACTION } from '../ui/ActionControls'
import type { CoinSubmissionDetail } from '../../lib/api'
import type {
  FaceAutosaveState,
  ImageCardStatus,
  PendingGalleryUpload,
  SubmissionDetailImageEditState,
  UndoRemovalSnack,
} from '../../hooks/useSubmissionImageAutosave'
import {
  getVisibleGalleryImages,
  resolveFaceDisplayUrl,
} from '../../lib/submissionDetailImagePreview'
import { resolveSubmissionDetailFaceImageUrl } from '../../lib/imagePreview'

export type { SubmissionDetailImageEditState } from '../../hooks/useSubmissionImageAutosave'

const ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'

const ImageCropModal = lazy(() =>
  import('../ui/ImageCropModal').then((module) => ({ default: module.ImageCropModal })),
)

function ImageStatusBadge({ status }: { status: ImageCardStatus }) {
  const { t } = useTranslation()

  if (status === 'idle') {
    return null
  }

  const classes =
    status === 'uploading'
      ? 'bg-white/95 text-navy shadow-sm ring-1 ring-border'
      : status === 'saved'
        ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
        : 'bg-red-50 text-red-700 ring-1 ring-red-200'

  const label =
    status === 'uploading'
      ? t('detail.uploading')
      : status === 'saved'
        ? t('detail.saved')
        : t('detail.failed')

  return (
    <span
      className={[
        'inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold uppercase tracking-wide',
        classes,
      ].join(' ')}
    >
      {status === 'uploading' ? (
        <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      ) : null}
      {label}
    </span>
  )
}

type LiveFaceEditorProps = {
  label: string
  side: string
  apiUrl?: string | null
  faceState: FaceAutosaveState
  name: string
  disabled: boolean
  onFileChange: (file: File | null) => void
  onRetry: () => void
  onRevert: () => void
}

function LiveFaceEditor({
  label,
  side,
  apiUrl,
  faceState,
  name,
  disabled,
  onFileChange,
  onRetry,
  onRevert,
  compact = false,
}: LiveFaceEditorProps & { compact?: boolean }) {
  const { t } = useTranslation()
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [cropOpen, setCropOpen] = useState(false)
  const displayUrl = resolveFaceDisplayUrl(apiUrl, faceState)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const visibleDisplayUrl = displayUrl && failedUrl !== displayUrl ? displayUrl : null
  const isUploading = faceState.status === 'uploading'
  const showActions = faceState.status === 'failed'

  useEffect(() => {
    setFailedUrl(null)
  }, [displayUrl])

  return (
    <section className={compact ? 'flex flex-col gap-2' : 'flex flex-col gap-4'}>
      {!compact ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-navy-muted">{side}</p>
          <ImageStatusBadge status={faceState.status} />
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border/50 bg-white">
        {compact ? (
          <div className="flex items-center justify-between gap-2 border-b border-border/40 bg-muted/20 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-muted">
              {side}
            </p>
            <ImageStatusBadge status={faceState.status} />
          </div>
        ) : (
          <div className="border-b border-border/40 bg-muted/20 px-4 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-navy-muted">{label}</p>
          </div>
        )}

        {visibleDisplayUrl ? (
          <div className={['relative flex justify-center', compact ? 'p-2' : 'p-4 sm:p-6'].join(' ')}>
            <img
              src={visibleDisplayUrl}
              alt={label}
              onError={() => setFailedUrl(visibleDisplayUrl)}
              className={[
                'w-full object-contain',
                compact ? 'max-h-72 md:max-h-80 xl:max-h-[24rem]' : 'max-h-72 max-w-sm sm:max-h-80 lg:max-h-96',
                isUploading ? 'opacity-90' : '',
              ].join(' ')}
            />
            {!compact && faceState.status !== 'idle' ? (
              <div className="absolute left-4 top-4">
                <ImageStatusBadge status={faceState.status} />
              </div>
            ) : null}
          </div>
        ) : (
          <div
            className={[
              'flex flex-col items-center justify-center text-center',
              compact ? 'aspect-[4/3] px-2 py-6' : 'aspect-[4/3] px-4 py-10',
            ].join(' ')}
          >
            <p className="text-xs italic text-navy-muted">{t('detail.notProvided')}</p>
          </div>
        )}

        <div className={['border-t border-border/40', compact ? 'px-2 py-2' : 'px-4 py-4'].join(' ')}>
          <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-page px-3 py-2.5 text-xs font-semibold text-navy transition-colors hover:border-primary/30 hover:bg-white sm:text-sm">
            <input
              type="file"
              accept={ACCEPT}
              name={name}
              className="sr-only"
              disabled={disabled}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                event.target.value = ''
                if (file) {
                  setPendingFile(file)
                  setCropOpen(true)
                }
              }}
            />
            <Crop className={ICON_ACTION} aria-hidden />
            <span>{isUploading ? t('detail.uploadingEllipsis') : t('detail.replaceCrop')}</span>
          </label>
        </div>
      </div>

      {cropOpen ? (
        <Suspense fallback={null}>
          <ImageCropModal
            open={cropOpen}
            file={pendingFile}
            title={t('detail.cropTitle', { side: side.toLowerCase() })}
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

      {showActions ? (
        <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          {faceState.error ? (
            <p role="alert" className="text-sm text-red-700">
              {faceState.error}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={onRetry} className="action-btn-primary inline-flex min-h-10 flex-1 items-center justify-center gap-2">
              <RotateCcw className={ICON_ACTION} aria-hidden />
              <span>{t('detail.retry')}</span>
            </button>
            <button type="button" onClick={onRevert} className="action-btn-neutral inline-flex min-h-10 flex-1 items-center justify-center gap-2">
              <Undo2 className={ICON_ACTION} aria-hidden />
              <span>{t('detail.revert')}</span>
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function PendingGalleryCard({
  item,
  onRetry,
  onRemove,
}: {
  item: PendingGalleryUpload
  onRetry: () => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const isUploading = item.status === 'uploading'
  const isFailed = item.status === 'failed'

  return (
    <div
      className={[
        'flex flex-col overflow-hidden rounded-xl border bg-white',
        isFailed ? 'border-red-300' : 'border-border/60',
      ].join(' ')}
    >
      <div className="relative p-2">
        <img
          src={item.previewUrl}
          alt={item.file.name}
          className={[
            'aspect-square w-full rounded-lg object-cover',
            isUploading ? 'opacity-85' : '',
          ].join(' ')}
        />
        <div className="absolute left-3 top-3">
          <ImageStatusBadge status={item.status} />
        </div>
      </div>
      <div className="border-t border-border/60 px-3 py-2">
        <p className="truncate text-xs font-medium text-navy" title={item.file.name}>
          {item.file.name}
        </p>
      </div>
      <div className="mt-auto border-t border-border/60 p-3">
        {isFailed ? (
          <div className="flex flex-col gap-2">
            {item.error ? <p className="text-xs text-red-600">{item.error}</p> : null}
            <div className="flex gap-2">
              <button type="button" onClick={onRetry} className="action-btn-primary inline-flex min-h-10 flex-1 items-center justify-center gap-2">
                <RotateCcw className={ICON_ACTION} aria-hidden />
                <span>{t('detail.retry')}</span>
              </button>
              <button type="button" onClick={onRemove} className="action-btn-neutral inline-flex min-h-10 flex-1 items-center justify-center gap-2">
                <ImageMinus className={ICON_ACTION} aria-hidden />
                <span>{t('upload.remove')}</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onRemove}
            title={t('detail.removeImage')}
            aria-label={t('detail.removeImage')}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-red-50 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
          >
            <ImageMinus className={ICON_ACTION} aria-hidden />
            <span>{t('upload.remove')}</span>
          </button>
        )}
      </div>
    </div>
  )
}

function UndoRemovalBar({
  snack,
  onUndo,
}: {
  snack: UndoRemovalSnack
  onUndo: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-white px-4 py-3 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-navy">{snack.label}</p>
      <button type="button" onClick={onUndo} className="action-btn-primary inline-flex min-h-10 items-center gap-2 px-4">
        <Undo2 className={ICON_ACTION} aria-hidden />
        <span>{t('detail.undo')}</span>
      </button>
    </div>
  )
}

type SubmissionDetailImagesProps = {
  submission: CoinSubmissionDetail
  canEdit: boolean
  editState: SubmissionDetailImageEditState
  footerStatus: 'saved' | 'saving' | 'failed'
  onStartEdit: () => void
  onFinishEdit: () => void
  onObverseChange: (file: File | null) => void
  onReverseChange: (file: File | null) => void
  onGalleryAdd: (files: File[]) => void
  onGalleryRemove: (imageId: number) => void
  onUndoGalleryRemove: (imageId: number) => void
  onRetryObverse: () => void
  onRetryReverse: () => void
  onRevertObverse: () => void
  onRevertReverse: () => void
  onRetryGalleryUpload: (clientId: string) => void
  onDismissFailedGalleryUpload: (clientId: string) => void
  onGalleryReplace: (imageId: number, file: File) => void
  onCancelGalleryReplace: (imageId: number) => void
  onRetryGalleryReplace: (imageId: number) => void
  onGalleryPermanentDelete: (imageId: number) => void
  allowGalleryPermanentDelete?: boolean
  layout?: 'faces' | 'gallery' | 'actions'
  compactHero?: boolean
  editHref?: string
}

export function SubmissionDetailImages({
  submission,
  canEdit,
  editState,
  footerStatus,
  onStartEdit,
  onFinishEdit,
  onObverseChange,
  onReverseChange,
  onGalleryAdd,
  onGalleryRemove,
  onUndoGalleryRemove,
  onRetryObverse,
  onRetryReverse,
  onRevertObverse,
  onRevertReverse,
  onRetryGalleryUpload,
  onDismissFailedGalleryUpload,
  onGalleryReplace,
  onCancelGalleryReplace,
  onRetryGalleryReplace,
  onGalleryPermanentDelete,
  allowGalleryPermanentDelete = false,
  layout = 'faces',
  compactHero = false,
  editHref,
}: SubmissionDetailImagesProps) {
  const { t } = useTranslation()
  const gallery = submission.images.gallery ?? []
  const visibleGallery = getVisibleGalleryImages(submission, editState)
  const isBusy = editState.activeSaveCount > 0
  const [zoomImage, setZoomImage] = useState<{
    src: string
    alt: string
    label: string
  } | null>(null)

  const galleryReplacementPreviews: Record<number, string> = {}
  const replaceStatusById: Record<number, ImageCardStatus> = {}
  const replaceErrorById: Record<number, string> = {}

  for (const [id, state] of Object.entries(editState.galleryReplaceStates)) {
    const imageId = Number(id)
    if (state.previewUrl) {
      galleryReplacementPreviews[imageId] = state.previewUrl
    }
    replaceStatusById[imageId] = state.status
    if (state.error) {
      replaceErrorById[imageId] = state.error
    }
  }

  if (layout === 'actions') {
    if (!editState.isEditing) {
      return null
    }

    const statusLabel =
      footerStatus === 'saving'
        ? t('detail.saving')
        : footerStatus === 'failed'
          ? t('detail.someChangesFailed')
          : t('detail.allChangesSaved')

    const statusClass =
      footerStatus === 'saving'
        ? 'text-navy-muted'
        : footerStatus === 'failed'
          ? 'text-red-600'
          : 'text-primary'

    return (
      <div className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-3 border-t border-border/50 bg-[#faf8f5]/95 px-1 pb-1 pt-4 backdrop-blur-sm">
        {editState.undoSnack ? (
          <UndoRemovalBar
            snack={editState.undoSnack}
            onUndo={() => onUndoGalleryRemove(editState.undoSnack!.imageId)}
          />
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {footerStatus === 'saving' ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            ) : null}
            <p className={['text-sm font-medium', statusClass].join(' ')}>{statusLabel}</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="inline-flex min-h-11 w-full items-center gap-2 sm:w-auto"
            disabled={isBusy}
            onClick={onFinishEdit}
          >
            <Check className={ICON_ACTION} aria-hidden />
            <span>{t('detail.done')}</span>
          </Button>
        </div>
      </div>
    )
  }

  if (layout === 'gallery') {
    if (editState.isEditing) {
      return (
        <DetailSectionCard
          title={t('detail.gallery')}
          subtitle={t('detail.gallerySubtitle')}
          editHref={editHref}
        >
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            <EditableGalleryGrid
              embedded
              showAddTile
              images={visibleGallery}
              removedIds={editState.hiddenGalleryIds}
              disabled={isBusy}
              replacementPreviews={galleryReplacementPreviews}
              replaceStatusById={replaceStatusById}
              replaceErrorById={replaceErrorById}
              allowPermanentDelete={allowGalleryPermanentDelete}
              onToggleRemove={(imageId, remove) =>
                remove ? onGalleryRemove(imageId) : onUndoGalleryRemove(imageId)
              }
              onReplaceImage={onGalleryReplace}
              onCancelReplace={onCancelGalleryReplace}
              onRetryReplace={onRetryGalleryReplace}
              onPermanentDelete={onGalleryPermanentDelete}
              onAddFiles={onGalleryAdd}
            />

            {editState.pendingGalleryUploads.map((item) => (
              <PendingGalleryCard
                key={item.clientId}
                item={item}
                onRetry={() => onRetryGalleryUpload(item.clientId)}
                onRemove={() => onDismissFailedGalleryUpload(item.clientId)}
              />
            ))}
          </div>
        </DetailSectionCard>
      )
    }

    return (
      <>
        <SubmissionDetailGallery
          title={submission.title}
          images={gallery}
          showEmpty={false}
          editHref={editHref}
          onImageClick={setZoomImage}
        />
        <SubmissionImageZoomModal image={zoomImage} onClose={() => setZoomImage(null)} />
      </>
    )
  }

  return (
    <div className={compactHero ? 'flex flex-col gap-3' : 'flex flex-col gap-6'}>
      {canEdit ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-muted">
              {t('detail.coinImages')}
            </p>
            {editHref && !editState.isEditing ? (
              <Link
                to={editHref}
                className="inline-flex min-h-9 items-center rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:border-primary/30 hover:bg-primary/5"
              >
                {t('detail.edit')}
              </Link>
            ) : null}
          </div>
          {!editState.isEditing ? (
            <button
              type="button"
              onClick={onStartEdit}
              className="action-btn-primary inline-flex min-h-11 items-center gap-2 px-4"
            >
              <Images className={ICON_ACTION} aria-hidden />
              <span>{t('detail.editImages')}</span>
            </button>
          ) : (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {t('detail.liveEditing')}
            </span>
          )}
        </div>
      ) : null}

      {editState.isEditing ? (
        <div
          className={[
            compactHero ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4' : 'flex flex-col gap-8',
          ].join(' ')}
        >
          <LiveFaceEditor
            label={t('form.currentObverse')}
            side={t('form.obverse')}
            apiUrl={resolveSubmissionDetailFaceImageUrl(submission, 'obverse')}
            faceState={editState.obverse}
            name="obverse_image"
            disabled={editState.obverse.status === 'uploading'}
            onFileChange={onObverseChange}
            onRetry={onRetryObverse}
            onRevert={onRevertObverse}
            compact={compactHero}
          />
          <LiveFaceEditor
            label={t('form.currentReverse')}
            side={t('form.reverse')}
            apiUrl={resolveSubmissionDetailFaceImageUrl(submission, 'reverse')}
            faceState={editState.reverse}
            name="reverse_image"
            disabled={editState.reverse.status === 'uploading'}
            onFileChange={onReverseChange}
            onRetry={onRetryReverse}
            onRevert={onRevertReverse}
            compact={compactHero}
          />
        </div>
      ) : (
        <>
          <SubmissionCoinFaces
            submission={submission}
            compact={compactHero}
            onImageClick={setZoomImage}
          />
          <SubmissionImageZoomModal image={zoomImage} onClose={() => setZoomImage(null)} />
        </>
      )}
    </div>
  )
}
