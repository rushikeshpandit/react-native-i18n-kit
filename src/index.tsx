export { LocalizationProvider } from './context/LocalizationProvider';
export { useTranslation } from './hooks/useTranslation';
export { useDeviceLocale } from './hooks/useDeviceLocale';
export type { DeviceLocaleSnapshot } from './hooks/useDeviceLocale';

export {
  getDeviceLocale,
  getDeviceLocales,
  getCountry,
  getCalendar,
  getTimeZone,
  getNumberFormatSettings,
  uses24HourClock,
  usesMetricSystem,
  isRTLForLanguage,
  setAppLanguage,
  getAppLanguage,
} from './nativeApi';

export { I18nKitError } from './errors';
export type { I18nKitErrorCode } from './errors';

export type {
  LocaleInfo,
  NumberFormatSettings,
  TranslationTree,
  TranslationMap,
  TranslationValue,
  PluralMap,
  TranslateOptions,
  TFunction,
  LocalizationProviderProps,
  UseTranslationResult,
  InterpolationParams,
} from './types';
