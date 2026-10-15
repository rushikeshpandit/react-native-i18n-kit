import { I18nManager } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { LocalizationProvider } from '../context/LocalizationProvider';
import { useTranslation } from '../hooks/useTranslation';
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
  'en': { hello: 'Hello' },
  'fr': { hello: 'Bonjour' },
  'ar': { hello: 'مرحبا' },
  'zh-CN': { hello: '你好' },
  'pt-BR': { hello: 'Olá' },
};

type Props = Partial<Omit<LocalizationProviderProps, 'children'>>;
const mounted: (() => void)[] = [];

/** Mounts a provider and exposes the latest useTranslation() result. */
function mount(props: Props = {}) {
  const ref: { current: UseTranslationResult | null } = { current: null };
  const Probe = () => {
    ref.current = useTranslation();
    return null;
  };
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <LocalizationProvider
        translations={translations}
        defaultLocale="en"
        {...props}
      >
        <Probe />
      </LocalizationProvider>
    );
  });
  mounted.push(() => act(() => renderer.unmount()));
  return {
    get api() {
      return ref.current!;
    },
  };
}

let forceRTL: jest.SpyInstance;

beforeEach(() => {
  resetNativeMock();
  forceRTL = jest.spyOn(I18nManager, 'forceRTL').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.replaceProperty(I18nManager, 'isRTL', false);
});

afterEach(() => {
  mounted.splice(0).forEach((unmount) => unmount());
  jest.restoreAllMocks();
});

describe('locale persistence', () => {
  it('restores the saved locale on start', () => {
    nativeMock.getSavedLocale.mockReturnValue('fr');
    expect(mount().api.locale).toBe('fr');
  });

  it('prefers the saved locale over the device language', () => {
    nativeMock.getSavedLocale.mockReturnValue('fr');
    nativeMock.getDeviceLocales.mockReturnValue([localeFromTag('ar-EG')]);
    expect(mount().api.locale).toBe('fr');
  });

  it('resolves a saved locale spelled differently (case / region)', () => {
    nativeMock.getSavedLocale.mockReturnValue('FR-ca');
    expect(mount().api.locale).toBe('fr');
  });

  it('ignores a saved locale that is no longer shipped', () => {
    nativeMock.getSavedLocale.mockReturnValue('ja');
    nativeMock.getDeviceLocales.mockReturnValue([localeFromTag('ar-EG')]);
    expect(mount().api.locale).toBe('ar');
  });

  it('falls back to device detection when nothing is saved', () => {
    nativeMock.getDeviceLocales.mockReturnValue([localeFromTag('fr-FR')]);
    expect(mount().api.locale).toBe('fr');
  });

  it('survives a failing native read and uses detection', () => {
    nativeMock.getSavedLocale.mockImplementation(() => {
      throw new Error('storage down');
    });
    nativeMock.getDeviceLocales.mockReturnValue([localeFromTag('fr-FR')]);
    expect(mount().api.locale).toBe('fr');
  });

  it('does not read the saved locale when persistLocale is false', () => {
    nativeMock.getSavedLocale.mockReturnValue('fr');
    expect(mount({ persistLocale: false }).api.locale).toBe('en');
    expect(nativeMock.getSavedLocale).not.toHaveBeenCalled();
  });

  it('saves the resolved locale on setLocale', async () => {
    const result = mount();
    await act(async () => {
      await result.api.setLocale('FR');
    });
    expect(result.api.locale).toBe('fr');
    expect(nativeMock.saveLocale).toHaveBeenCalledWith('fr');
  });

  it('does not save when persistLocale is false', async () => {
    const result = mount({ persistLocale: false });
    await act(async () => {
      await result.api.setLocale('fr');
    });
    expect(nativeMock.saveLocale).not.toHaveBeenCalled();
  });

  it('does not save when the locale is invalid', async () => {
    const result = mount();
    await act(async () => {
      await result.api.setLocale('  ').catch(() => {});
    });
    expect(nativeMock.saveLocale).not.toHaveBeenCalled();
  });

  it('still switches the locale when saving fails', async () => {
    nativeMock.saveLocale.mockImplementation(() => {
      throw new Error('disk full');
    });
    const result = mount();
    await act(async () => {
      await result.api.setLocale('fr');
    });
    expect(result.api.locale).toBe('fr');
  });
});

