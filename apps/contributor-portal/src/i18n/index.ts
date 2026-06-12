import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

export const SUPPORTED_LANGUAGES = ['de', 'en'] as const
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]
export const LANGUAGE_STORAGE_KEY = 'coinarchive_language'

const localeLoaders: Record<AppLanguage, () => Promise<{ default: Record<string, unknown> }>> = {
  de: () => import('./locales/de.json'),
  en: () => import('./locales/en.json'),
}

function resolveInitialLanguage(): AppLanguage {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (stored === 'de' || stored === 'en') {
      return stored
    }
  }

  if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('en')) {
    return 'en'
  }

  return 'de'
}

export async function ensureAppLanguageLoaded(language: AppLanguage): Promise<void> {
  if (i18n.hasResourceBundle(language, 'translation')) {
    return
  }

  const module = await localeLoaders[language]()
  i18n.addResourceBundle(language, 'translation', module.default, true, true)
}

export async function bootstrapI18n(): Promise<typeof i18n> {
  const initialLanguage = resolveInitialLanguage()
  const primaryLocale = await localeLoaders[initialLanguage]()

  await i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        [initialLanguage]: { translation: primaryLocale.default },
      },
      lng: initialLanguage,
      fallbackLng: 'de',
      supportedLngs: [...SUPPORTED_LANGUAGES],
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
        lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      },
    })

  const secondaryLanguage: AppLanguage = initialLanguage === 'de' ? 'en' : 'de'
  void ensureAppLanguageLoaded(secondaryLanguage)

  return i18n
}

export default i18n
