import { Platform } from 'react-native';
import { I18nKitError } from '../errors';
import {
  getAppLanguage,
  getCalendar,
  getCountry,
  getDeviceLocale,
  getDeviceLocales,
  getNumberFormatSettings,
  getTimeZone,
  isRTLForLanguage,
  setAppLanguage,
  uses24HourClock,
  usesMetricSystem,
} from '../nativeApi';
import {
  localeFromTag,
  nativeMock,
  resetNativeMock,
} from '../../jest/nativeMock';

jest.mock('../NativeI18nKit', () => ({
  __esModule: true,
  default: require('../../jest/nativeMock').nativeMock,
}));

const catchError = (fn: () => unknown): I18nKitError => {
  try {
    fn();
  } catch (error) {
    return error as I18nKitError;
  }
  throw new Error('expected function to throw');
};

const catchAsyncError = async (fn: () => Promise<unknown>) => {
  try {
    await fn();
  } catch (error) {
    return error as I18nKitError;
  }
  throw new Error('expected promise to reject');
};

beforeEach(() => {
  resetNativeMock();
});

describe('nativeApi - positive scenarios', () => {
  it('getDeviceLocales returns the native list in order', () => {
    const list = [localeFromTag('fr-FR'), localeFromTag('en-US')];
    nativeMock.getDeviceLocales.mockReturnValue(list);
    expect(getDeviceLocales()).toEqual(list);
  });

  it('getDeviceLocale returns the primary locale', () => {
    expect(getDeviceLocale()).toEqual(localeFromTag('en-US'));
  });

  it('getCountry / getCalendar / getTimeZone pass strings through', () => {
    expect(getCountry()).toBe('US');
    expect(getCalendar()).toBe('gregorian');
    expect(getTimeZone()).toBe('America/New_York');
  });

  it('getNumberFormatSettings returns both separators', () => {
    nativeMock.getNumberFormatSettings.mockReturnValue({
      decimalSeparator: ',',
      groupingSeparator: '.',
    });
    expect(getNumberFormatSettings()).toEqual({
      decimalSeparator: ',',
      groupingSeparator: '.',
    });
  });

  it.each([true, false])('uses24HourClock returns %s', (value) => {
    nativeMock.uses24HourClock.mockReturnValue(value);
    expect(uses24HourClock()).toBe(value);
  });

  it.each([true, false])('usesMetricSystem returns %s', (value) => {
    nativeMock.usesMetricSystem.mockReturnValue(value);
    expect(usesMetricSystem()).toBe(value);
  });

  it.each([
    ['ar', true],
    ['he', true],
    ['en', false],
    ['hi', false],
  ])('isRTLForLanguage(%s) -> %s and forwards the argument', (code, rtl) => {
    expect(isRTLForLanguage(code)).toBe(rtl);
    expect(nativeMock.isRTLForLanguage).toHaveBeenCalledWith(code);
  });

  it('setAppLanguage resolves true (Android semantics)', async () => {
    await expect(setAppLanguage('fr-FR')).resolves.toBe(true);
    expect(nativeMock.setAppLanguage).toHaveBeenCalledWith('fr-FR');
  });

  it('setAppLanguage resolves false (iOS "restart required" semantics)', async () => {
    nativeMock.setAppLanguage.mockResolvedValue(false);
    await expect(setAppLanguage('fr')).resolves.toBe(false);
  });

  it('getAppLanguage returns "" when unset and the tag when set', () => {
    expect(getAppLanguage()).toBe('');
    nativeMock.getAppLanguage.mockReturnValue('fr');
    expect(getAppLanguage()).toBe('fr');
  });

  it('works on both supported platforms', () => {
    ['ios', 'android'].forEach((os) => {
      jest.replaceProperty(Platform, 'OS', os as 'ios' | 'android');
      expect(getCountry()).toBe('US');
    });
    jest.restoreAllMocks();
  });
});

