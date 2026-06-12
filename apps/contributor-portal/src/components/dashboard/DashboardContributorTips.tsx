import { useTranslation } from 'react-i18next'

export function DashboardContributorTips() {
  const { t } = useTranslation()
  const tips = [
    {
      title: t('dashboard.tips.coreTitle'),
      body: t('dashboard.tips.coreBody'),
    },
    {
      title: t('dashboard.tips.photosTitle'),
      body: t('dashboard.tips.photosBody'),
    },
  ]

  return (
    <details className="rounded-2xl border border-border/60 bg-surface p-4 shadow-[var(--shadow-card)]">
      <summary className="cursor-pointer list-none">
        <p className="section-label">{t('dashboard.tips.sectionLabel')}</p>
        <h2 className="mt-2 font-serif text-base font-semibold text-navy">
          {t('dashboard.tips.title')}
        </h2>
        <p className="mt-1 text-sm text-navy-muted">{t('dashboard.tips.subtitle')}</p>
      </summary>
      <ul className="mt-3 space-y-2.5">
        {tips.map((tip) => (
          <li key={tip.title} className="rounded-lg border border-border/60 bg-page px-3 py-2.5">
            <p className="text-sm font-semibold text-navy">{tip.title}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-navy-muted">{tip.body}</p>
          </li>
        ))}
      </ul>
    </details>
  )
}
