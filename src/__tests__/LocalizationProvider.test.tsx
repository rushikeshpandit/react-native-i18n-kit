import { DeviceEventEmitter, I18nManager } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { LocalizationProvider } from '../context/LocalizationProvider';
import { useTranslation } from '../hooks/useTranslation';
import { I18nKitError } from '../errors';
import type { LocalizationProviderProps, UseTranslationResult } from '../types';
import {
  localeFromTag,
  nativeMock,
  resetNativeMock,
} from '../../jest/nativeMock';

jest.mock('../NativeI18nKit', () => ({
  __esModule: true,
  default: require('../../jest/nativeMock').nativeMock,
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const translations = {
  en: {
    hello: 'Hello, {{name}}!',
    onlyEn: 'Only English',
    items: { one: '{{count}} item', other: '{{count}} items' },
  },
  fr: { hello: 'Bonjour, {{name}}!' },
  ar: { hello: 'مرحبا، {{name}}!' },
};

type Props = Partial<Omit<LocalizationProviderProps, 'children'>>;

/** Mounts a provider and exposes the latest useTranslation() result. */
const mounted: (() => void)[] = [];

function mount(props: Props = {}) {
  const ref: { current: UseTranslationResult | null } = { current: null };
  const Probe = () => {
    ref.current = useTranslation();
    return null;
  };
  let renderer!: TestRenderer.ReactTestRenderer;
  const element = (p: Props) => (
    <LocalizationProvider translations={translations} defaultLocale="en" {...p}>
      <Probe />
    </LocalizationProvider>
  );
  act(() => {
    renderer = TestRenderer.create(element(props));
  });
  mounted.push(() => act(() => renderer.unmount()));
  return {
    get api() {
      return ref.current!;
    },
    rerender: (p: Props = props) => act(() => renderer.update(element(p))),
  };
}

let forceRTL: jest.SpyInstance;
let warn: jest.SpyInstance;

beforeEach(() => {
  resetNativeMock();
  forceRTL = jest.spyOn(I18nManager, 'forceRTL').mockImplementation(() => {});
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.replaceProperty(I18nManager, 'isRTL', false);
});

afterEach(() => {
  mounted.splice(0).forEach((unmount) => unmount());
  jest.restoreAllMocks();
});

describe('LocalizationProvider - initial locale (positive)', () => {
  it('starts at defaultLocale when the device locale is not shipped', () => {
    nativeMock.getDeviceLocales.mockReturnValue([localeFromTag('de-DE')]);
    expect(mount().api.locale).toBe('en');
  });

  it('picks the device language when it is shipped', () => {
    nativeMock.getDeviceLocales.mockReturnValue([localeFromTag('fr-FR')]);
    expect(mount().api.locale).toBe('fr');
  });

  it('walks the device preference list until one matches', () => {
    nativeMock.getDeviceLocales.mockReturnValue([
      localeFromTag('de-DE'),
      localeFromTag('ar-EG'),
      localeFromTag('fr-FR'),
    ]);
    expect(mount().api.locale).toBe('ar');
  });

  it('prefers an exact language-tag match over the bare language code', () => {
    nativeMock.getDeviceLocales.mockReturnValue([localeFromTag('pt-BR')]);
    const result = mount({
      translations: { 'en': {}, 'pt': {}, 'pt-BR': {} },
    });
    expect(result.api.locale).toBe('pt-BR');
  });

  it('ignores the device when autoDetectDeviceLocale is false', () => {
    nativeMock.getDeviceLocales.mockReturnValue([localeFromTag('fr-FR')]);
    const result = mount({ autoDetectDeviceLocale: false });
    expect(result.api.locale).toBe('en');
    expect(nativeMock.getDeviceLocales).not.toHaveBeenCalled();
  });

  it('exposes sorted availableLocales', () => {
    expect(mount().api.availableLocales).toEqual(['ar', 'en', 'fr']);
  });
});

describe('LocalizationProvider - initial locale (negative)', () => {
  it('falls back to defaultLocale when the native call throws', () => {
    nativeMock.getDeviceLocales.mockImplementation(() => {
      throw new Error('native down');
    });
    expect(mount().api.locale).toBe('en');
  });

  it('falls back to defaultLocale when the device list is empty', () => {
    nativeMock.getDeviceLocales.mockReturnValue([]);
    expect(mount().api.locale).toBe('en');
  });

  it('warns in dev when defaultLocale has no translations', () => {
    mount({ defaultLocale: 'zz', autoDetectDeviceLocale: false });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"zz"'));
  });

  it('does not warn when defaultLocale exists', () => {
    mount();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('t() translation', () => {
  it('translates, interpolates and pluralises for the active locale', () => {
    const result = mount();
    expect(result.api.t('hello', { name: 'Ana' })).toBe('Hello, Ana!');
    expect(result.api.t('items', { count: 1 })).toBe('1 item');
    expect(result.api.t('items', { count: 3 })).toBe('3 items');
  });

  it('uses fallbackLocale for keys missing in the active locale', () => {
    nativeMock.getDeviceLocales.mockReturnValue([localeFromTag('fr-FR')]);
    const result = mount({ fallbackLocale: 'en' });
    expect(result.api.locale).toBe('fr');
    expect(result.api.t('onlyEn')).toBe('Only English');
  });

  it('returns the key for unknown keys and warns once per key/locale', () => {
    const result = mount();
    expect(result.api.t('nope')).toBe('nope');
    expect(result.api.t('nope')).toBe('nope');
    expect(result.api.t('another')).toBe('another');
    const missingWarnings = warn.mock.calls.filter(([m]) =>
      String(m).includes('Missing translation')
    );
    expect(missingWarnings).toHaveLength(2);
  });

  it('throws I18nKitError for an empty key', () => {
    expect(() => mount().api.t('')).toThrow(I18nKitError);
  });

  it('keeps t() referentially stable across re-renders with equal props', () => {
    const result = mount();
    const first = result.api.t;
    result.rerender();
    expect(result.api.t).toBe(first);
  });

  it('changes t() when translations change', () => {
    const result = mount();
    const first = result.api.t;
    result.rerender({ translations: { en: { hello: 'Yo' } } });
    expect(result.api.t).not.toBe(first);
    expect(result.api.t('hello')).toBe('Yo');
  });
});

describe('setLocale()', () => {
  it('switches the locale and re-renders translations', async () => {
    const result = mount();
    await act(async () => {
      await result.api.setLocale('fr');
    });
    expect(result.api.locale).toBe('fr');
    expect(result.api.t('hello', { name: 'Ana' })).toBe('Bonjour, Ana!');
  });

  it('rejects with INVALID_LOCALE for an empty string and keeps the locale', async () => {
    const result = mount();
    let caught: unknown;
    await act(async () => {
      await result.api.setLocale('').catch((e: unknown) => (caught = e));
    });
    expect(caught).toBeInstanceOf(I18nKitError);
    expect((caught as I18nKitError).code).toBe('INVALID_LOCALE');
    expect(result.api.locale).toBe('en');
  });

  it.each([
    '   ',
    '\t',
    undefined as unknown as string,
    7 as unknown as string,
  ])('rejects INVALID_LOCALE for blank/non-string input %p', async (input) => {
    const result = mount();
    let caught: unknown;
    await act(async () => {
      await result.api.setLocale(input).catch((e: unknown) => (caught = e));
    });
    expect((caught as I18nKitError).code).toBe('INVALID_LOCALE');
    expect(result.api.locale).toBe('en');
  });

  it('accepts an unshipped locale but warns and falls back', async () => {
    const result = mount({ fallbackLocale: 'en' });
    await act(async () => {
      await result.api.setLocale('de');
    });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"de"'));
    expect(result.api.locale).toBe('de');
    expect(result.api.t('onlyEn')).toBe('Only English');
  });

  it('is stable across re-renders', () => {
    const result = mount();
    const first = result.api.setLocale;
    result.rerender();
    expect(result.api.setLocale).toBe(first);
  });
});

describe('RTL management', () => {
  it('reports isRTL from the native layer for the active locale', async () => {
    const result = mount();
    expect(result.api.isRTL).toBe(false);
    await act(async () => {
      await result.api.setLocale('ar');
    });
    expect(result.api.isRTL).toBe(true);
    expect(nativeMock.isRTLForLanguage).toHaveBeenCalledWith('ar');
  });

  it('uses only the language subtag of a regional locale', async () => {
    const result = mount({ translations: { 'en': {}, 'ar-EG': {} } });
    await act(async () => {
      await result.api.setLocale('ar-EG');
    });
    expect(nativeMock.isRTLForLanguage).toHaveBeenCalledWith('ar');
    expect(result.api.isRTL).toBe(true);
  });

  it('forces RTL when switching to an RTL language', async () => {
    const result = mount();
    await act(async () => {
      await result.api.setLocale('ar');
    });
    expect(forceRTL).toHaveBeenCalledWith(true);
  });

  it('forces RTL on mount when the detected device language is RTL', () => {
    nativeMock.getDeviceLocales.mockReturnValue([localeFromTag('ar-EG')]);
    mount();
    expect(forceRTL).toHaveBeenCalledWith(true);
  });

  it('forces LTR when leaving an RTL layout', async () => {
    jest.replaceProperty(I18nManager, 'isRTL', true);
    const result = mount();
    await act(async () => {
      await result.api.setLocale('fr');
    });
    expect(forceRTL).toHaveBeenCalledWith(false);
  });

  it('does not touch I18nManager when the direction is unchanged', async () => {
    const result = mount();
    await act(async () => {
      await result.api.setLocale('fr');
    });
    expect(forceRTL).not.toHaveBeenCalled();
  });

  it('never calls forceRTL when manageRTL is false', async () => {
    const result = mount({ manageRTL: false });
    await act(async () => {
      await result.api.setLocale('ar');
    });
    expect(forceRTL).not.toHaveBeenCalled();
    expect(result.api.isRTL).toBe(true);
  });

  it('survives a native isRTL failure and falls back to I18nManager.isRTL', async () => {
    nativeMock.isRTLForLanguage.mockImplementation(() => {
      throw new Error('native down');
    });
    const result = mount();
    await act(async () => {
      await result.api.setLocale('ar');
    });
    expect(result.api.locale).toBe('ar');
    expect(result.api.isRTL).toBe(false);
    expect(forceRTL).not.toHaveBeenCalled();
  });
});

describe('useTranslation outside a provider', () => {
  it('throws PROVIDER_NOT_FOUND', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const Broken = () => {
      useTranslation();
      return null;
    };
    let error: unknown;
    try {
      act(() => {
        TestRenderer.create(<Broken />);
      });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(I18nKitError);
    expect((error as I18nKitError).code).toBe('PROVIDER_NOT_FOUND');
  });
});

describe('native event isolation', () => {
  it('does not change the translation locale when the system locale changes', () => {
    const result = mount();
    act(() => {
      DeviceEventEmitter.emit('onLocaleChanged');
    });
    expect(result.api.locale).toBe('en');
  });
});