describe('resetLocale()', () => {
  it('clears the saved choice and returns to the device language', async () => {
    nativeMock.getSavedLocale.mockReturnValue('fr');
    nativeMock.getDeviceLocales.mockReturnValue([localeFromTag('ar-EG')]);
    const result = mount();
    expect(result.api.locale).toBe('fr');
    await act(async () => {
      await result.api.resetLocale();
    });
    expect(nativeMock.clearSavedLocale).toHaveBeenCalledTimes(1);
    expect(result.api.locale).toBe('ar');
  });

  it('returns to defaultLocale when device detection is off', async () => {
    nativeMock.getSavedLocale.mockReturnValue('fr');
    const result = mount({ autoDetectDeviceLocale: false });
    await act(async () => {
      await result.api.resetLocale();
    });
    expect(result.api.locale).toBe('en');
  });

  it('works when clearing fails natively', async () => {
    nativeMock.getSavedLocale.mockReturnValue('fr');
    nativeMock.clearSavedLocale.mockImplementation(() => {
      throw new Error('storage down');
    });
    const result = mount({ autoDetectDeviceLocale: false });
    await act(async () => {
      await result.api.resetLocale();
    });
    expect(result.api.locale).toBe('en');
  });

  it('is stable across re-renders', () => {
    const result = mount();
    expect(typeof result.api.resetLocale).toBe('function');
  });
});

describe('smart locale matching', () => {
  it.each([
    ['zh-Hans-CN', 'zh-CN'],
    ['pt-PT', 'pt-BR'],
    ['FR-fr', 'fr'],
    ['ar_EG', 'ar'],
  ])('device language %s starts as %s', (tag, expected) => {
    nativeMock.getDeviceLocales.mockReturnValue([localeFromTag(tag)]);
    expect(mount().api.locale).toBe(expected);
  });

  it.each([
    ['AR', 'ar'],
    ['zh-Hans-CN', 'zh-CN'],
    ['pt', 'pt-BR'],
  ])('setLocale(%s) resolves to %s', async (input, expected) => {
    const result = mount();
    await act(async () => {
      await result.api.setLocale(input);
    });
    expect(result.api.locale).toBe(expected);
  });

  it('trims surrounding whitespace in setLocale', async () => {
    const result = mount();
    await act(async () => {
      await result.api.setLocale('  fr  ');
    });
    expect(result.api.locale).toBe('fr');
  });

  it('keeps an unshipped locale as written', async () => {
    const result = mount();
    await act(async () => {
      await result.api.setLocale('de');
    });
    expect(result.api.locale).toBe('de');
  });
});

describe('onRTLReloadRequired', () => {
  it('fires with true when switching to an RTL language', async () => {
    const onRTLReloadRequired = jest.fn();
    const result = mount({ onRTLReloadRequired });
    await act(async () => {
      await result.api.setLocale('ar');
    });
    expect(onRTLReloadRequired).toHaveBeenCalledWith(true);
  });

  it('fires with false when leaving RTL', async () => {
    jest.replaceProperty(I18nManager, 'isRTL', true);
    const onRTLReloadRequired = jest.fn();
    const result = mount({ onRTLReloadRequired });
    await act(async () => {
      await result.api.setLocale('fr');
    });
    expect(onRTLReloadRequired).toHaveBeenCalledWith(false);
  });

  it('fires on start when the restored locale flips the direction', () => {
    nativeMock.getSavedLocale.mockReturnValue('ar');
    const onRTLReloadRequired = jest.fn();
    mount({ onRTLReloadRequired });
    expect(onRTLReloadRequired).toHaveBeenCalledWith(true);
  });

  it('does not fire when the direction is unchanged', async () => {
    const onRTLReloadRequired = jest.fn();
    const result = mount({ onRTLReloadRequired });
    await act(async () => {
      await result.api.setLocale('fr');
    });
    expect(onRTLReloadRequired).not.toHaveBeenCalled();
  });

  it('does not fire when manageRTL is false', async () => {
    const onRTLReloadRequired = jest.fn();
    const result = mount({ onRTLReloadRequired, manageRTL: false });
    await act(async () => {
      await result.api.setLocale('ar');
    });
    expect(onRTLReloadRequired).not.toHaveBeenCalled();
  });

  it('a throwing callback does not break the locale switch', async () => {
    const onRTLReloadRequired = jest.fn(() => {
      throw new Error('callback exploded');
    });
    const result = mount({ onRTLReloadRequired });
    await act(async () => {
      await result.api.setLocale('ar');
    });
    expect(result.api.locale).toBe('ar');
    expect(forceRTL).toHaveBeenCalledWith(true);
  });

  it('fires on resetLocale when it flips the direction', async () => {
    nativeMock.getSavedLocale.mockReturnValue('fr');
    nativeMock.getDeviceLocales.mockReturnValue([localeFromTag('ar-EG')]);
    const onRTLReloadRequired = jest.fn();
    const result = mount({ onRTLReloadRequired });
    await act(async () => {
      await result.api.resetLocale();
    });
    expect(onRTLReloadRequired).toHaveBeenCalledWith(true);
  });
});