describe('nativeApi - negative scenarios', () => {
  describe('argument validation (native must not be called)', () => {
    it.each([
      '',
      '   ',
      '\t\n',
      undefined as unknown as string,
      null as unknown as string,
      42 as unknown as string,
      {} as unknown as string,
    ])('isRTLForLanguage(%p) throws INVALID_LOCALE', (input) => {
      const error = catchError(() => isRTLForLanguage(input));
      expect(error).toBeInstanceOf(I18nKitError);
      expect(error.code).toBe('INVALID_LOCALE');
      expect(nativeMock.isRTLForLanguage).not.toHaveBeenCalled();
    });

    it.each([
      '',
      '   ',
      '\t\n',
      undefined as unknown as string,
      null as unknown as string,
      42 as unknown as string,
      {} as unknown as string,
    ])('setAppLanguage(%p) rejects INVALID_LOCALE', async (input) => {
      const error = await catchAsyncError(() => setAppLanguage(input));
      expect(error).toBeInstanceOf(I18nKitError);
      expect(error.code).toBe('INVALID_LOCALE');
      expect(nativeMock.setAppLanguage).not.toHaveBeenCalled();
    });
  });

  describe('native failures are normalised to NATIVE_CALL_FAILED', () => {
    const syncCases: [string, () => unknown, jest.Mock][] = [
      [
        'getDeviceLocales',
        getDeviceLocales,
        nativeMock.getDeviceLocales as jest.Mock,
      ],
      [
        'getDeviceLocale',
        getDeviceLocale,
        nativeMock.getDeviceLocale as jest.Mock,
      ],
      ['getCountry', getCountry, nativeMock.getCountry as jest.Mock],
      ['getCalendar', getCalendar, nativeMock.getCalendar as jest.Mock],
      ['getTimeZone', getTimeZone, nativeMock.getTimeZone as jest.Mock],
      [
        'getNumberFormatSettings',
        getNumberFormatSettings,
        nativeMock.getNumberFormatSettings as jest.Mock,
      ],
      [
        'uses24HourClock',
        uses24HourClock,
        nativeMock.uses24HourClock as jest.Mock,
      ],
      [
        'usesMetricSystem',
        usesMetricSystem,
        nativeMock.usesMetricSystem as jest.Mock,
      ],
      [
        'getAppLanguage',
        getAppLanguage,
        nativeMock.getAppLanguage as jest.Mock,
      ],
      [
        'isRTLForLanguage',
        () => isRTLForLanguage('ar'),
        nativeMock.isRTLForLanguage as jest.Mock,
      ],
    ];

    it.each(syncCases)(
      '%s wraps a thrown native error',
      (_name, call, mock) => {
        const cause = new Error('native boom');
        mock.mockImplementation(() => {
          throw cause;
        });
        const error = catchError(call);
        expect(error).toBeInstanceOf(I18nKitError);
        expect(error.code).toBe('NATIVE_CALL_FAILED');
        expect(error.message).toBe('native boom');
        expect(error.cause).toBe(cause);
      }
    );

    it('setAppLanguage wraps a rejected promise', async () => {
      const cause = new Error('rejected natively');
      nativeMock.setAppLanguage.mockRejectedValue(cause);
      const error = await catchAsyncError(() => setAppLanguage('fr'));
      expect(error.code).toBe('NATIVE_CALL_FAILED');
      expect(error.cause).toBe(cause);
    });

    it('does not double-wrap an I18nKitError thrown by native code', () => {
      const original = new I18nKitError('INVALID_LOCALE', 'from native');
      nativeMock.getCountry.mockImplementation(() => {
        throw original;
      });
      expect(catchError(getCountry)).toBe(original);
    });
  });

  describe('unsupported platforms', () => {
    afterEach(() => jest.restoreAllMocks());

    it.each(['web', 'windows', 'macos'])(
      'every API throws UNSUPPORTED_PLATFORM on %s without touching native',
      async (os) => {
        jest.replaceProperty(Platform, 'OS', os as 'web');
        const calls: (() => unknown)[] = [
          getDeviceLocales,
          getDeviceLocale,
          getCountry,
          getCalendar,
          getTimeZone,
          getNumberFormatSettings,
          uses24HourClock,
          usesMetricSystem,
          getAppLanguage,
          () => isRTLForLanguage('ar'),
        ];
        calls.forEach((call) => {
          expect(catchError(call).code).toBe('UNSUPPORTED_PLATFORM');
        });
        const error = await catchAsyncError(() => setAppLanguage('fr'));
        expect(error.code).toBe('UNSUPPORTED_PLATFORM');
        Object.values(nativeMock).forEach((fn) =>
          expect(fn).not.toHaveBeenCalled()
        );
      }
    );
  });

  describe('native module not linked', () => {
    it('throws NATIVE_MODULE_UNAVAILABLE on first use, not at import time', async () => {
      jest.resetModules();
      jest.doMock('../NativeI18nKit', () => ({
        __esModule: true,
        default: null,
      }));
      let missing: typeof import('../nativeApi') | undefined;
      // Importing must not throw even though the module is missing.
      expect(() => {
        missing = require('../nativeApi');
      }).not.toThrow();
      expect(catchError(() => missing!.getCountry()).code).toBe(
        'NATIVE_MODULE_UNAVAILABLE'
      );
      const error = await catchAsyncError(() => missing!.setAppLanguage('fr'));
      expect(error.code).toBe('NATIVE_MODULE_UNAVAILABLE');
      expect(error.message).toMatch(/pod install/);
      jest.dontMock('../NativeI18nKit');
      jest.resetModules();
    });
  });
});
