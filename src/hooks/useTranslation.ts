import { useLocalizationContext } from '../context/LocalizationProvider';
import type { UseTranslationResult } from '../types';

/**
 * Main hook for consuming translations and switching the active language.
 *
 * @example
 * const { t, locale, setLocale, availableLocales, isRTL } = useTranslation();
 * <Text>{t('home.greeting', { name: 'Rushikesh' })}</Text>
 * <Button title={locale === 'en' ? 'Switch to French' : 'Switch to English'}
 *         onPress={() => setLocale(locale === 'en' ? 'fr' : 'en')} />
 *
 * @returns `t` (translate function), `locale` (active code), `setLocale`
 * (async switcher), `resetLocale` (forget the saved choice), `availableLocales`
 * (sorted codes), `isRTL`, and the locale-bound formatters `formatNumber`,
 * `formatCurrency`, `formatPercent`, `formatDate` and `formatRelativeTime`.
 * @throws {I18nKitError} `PROVIDER_NOT_FOUND` when used outside a
 * `<LocalizationProvider>`.
 */
export function useTranslation(): UseTranslationResult {
  return useLocalizationContext();
}