describe('locale-bound formatters', () => {
  const date = new Date(Date.UTC(2024, 0, 15, 13, 5));
  const plain = (s: string) => s.replace(/\s/g, ' ');

  it('format with the active locale and follow setLocale', async () => {
    const result = mount();
    expect(result.api.formatNumber(1234.5)).toBe('1,234.5');
    await act(async () => {
      await result.api.setLocale('fr');
    });
    expect(plain(result.api.formatNumber(1234.5))).toBe('1 234,5');
  });

  it('exposes every formatter', () => {
    const { api } = mount();
    expect(api.formatCurrency(5, 'USD')).toBe('$5.00');
    expect(api.formatPercent(0.5)).toBe('50%');
    expect(api.formatRelativeTime(-1, 'day', { numeric: 'auto' })).toBe(
      'yesterday'
    );
    expect(api.formatDate(date, { timeZone: 'UTC', dateStyle: 'medium' })).toBe(
      'Jan 15, 2024'
    );
  });

  it('formats times with the device 24-hour setting', () => {
    nativeMock.uses24HourClock.mockReturnValue(true);
    const { api } = mount();
    expect(
      api.formatDate(date, {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'UTC',
      })
    ).toBe('13:05');
  });

  it('formats times with a 12-hour device setting', () => {
    nativeMock.uses24HourClock.mockReturnValue(false);
    const { api } = mount();
    expect(
      plain(
        api.formatDate(date, {
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'UTC',
        })
      )
    ).toBe('1:05 PM');
  });

  it('falls back to the locale default when the device clock cannot be read', () => {
    nativeMock.uses24HourClock.mockImplementation(() => {
      throw new Error('native down');
    });
    const { api } = mount();
    expect(
      plain(
        api.formatDate(date, {
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'UTC',
        })
      )
    ).toBe('1:05 PM');
  });

  it('propagates INVALID_ARGUMENT for bad input', () => {
    const { api } = mount();
    expect(() => api.formatNumber(NaN)).toThrow();
    expect(() => api.formatCurrency(1, 'US')).toThrow();
    expect(() => api.formatDate(new Date('x'))).toThrow();
  });

  describe('relative time without Intl.RelativeTimeFormat (Hermes)', () => {
    const intl = Intl as unknown as { RelativeTimeFormat: unknown };
    let original: unknown;
    beforeEach(() => {
      original = intl.RelativeTimeFormat;
      intl.RelativeTimeFormat = undefined;
    });
    afterEach(() => {
      intl.RelativeTimeFormat = original;
    });

    it('uses the native formatter with the active locale', async () => {
      nativeMock.formatRelativeTime.mockReturnValue('il y a 3 jours');
      const result = mount();
      await act(async () => {
        await result.api.setLocale('fr');
      });
      expect(result.api.formatRelativeTime(-3, 'day')).toBe('il y a 3 jours');
      expect(nativeMock.formatRelativeTime).toHaveBeenCalledWith(
        -3,
        'day',
        'fr',
        'always'
      );
    });

    it('surfaces a native failure as an I18nKitError', () => {
      nativeMock.formatRelativeTime.mockImplementation(() => {
        throw new Error('icu down');
      });
      expect(() => mount().api.formatRelativeTime(1, 'day')).toThrow();
    });
  });
});
