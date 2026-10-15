import { DeviceEventEmitter } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { LocalizationProvider } from '../context/LocalizationProvider';
import { useDeviceLocale } from '../hooks/useDeviceLocale';
import type { DeviceLocaleSnapshot } from '../hooks/useDeviceLocale';
import { I18nKitError } from '../errors';
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

const mounted: (() => void)[] = [];

function mount() {
  const ref: { current: DeviceLocaleSnapshot | null } = { current: null };
  const Probe = () => {
    ref.current = useDeviceLocale();
    return null;
  };
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <LocalizationProvider translations={{ en: {} }} defaultLocale="en">
        <Probe />
      </LocalizationProvider>
    );
  });
  let isMounted = true;
  const unmount = () => {
    if (!isMounted) return;
    isMounted = false;
    act(() => renderer.unmount());
  };
  mounted.push(unmount);
  return {
    get snapshot() {
      return ref.current!;
    },
    unmount,
  };
}

beforeEach(() => {
  resetNativeMock();
});

afterEach(() => {
  mounted.splice(0).forEach((unmount) => unmount());
  jest.restoreAllMocks();
});

describe('useDeviceLocale - positive', () => {
  it('returns a full snapshot of every device setting', () => {
    nativeMock.getDeviceLocales.mockReturnValue([
      localeFromTag('en-IN'),
      localeFromTag('hi-IN'),
    ]);
    nativeMock.getDeviceLocale.mockReturnValue(localeFromTag('en-IN'));
    nativeMock.getCountry.mockReturnValue('IN');
    nativeMock.getTimeZone.mockReturnValue('Asia/Kolkata');
    nativeMock.uses24HourClock.mockReturnValue(false);

    expect(mount().snapshot).toEqual({
      locale: localeFromTag('en-IN'),
      locales: [localeFromTag('en-IN'), localeFromTag('hi-IN')],
      country: 'IN',
      calendar: 'gregorian',
      timeZone: 'Asia/Kolkata',
      numberFormatSettings: { decimalSeparator: '.', groupingSeparator: ',' },
      uses24HourClock: false,
      usesMetricSystem: true,
    });
  });

  it('subscribes to onLocaleChanged through the native emitter', () => {
    mount();
    expect(nativeMock.addListener).toHaveBeenCalledWith('onLocaleChanged');
  });

  it('refreshes the snapshot when the system locale changes', () => {
    const result = mount();
    expect(result.snapshot.country).toBe('US');

    nativeMock.getCountry.mockReturnValue('FR');
    nativeMock.getDeviceLocale.mockReturnValue(localeFromTag('fr-FR'));
    act(() => {
      DeviceEventEmitter.emit('onLocaleChanged');
    });

    expect(result.snapshot.country).toBe('FR');
    expect(result.snapshot.locale.languageCode).toBe('fr');
  });

  it('keeps refreshing on repeated events', () => {
    const result = mount();
    ['DE', 'ES', 'IT'].forEach((country) => {
      nativeMock.getCountry.mockReturnValue(country);
      act(() => {
        DeviceEventEmitter.emit('onLocaleChanged');
      });
      expect(result.snapshot.country).toBe(country);
    });
  });

  it('unsubscribes on unmount', () => {
    const baseline = DeviceEventEmitter.listenerCount('onLocaleChanged');
    const result = mount();
    expect(DeviceEventEmitter.listenerCount('onLocaleChanged')).toBe(
      baseline + 1
    );
    result.unmount();
    expect(nativeMock.removeListeners).toHaveBeenCalled();
    expect(DeviceEventEmitter.listenerCount('onLocaleChanged')).toBe(baseline);
  });
});

describe('useDeviceLocale - negative', () => {
  it('keeps the last good snapshot when a refresh fails', () => {
    const result = mount();
    nativeMock.getCountry.mockImplementation(() => {
      throw new Error('transient');
    });
    expect(() =>
      act(() => {
        DeviceEventEmitter.emit('onLocaleChanged');
      })
    ).not.toThrow();
    expect(result.snapshot.country).toBe('US');
  });

  it('recovers on the next event after a failed refresh', () => {
    const result = mount();
    nativeMock.getCountry.mockImplementationOnce(() => {
      throw new Error('transient');
    });
    act(() => {
      DeviceEventEmitter.emit('onLocaleChanged');
    });
    nativeMock.getCountry.mockReturnValue('JP');
    act(() => {
      DeviceEventEmitter.emit('onLocaleChanged');
    });
    expect(result.snapshot.country).toBe('JP');
  });

  it('throws an I18nKitError on mount when native reads fail', () => {
    nativeMock.getDeviceLocale.mockImplementation(() => {
      throw new Error('native down');
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    let error: unknown;
    try {
      mount();
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(I18nKitError);
    expect((error as I18nKitError).code).toBe('NATIVE_CALL_FAILED');
  });
});
