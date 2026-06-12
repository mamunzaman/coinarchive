import { Hash } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { generateCoinCodePreview } from '../../lib/coinCodePreview'
import type { TaxonomyOption } from '../../types/formOptions'

type CoinCodePreviewProps = {
  country: string
  year: string
  denomination: string
  coinType: string
  releaseDate?: string
  countries?: TaxonomyOption[]
  variant?: 'form' | 'review'
}

export function CoinCodePreview({
  country,
  year,
  denomination,
  coinType,
  releaseDate = '',
  countries = [],
  variant = 'form',
}: CoinCodePreviewProps) {
  const { t } = useTranslation()
  const preview = generateCoinCodePreview(
    country,
    year,
    denomination,
    coinType,
    countries,
    releaseDate,
  )

  const isReview = variant === 'review'
  const title = isReview ? t('coinCodePreview.reviewTitle') : t('coinCodePreview.title')
  const shellClass = isReview
    ? 'rounded-xl border border-primary/25 bg-gradient-to-br from-white via-[#f8fbfa] to-[#f3f8f7] px-4 py-4 shadow-[var(--shadow-card)] sm:px-5 sm:py-5'
    : 'rounded-xl border border-border/60 bg-muted/20 px-4 py-3'

  if (!preview.baseComplete) {
    return (
      <div className={shellClass}>
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-primary" aria-hidden />
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-navy-muted">
            {title}
          </p>
        </div>
        <p className="mt-2 text-sm text-navy-muted">
          {t('coinCodePreview.completeFields')}
        </p>
        {preview.releaseDateMissing ? (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
          >
            {t('coinCodePreview.releaseDateRequired')}
          </p>
        ) : null}
      </div>
    )
  }

  const warningShellClass = preview.releaseDateMissing
    ? isReview
      ? 'rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4 shadow-[var(--shadow-card)] sm:px-5 sm:py-5'
      : 'rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3'
    : shellClass

  return (
    <div className={warningShellClass}>
      <div className="flex items-center gap-2">
        <Hash className="h-4 w-4 text-primary" aria-hidden />
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-navy-muted">
          {title}
        </p>
      </div>

      <p
        className={[
          'mt-3 break-all font-mono font-semibold text-navy',
          isReview ? 'text-base sm:text-lg' : 'text-sm',
        ].join(' ')}
      >
        {preview.coinCode}
      </p>

      {preview.releaseDateMissing ? (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-amber-300 bg-white/70 px-3 py-2 text-xs font-medium text-amber-950"
        >
          {t('coinCodePreview.releaseDateRequired')}
        </p>
      ) : null}

      <p className="mt-3 text-xs leading-relaxed text-navy-muted">
        {isReview
          ? t('coinCodePreview.reviewHint')
          : t('coinCodePreview.formHint')}
      </p>
      {!isReview ? (
        <p className="mt-1 text-xs text-navy-muted">{t('coinCodePreview.finalSuffixHint')}</p>
      ) : null}
    </div>
  )
}
