import { useTranslation } from 'react-i18next'
import { ensureAppLanguageLoaded, type AppLanguage } from '../../i18n'

const LANGUAGES: AppLanguage[] = ['de', 'en']

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const activeLanguage: AppLanguage = i18n.language.startsWith('en') ? 'en' : 'de'

  return (
    <div
      role="group"
      aria-label={t('language.switcherLabel')}
      className="inline-flex items-center rounded-xl border border-border bg-white p-0.5"
    >
      {LANGUAGES.map((language) => {
        const isActive = activeLanguage === language

        return (
          <button
            key={language}
            type="button"
            onClick={() => {
              void ensureAppLanguageLoaded(language).then(() => i18n.changeLanguage(language))
            }}
            aria-pressed={isActive}
            className={[
              'min-h-9 min-w-10 rounded-lg px-2.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary/25',
              isActive
                ? 'bg-primary text-white'
                : 'text-navy-muted hover:bg-page hover:text-navy',
            ].join(' ')}
          >
            {t(`language.${language}`)}
          </button>
        )
      })}
    </div>
  )
}
