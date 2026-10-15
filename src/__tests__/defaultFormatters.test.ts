import { createFormatters } from '../defaultFormatters';
import { nativeMock, resetNativeMock } from '../../jest/nativeMock';

jest.mock('../NativeI18nKit', () => ({
  __esModule: true,
  default: require('../../jest/nativeMock').nativeMock,
}));

const plain = (s: string) => s.replace(/\s/g, ' ');
const date = new Date(Date.UTC(2024, 0, 15, 13, 5));
const time = { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' } as const;
const intl = Intl as unknown as { RelativeTimeFormat: unknown };

beforeEach(() => {
  resetNativeMock();
});

describe('createFormatters (device-wired export)', () => {
  it('formats times with the device 24-hour setting', () => {
    nativeMock.uses24HourClock.mockReturnValue(true);
    expect(createFormatters('en').formatDate(date, time)).toBe('13:05');
    nativeMock.uses24HourClock.mockReturnValue(false);
    expect(plain(createFormatters('en').formatDate(date, time))).toBe(
      '1:05 PM'
    );
  });

  it('falls back to the locale default when the device clock cannot be read', () => {
    nativeMock.uses24HourClock.mockImplementation(() => {
      throw new Error('native down');
    });
    expect(plain(createFormatters('en').formatDate(date, time))).toBe(
      '1:05 PM'
    );
  });

  it('lets the caller override the device-backed defaults', () => {
    nativeMock.uses24HourClock.mockReturnValue(true);
    const f = createFormatters('en', { uses24HourClock: () => false });
    expect(plain(f.formatDate(date, time))).toBe('1:05 PM');
  });

  describe('without Intl.RelativeTimeFormat (Hermes)', () => {
    let original: unknown;
    beforeEach(() => {
      original = intl.RelativeTimeFormat;
      intl.RelativeTimeFormat = undefined;
    });
    afterEach(() => {
      intl.RelativeTimeFormat = original;
    });

    it('uses the native formatter by default', () => {
      nativeMock.formatRelativeTime.mockReturnValue('il y a 3 jours');
      expect(createFormatters('fr').formatRelativeTime(-3, 'day')).toBe(
        'il y a 3 jours'
      );
      expect(nativeMock.formatRelativeTime).toHaveBeenCalledWith(
        -3,
        'day',
        'fr',
        'always'
      );
    });

    it('lets the caller supply a different fallback', () => {
      const f = createFormatters('en', {
        relativeTimeFallback: () => 'custom',
      });
      expect(f.formatRelativeTime(1, 'day')).toBe('custom');
      expect(nativeMock.formatRelativeTime).not.toHaveBeenCalled();
    });
  });

  it('prefers Intl.RelativeTimeFormat when present', () => {
    expect(createFormatters('en').formatRelativeTime(-3, 'day')).toBe(
      '3 days ago'
    );
    expect(nativeMock.formatRelativeTime).not.toHaveBeenCalled();
  });
});
