import * as lib from '../index';

describe('public API surface', () => {
  it.each([
    'LocalizationProvider',
    'useTranslation',
    'useDeviceLocale',
    'getDeviceLocale',
    'getDeviceLocales',
    'getCountry',
    'getCalendar',
    'getTimeZone',
    'getNumberFormatSettings',
    'uses24HourClock',
    'usesMetricSystem',
    'isRTLForLanguage',
    'setAppLanguage',
    'getAppLanguage',
    'getSavedLocale',
    'saveLocale',
    'clearSavedLocale',
    'createFormatters',
    'matchLocale',
    'matchFirstLocale',
    'normalizeTag',
    'I18nKitError',
  ])('exports %s', (name) => {
    expect(typeof (lib as Record<string, unknown>)[name]).toBe('function');
  });

  it('does not leak internals', () => {
    const exported = Object.keys(lib);
    ['translate', 'toI18nKitError', 'getI18nKitEventEmitter'].forEach(
      (internal) => expect(exported).not.toContain(internal)
    );
  });
});
