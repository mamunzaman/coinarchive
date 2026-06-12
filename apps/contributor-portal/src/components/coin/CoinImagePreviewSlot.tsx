import { useEffect, useState } from 'react'
import { CircleDollarSign, ImageOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ImageLoadStatus } from '../../hooks/useImageLoadState'
import {
  getCoinImagePreviewLoadingText,
  resolveCoinImagePreviewDisplayState,
  type ImagePreviewSource,
} from '../../lib/imagePreview'

const SIZE_CLASS = {
  field: 'h-24 w-24 md:h-[88px] md:w-[88px] xl:h-28 xl:w-28',
  catalogue: 'aspect-square w-full',
  compact: 'h-9 w-9 sm:h-10 sm:w-10',
} as const

const LOADER_SIZE_CLASS = {
  field: 'coin-preview-loader--field',
  catalogue: 'coin-preview-loader--catalogue',
  compact: 'coin-preview-loader--compact',
} as const

const ICON_SIZE_CLASS = {
  field: 'h-5 w-5 xl:h-6 xl:w-6',
  catalogue: 'h-6 w-6 sm:h-7 sm:w-7',
  compact: 'h-3 w-3 sm:h-3.5 sm:w-3.5',
} as const

type CoinImagePreviewSlotProps = {
  previewUrl?: string | null
  previewSource?: ImagePreviewSource
  formOptionsLoading?: boolean
  isNewSelection?: boolean
  alt?: string
  size?: keyof typeof SIZE_CLASS
  objectFit?: 'cover' | 'contain'
  className?: string
  emptyLabel?: string
}

function CoinImageLoadingPlaceholder({
  size,
  loadingLabel,
  ariaHidden = false,
}: {
  size: keyof typeof SIZE_CLASS
  loadingLabel: string
  ariaHidden?: boolean
}) {
  return (
    <div
      className={['coin-preview-loader', LOADER_SIZE_CLASS[size]].join(' ')}
      role={ariaHidden ? undefined : 'status'}
      aria-live={ariaHidden ? undefined : 'polite'}
      aria-busy={ariaHidden ? undefined : 'true'}
      aria-hidden={ariaHidden ? true : undefined}
      aria-label={ariaHidden ? undefined : loadingLabel}
    >
      <div className="coin-preview-loader__shimmer" aria-hidden="true" />
      <div className="coin-preview-loader__ring" aria-hidden="true" />
      <div className="coin-preview-loader__disc flex items-center justify-center" aria-hidden="true">
        <CircleDollarSign
          className={['coin-preview-loader__icon', ICON_SIZE_CLASS[size]].join(' ')}
          strokeWidth={1.5}
          aria-hidden
        />
      </div>
      {!ariaHidden ? (
        <span className="sr-only">{loadingLabel}</span>
      ) : null}
    </div>
  )
}

export function CoinImagePreviewSlot({
  previewUrl,
  previewSource = 'none',
  formOptionsLoading = false,
  isNewSelection = false,
  alt = 'Coin image preview',
  size = 'field',
  objectFit = 'cover',
  className = '',
  emptyLabel,
}: CoinImagePreviewSlotProps) {
  const { t } = useTranslation()
  const [imageLoadStatus, setImageLoadStatus] = useState<ImageLoadStatus>('idle')

  useEffect(() => {
    if (!previewUrl) {
      setImageLoadStatus('idle')
      return
    }

    setImageLoadStatus('loading')
  }, [previewUrl])

  const displayState = resolveCoinImagePreviewDisplayState({
    formOptionsLoading,
    previewSource,
    previewUrl,
    imageLoadStatus,
    isNewSelection,
  })

  const loadingLabel =
    getCoinImagePreviewLoadingText(displayState, previewSource) ?? 'Loading coin image'
  const showSkeleton =
    displayState === 'loading-default' || displayState === 'loading-image'
  const showImage = Boolean(previewUrl) && displayState !== 'error'
  const fitClass = objectFit === 'contain' ? 'object-contain p-1.5' : 'object-cover'

  return (
    <div
      className={[
        'relative shrink-0 overflow-hidden rounded-lg border border-[#e8e2d8]/90 bg-[#faf7f2] shadow-sm',
        SIZE_CLASS[size],
        className,
      ].join(' ')}
    >
      {showSkeleton ? (
        <CoinImageLoadingPlaceholder
          size={size}
          loadingLabel={loadingLabel}
          ariaHidden={displayState === 'loading-image'}
        />
      ) : null}

      {displayState === 'error' ? (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[#f7f4ef] px-1"
          role="img"
          aria-label={t('imagePreview.unavailable')}
        >
          <ImageOff className="h-4 w-4 text-stone-400" aria-hidden />
          {size !== 'compact' ? (
            <span className="text-center text-[9px] text-stone-500">{t('imagePreview.unavailable')}</span>
          ) : null}
        </div>
      ) : null}

      {displayState === 'empty' && !showSkeleton ? (
        <div
          className="absolute inset-0 flex items-center justify-center bg-muted/40 px-1"
          role="img"
          aria-label={emptyLabel ?? t('imagePreview.noImageSelected')}
        >
          {emptyLabel && size !== 'compact' ? (
            <span className="text-center text-xs text-navy-muted">{emptyLabel}</span>
          ) : null}
        </div>
      ) : null}

      {showImage ? (
        <img
          src={previewUrl ?? undefined}
          alt={alt}
          className={[
            'h-full w-full transition-opacity duration-300',
            fitClass,
            displayState === 'loaded' ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
          onLoad={() => setImageLoadStatus('loaded')}
          onError={() => setImageLoadStatus('error')}
        />
      ) : null}
    </div>
  )
}
