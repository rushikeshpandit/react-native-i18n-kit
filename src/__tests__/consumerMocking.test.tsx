import { TurboModuleRegistry } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { LocalizationProvider } from '../context/LocalizationProvider';
import { useTranslation } from '../hooks/useTranslation';
import { getDeviceLocale } from '../nativeApi';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Verifies the "Testing your app" recipe from the README: an app can supply a
 * fake native module by intercepting `TurboModuleRegistry.get('I18nKit')`
 * before importing the library.
 */
describe('README consumer mocking recipe', () => {
  const fakeNative = {
    getDeviceLocales: () => [
      {
        languageTag: 'fr-FR',
        languageCode: 'fr',
        countryCode: 'FR',
        isRTL: false,
      },
    ],
    getDeviceLocale: () => ({
      languageTag: 'fr-FR',
      languageCode: 'fr',
      countryCode: 'FR',
      isRTL: false,
    }),
    isRTLForLanguage: () => false,
    addListener: () => {},
    removeListeners: () => {},
  };

  it('lets library code run against an app-provided fake', () => {
    jest.resetModules();
    jest
      .spyOn(TurboModuleRegistry, 'get')
      .mockImplementation(((name: string) =>
        name === 'I18nKit' ? fakeNative : null) as never);

    // Imported after the spy, exactly as a consumer's jest.setup would arrange.
    const lib = require('../nativeApi') as {
      getDeviceLocale: typeof getDeviceLocale;
    };
    expect(lib.getDeviceLocale().languageTag).toBe('fr-FR');
    jest.restoreAllMocks();
  });

  it('renders translations with autoDetectDeviceLocale={false} and no native calls needed', () => {
    let text = '';
    const Probe = () => {
      text = useTranslation().t('hello');
      return null;
    };
    act(() => {
      TestRenderer.create(
        <LocalizationProvider
          translations={{ en: { hello: 'Hi' } }}
          defaultLocale="en"
          autoDetectDeviceLocale={false}
          manageRTL={false}
        >
          <Probe />
        </LocalizationProvider>
      );
    });
    expect(text).toBe('Hi');
  });
});
