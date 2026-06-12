import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type CoinFormDataLoadingOverlayProps = {
  className?: string
}

export function CoinFormDataLoadingOverlay({ className = '' }: CoinFormDataLoadingOverlayProps) {
  const { t } = useTranslation()

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={[
        'absolute inset-0 z-20 flex items-center justify-center rounded-lg',
        'bg-white/72 backdrop-blur-[2px]',
        className,
      ].join(' ')}
    >
      <div className="mx-4 max-w-sm rounded-xl border border-border/50 bg-white/95 px-5 py-4 text-center shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" aria-hidden />
        <p className="mt-3 text-sm font-medium text-navy">{t('form.loadingCoinFormData')}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-navy-muted">
          {t('form.loadingCoinFormDataHint')}
        </p>
      </div>
    </div>
  )
}
