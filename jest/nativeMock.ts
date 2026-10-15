import type { NativeLocaleInfo, Spec } from '../src/NativeI18nKit';

/**
 * Builds a NativeLocaleInfo from a BCP-47 tag, mirroring the native mappers.
 *
 * @param tag - BCP-47 tag such as `"en-US"` or `"ar"`.
 * @returns A locale descriptor whose `isRTL` is true for ar/he/fa/ur.
 */
export function localeFromTag(tag: string): NativeLocaleInfo {
  const [languageCode = '', second] = tag.split('-');
  const countryCode = second && second.length === 2 ? second : '';
  return {
    languageTag: tag,
    languageCode,
    countryCode,
    isRTL: ['ar', 'he', 'fa', 'ur'].includes(languageCode),
  };
}

type MockedSpec = { [K in keyof Spec]: jest.Mock };

/** One jest.fn per Spec method, so tests can assert calls and override results. */
export const nativeMock = {
  getDeviceLocales: jest.fn(),
  getDeviceLocale: jest.fn(),
  getCountry: jest.fn(),
  getCalendar: jest.fn(),
  getTimeZone: jest.fn(),
  getNumberFormatSettings: jest.fn(),
  uses24HourClock: jest.fn(),
  usesMetricSystem: jest.fn(),
  isRTLForLanguage: jest.fn(),
  setAppLanguage: jest.fn(),
  getAppLanguage: jest.fn(),
  addListener: jest.fn(),
  removeListeners: jest.fn(),
  getConstants: jest.fn(),
} as unknown as MockedSpec;

/**
 * Resets every native mock call history and restores the happy-path
 * defaults (an en-US, metric, 24-hour device whose `setAppLanguage` resolves
 * `true`). Call it from `beforeEach`.
 */
export function resetNativeMock(): void {
  const enUS = localeFromTag('en-US');
  Object.values(nativeMock).forEach((fn) => fn.mockReset());
  nativeMock.getDeviceLocales.mockReturnValue([enUS]);
  nativeMock.getDeviceLocale.mockReturnValue(enUS);
  nativeMock.getCountry.mockReturnValue('US');
  nativeMock.getCalendar.mockReturnValue('gregorian');
  nativeMock.getTimeZone.mockReturnValue('America/New_York');
  nativeMock.getNumberFormatSettings.mockReturnValue({
    decimalSeparator: '.',
    groupingSeparator: ',',
  });
  nativeMock.uses24HourClock.mockReturnValue(true);
  nativeMock.usesMetricSystem.mockReturnValue(true);
  nativeMock.isRTLForLanguage.mockImplementation((code: string) =>
    ['ar', 'he', 'fa', 'ur'].includes(code)
  );
  nativeMock.setAppLanguage.mockResolvedValue(true);
  nativeMock.getAppLanguage.mockReturnValue('');
}
