import { useTranslation } from 'react-i18next'
import type { CoinFormValues } from '../../types/coinForm'
import type { TaxonomyOption } from '../../types/formOptions'
import { generateCoinCodePreview } from '../../lib/coinCodePreview'
import type { ImagePreviewSource } from '../../lib/imagePreview'
import { CoinImagePreviewSlot } from './CoinImagePreviewSlot'

type CoinCataloguePreviewCardProps = {
  values: CoinFormValues
  obversePreviewUrl?: string | null
  reversePreviewUrl?: string | null
  obversePreviewSource?: ImagePreviewSource
  reversePreviewSource?: ImagePreviewSource
  formOptionsLoading?: boolean
  countries?: TaxonomyOption[]
  title?: string
  embedded?: boolean
  compact?: boolean
}

export function CoinCataloguePreviewCard({
  values,
  obversePreviewUrl,
  reversePreviewUrl,
  obversePreviewSource = 'none',
  reversePreviewSource = 'none',
  formOptionsLoading = false,
  countries = [],
  title,
  embedded = false,
  compact = false,
}: CoinCataloguePreviewCardProps) {
  const { t } = useTranslation()
  const resolvedTitle = title ?? t('review.cataloguePreview')
  const codePreview = generateCoinCodePreview(
    values.country,
    values.year,
    values.denomination,
    values.coin_type,
    countries,
    values.released_date,
  )

  const descriptionPreview =
    values.short_description.trim() ||
    'Short description will appear here as you type.'

  return (
    <div
      className={
        embedded
          ? 'min-w-0'
          : 'rounded-xl border border-border/70 bg-white p-4 shadow-[var(--shadow-card)]'
      }
    >
      {!embedded ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy-muted">
          {resolvedTitle}
        </p>
      ) : null}

      <div className={embedded ? 'mt-0 grid grid-cols-2 gap-2' : 'mt-4 grid grid-cols-2 gap-3'}>
        <PreviewFace
          label="Obverse"
          alt="Obverse preview"
          url={obversePreviewUrl}
          previewSource={obversePreviewSource}
          formOptionsLoading={formOptionsLoading}
          compact={compact}
        />
        <PreviewFace
          label="Reverse"
          alt="Reverse preview"
          url={reversePreviewUrl}
          previewSource={reversePreviewSource}
          formOptionsLoading={formOptionsLoading}
          compact={compact}
        />
      </div>

      <div className={compact ? 'mt-2.5 space-y-1' : 'mt-4 space-y-1.5'}>
        <p className={compact ? 'font-serif text-base font-semibold text-navy' : 'font-serif text-lg font-semibold text-navy'}>
          {values.country.trim() || 'Country'}
        </p>
        <p className={compact ? 'text-xs text-navy-muted' : 'text-sm text-navy-muted'}>
          {[values.year.trim() || 'Year', values.denomination.trim() || 'Denomination']
            .filter(Boolean)
            .join(' · ')}
        </p>
        <p className={compact ? 'text-xs font-medium text-primary' : 'text-sm font-medium text-primary'}>
          {values.coin_type.trim() || 'Coin type'}
        </p>
      </div>

      <p
        className={[
          compact ? 'mt-2.5 line-clamp-2 text-xs leading-relaxed text-navy-muted' : 'mt-4 line-clamp-4 text-sm leading-relaxed text-navy-muted',
        ].join(' ')}
      >
        {descriptionPreview}
      </p>

      {codePreview.baseComplete ? (
        <div className={compact ? 'mt-2.5 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2' : 'mt-4 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5'}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-navy-muted">
            Coin code
          </p>
          <p className="mt-0.5 font-mono text-sm font-semibold text-navy">{codePreview.coinCode}</p>
          {codePreview.releaseDateMissing ? (
            <p className="mt-1.5 text-[11px] text-amber-700">
              Release date required before coin code can be generated.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function PreviewFace({
  label,
  alt,
  url,
  previewSource,
  formOptionsLoading,
  compact = false,
}: {
  label: string
  alt: string
  url?: string | null
  previewSource?: ImagePreviewSource
  formOptionsLoading?: boolean
  compact?: boolean
}) {
  const { t } = useTranslation()

  const showSlot =
    formOptionsLoading ||
    Boolean(url) ||
    previewSource === 'default' ||
    previewSource === 'existing' ||
    previewSource === 'selected'

  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-navy-muted">
        {label}
      </p>
      {showSlot ? (
        <CoinImagePreviewSlot
          previewUrl={url}
          previewSource={previewSource}
          formOptionsLoading={formOptionsLoading}
          alt={alt}
          size="catalogue"
          objectFit="contain"
          className={[
            'rounded-lg bg-panel shadow-none',
            compact ? 'max-h-24 sm:max-h-28' : 'rounded-xl',
          ].join(' ')}
          emptyLabel={t('imagePreview.noImage')}
        />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-border/60 bg-panel text-xs text-navy-muted">
          {t('imagePreview.noImage')}
        </div>
      )}
    </div>
  )
}
