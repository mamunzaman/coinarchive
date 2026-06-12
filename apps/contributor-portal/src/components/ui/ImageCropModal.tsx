import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Cropper,
  CropperPreview,
  Priority,
  type CropperPreviewRef,
  type CropperRef,
  type CropperState,
  ImageRestriction,
} from 'react-advanced-cropper'
import 'react-advanced-cropper/dist/style.css'
import {
  Maximize2,
  RotateCcw,
  RotateCw,
  Square,
  Scan,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'
import { canvasToFile, formatFileSize, getOutputMimeType } from '../../lib/imageCropUtils'

type AspectMode = 'square' | 'free'

function getFittedStencilSize(state: CropperState, aspectMode: AspectMode) {
  const { imageSize } = state

  if (aspectMode === 'square') {
    const side = Math.min(imageSize.width, imageSize.height)
    return { width: side, height: side }
  }

  return { width: imageSize.width, height: imageSize.height }
}

function getFittedStencilPosition(state: CropperState) {
  const { imageSize, coordinates } = state
  const width = coordinates?.width ?? imageSize.width
  const height = coordinates?.height ?? imageSize.height

  return {
    left: Math.max(0, (imageSize.width - width) / 2),
    top: Math.max(0, (imageSize.height - height) / 2),
  }
}

function getFittedVisibleArea(state: CropperState) {
  const { imageSize, boundary } = state
  const imageRatio = imageSize.width / imageSize.height
  const boundaryRatio = boundary.width / boundary.height

  if (imageRatio < boundaryRatio) {
    return {
      left: imageSize.width / 2 - (imageSize.height * boundaryRatio) / 2,
      top: 0,
      width: imageSize.height * boundaryRatio,
      height: imageSize.height,
    }
  }

  return {
    left: 0,
    top: imageSize.height / 2 - imageSize.width / boundaryRatio / 2,
    width: imageSize.width,
    height: imageSize.width / boundaryRatio,
  }
}

type ImageCropModalProps = {
  open: boolean
  file: File | null
  title?: string
  onClose: () => void
  onSave: (file: File) => void
}

export function ImageCropModal({
  open,
  file,
  title,
  onClose,
  onSave,
}: ImageCropModalProps) {
  const { t } = useTranslation()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const cropperRef = useRef<CropperRef>(null)
  const previewRef = useRef<CropperPreviewRef>(null)
  const zoomRef = useRef(1)
  const shouldResetRotationRef = useRef(true)

  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [aspectMode, setAspectMode] = useState<AspectMode>('square')
  const [outputSize, setOutputSize] = useState<{ width: number; height: number } | null>(null)
  const [cropperReady, setCropperReady] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!file || !open) {
      setImageUrl(null)
      setOutputSize(null)
      setCropperReady(false)
      return
    }

    const url = URL.createObjectURL(file)
    setImageUrl(url)
    setZoom(1)
    zoomRef.current = 1
    setRotation(0)
    setAspectMode('square')
    setError(null)
    setCropperReady(false)
    shouldResetRotationRef.current = true

    return () => URL.revokeObjectURL(url)
  }, [file, open])

  useEffect(() => {
    if (!open) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    closeButtonRef.current?.focus()

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  const handleUpdate = useCallback((cropper: CropperRef) => {
    previewRef.current?.update(cropper)

    const coordinates = cropper.getCoordinates()
    if (coordinates) {
      setOutputSize({
        width: Math.round(coordinates.width),
        height: Math.round(coordinates.height),
      })
    }

    const transforms = cropper.getTransforms()
    if (typeof transforms.rotate === 'number') {
      setRotation(Math.round(transforms.rotate))
    }
  }, [])

  const applyFittedView = useCallback(
    (cropper: CropperRef, mode: AspectMode, resetRotation = false) => {
      if (resetRotation) {
        const currentRotation = cropper.getTransforms().rotate ?? 0
        if (currentRotation !== 0) {
          cropper.rotateImage(0, { immediately: true, transitions: false })
        }
      }

      cropper.setCoordinates(
        [
          (state) => getFittedStencilSize(state, mode),
          (state) => getFittedStencilPosition(state),
        ],
        { immediately: true },
      )

      cropper.setState(
        (state) =>
          state
            ? {
                ...state,
                visibleArea: getFittedVisibleArea(state),
              }
            : state,
        { immediately: true },
      )

      setZoom(1)
      zoomRef.current = 1
      if (resetRotation) {
        setRotation(0)
      }
      handleUpdate(cropper)
    },
    [handleUpdate],
  )

  useEffect(() => {
    if (!open || !cropperReady) {
      return
    }

    const cropper = cropperRef.current
    if (!cropper) {
      return
    }

    applyFittedView(cropper, aspectMode, shouldResetRotationRef.current)
    shouldResetRotationRef.current = false
  }, [open, cropperReady, aspectMode, applyFittedView])

  function handleZoomChange(value: number) {
    const cropper = cropperRef.current
    if (!cropper) {
      setZoom(value)
      zoomRef.current = value
      return
    }

    const factor = value / zoomRef.current
    cropper.zoomImage(factor, { immediately: true, transitions: false })
    zoomRef.current = value
    setZoom(value)
  }

  function handleRotationChange(value: number) {
    const cropper = cropperRef.current
    if (!cropper) {
      setRotation(value)
      return
    }

    const current = cropper.getTransforms().rotate ?? 0
    cropper.rotateImage(value - current, { immediately: true, transitions: false })
    setRotation(value)
  }

  function handleReset() {
    const cropper = cropperRef.current
    if (!cropper) {
      return
    }

    applyFittedView(cropper, aspectMode, true)
  }

  function handleRotateBy(delta: number) {
    const cropper = cropperRef.current
    if (!cropper) {
      setRotation((value) => value + delta)
      return
    }

    cropper.rotateImage(delta, { immediately: true, transitions: true })
    setRotation((value) => value + delta)
  }

  async function handleSave() {
    if (!file || !cropperRef.current) {
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const canvas = cropperRef.current.getCanvas()
      if (!canvas) {
        throw new Error('Crop failed.')
      }

      const mimeType = getOutputMimeType(file)
      const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'
      const baseName = file.name.replace(/\.[^.]+$/, '')
      const cropped = await canvasToFile(canvas, `${baseName}-cropped.${extension}`, mimeType)
      onSave(cropped)
      onClose()
    } catch {
      setError(t('crop.saveError'))
    } finally {
      setIsSaving(false)
    }
  }

  if (!open || !file) {
    return null
  }

  const outputLabel = outputSize
    ? `${outputSize.width} × ${outputSize.height} px`
    : t('crop.adjustCropPreview')

  const stencilProps =
    aspectMode === 'square'
      ? {
          aspectRatio: 1,
          grid: true,
          movable: true,
          resizable: true,
          handlers: {
            eastNorth: true,
            north: true,
            westNorth: true,
            west: true,
            westSouth: true,
            south: true,
            eastSouth: true,
            east: true,
          },
          lines: {
            west: true,
            north: true,
            east: true,
            south: true,
          },
        }
      : {
          grid: true,
          movable: true,
          resizable: true,
          handlers: {
            eastNorth: true,
            north: true,
            westNorth: true,
            west: true,
            westSouth: true,
            south: true,
            eastSouth: true,
            east: true,
          },
          lines: {
            west: true,
            north: true,
            east: true,
            south: true,
          },
        }

  return (
    <div
      className="image-crop-modal"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-crop-title"
        className="image-crop-modal__dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="image-crop-modal__header">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 id="image-crop-title" className="truncate font-serif text-lg font-semibold text-navy sm:text-xl">
                {title ?? t('crop.adjustImage')}
              </h2>
              <p className="mt-0.5 truncate text-xs text-navy-muted sm:text-sm">
                {outputLabel}
                {aspectMode === 'free' ? t('crop.freeResizeHint') : ''}
              </p>
            </div>
            <div className="hidden shrink-0 text-right text-xs text-navy-muted sm:block">
              <p className="max-w-[12rem] truncate font-medium text-navy" title={file.name}>
                {file.name}
              </p>
              <p className="mt-0.5">{formatFileSize(file.size)}</p>
            </div>
          </div>
        </header>

        <div className="image-crop-modal__body">
          <div className="image-crop-modal__layout">
            <div className="image-crop-modal__workspace image-crop-modal-cropper">
              {imageUrl ? (
                <Cropper
                  ref={cropperRef}
                  src={imageUrl}
                  className="h-full w-full"
                  priority={Priority.visibleArea}
                  imageRestriction={ImageRestriction.fitArea}
                  defaultSize={(state) => getFittedStencilSize(state, aspectMode)}
                  defaultPosition={getFittedStencilPosition}
                  defaultVisibleArea={getFittedVisibleArea}
                  stencilProps={stencilProps}
                  onReady={() => setCropperReady(true)}
                  onUpdate={handleUpdate}
                />
              ) : null}
            </div>

            <aside className="image-crop-modal__sidebar">
              <div className="image-crop-modal__preview-card">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-navy-muted">
                  {t('crop.livePreview')}
                </p>
                <div className="image-crop-modal__preview-frame mt-2">
                  {cropperReady ? (
                    <CropperPreview
                      ref={previewRef}
                      className="h-full w-full"
                      contentClassName="h-full w-full object-contain"
                    />
                  ) : (
                    <p className="flex h-full items-center justify-center px-2 text-center text-[11px] text-navy-muted">
                      {t('crop.preview')}
                    </p>
                  )}
                </div>
              </div>

              <div className="image-crop-modal__controls">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-navy-muted">
                    {t('crop.zoom')}
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={4}
                    step={0.01}
                    value={zoom}
                    onChange={(event) => handleZoomChange(Number(event.target.value))}
                    aria-label={t('crop.zoom')}
                    className="image-crop-modal__range"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-navy-muted">
                    {t('crop.rotation')}
                  </span>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={rotation}
                    onChange={(event) => handleRotationChange(Number(event.target.value))}
                    aria-label={t('crop.rotation')}
                    className="image-crop-modal__range"
                  />
                </label>

                <div className="image-crop-modal__toolbar">
                  <button
                    type="button"
                    className="image-crop-modal__tool-btn"
                    onClick={() => handleRotateBy(-90)}
                    aria-label={t('crop.rotateLeft')}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="image-crop-modal__tool-btn"
                    onClick={() => handleRotateBy(90)}
                    aria-label={t('crop.rotateRight')}
                  >
                    <RotateCw className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="image-crop-modal__tool-btn px-3.5"
                    onClick={handleReset}
                  >
                    {t('crop.reset')}
                  </button>
                  <button
                    type="button"
                    className="image-crop-modal__tool-btn px-3.5"
                    onClick={handleReset}
                    aria-label={t('crop.fitImage')}
                  >
                    <Maximize2 className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={[
                      'image-crop-modal__tool-btn px-3.5',
                      aspectMode === 'square' ? 'image-crop-modal__tool-btn--active' : '',
                    ].join(' ')}
                    onClick={() => setAspectMode('square')}
                    aria-pressed={aspectMode === 'square'}
                  >
                    <Square className="mr-1 h-4 w-4" aria-hidden />
                    1:1
                  </button>
                  <button
                    type="button"
                    className={[
                      'image-crop-modal__tool-btn px-3.5',
                      aspectMode === 'free' ? 'image-crop-modal__tool-btn--active' : '',
                    ].join(' ')}
                    onClick={() => setAspectMode('free')}
                    aria-pressed={aspectMode === 'free'}
                  >
                    <Scan className="mr-1 h-4 w-4" aria-hidden />
                    {t('crop.free')}
                  </button>
                </div>

                {error ? (
                  <p role="alert" className="text-xs text-red-600">
                    {error}
                  </p>
                ) : null}
              </div>
            </aside>
          </div>
        </div>

        <footer className="image-crop-modal__footer">
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end sm:gap-3">
            <button
              ref={closeButtonRef}
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-text-primary transition-all hover:border-text-primary/20 hover:bg-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
            >
              {t('common.cancel')}
            </button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={isSaving || !cropperReady}
              onClick={() => void handleSave()}
            >
              {isSaving ? t('crop.saving') : t('crop.saveCrop')}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}
