import { createFormatters } from '../formatters';
import { I18nKitError } from '../errors';

/** Collapses every kind of space (incl. NBSP / narrow NBSP) so ICU versions compare equal. */
const plain = (s: string) => s.replace(/\s/g, ' ');

const codeOf = (fn: () => unknown): string => {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(I18nKitError);
    return (error as I18nKitError).code;
  }
  throw new Error('expected function to throw');
};

describe('formatNumber', () => {
  it('uses the locale separators', () => {
    expect(createFormatters('en').formatNumber(1234.5)).toBe('1,234.5');
    expect(plain(createFormatters('fr').formatNumber(1234.5))).toBe('1 234,5');
    expect(createFormatters('de').formatNumber(1234.5)).toBe('1.234,5');
  });

  it('honours Intl.NumberFormat options', () => {
    expect(
      createFormatters('en').formatNumber(3.14159, { maximumFractionDigits: 2 })
    ).toBe('3.14');
  });

  it('formats zero and negative numbers', () => {
    expect(createFormatters('en').formatNumber(0)).toBe('0');
    expect(createFormatters('en').formatNumber(-1234)).toBe('-1,234');
  });

  it.each([
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['a numeric string', '5'],
    ['null', null],
    ['undefined', undefined],
    ['a bigint', BigInt(5)],
  ])('rejects %s with INVALID_ARGUMENT', (_label, value) => {
    expect(
      codeOf(() => createFormatters('en').formatNumber(value as number))
    ).toBe('INVALID_ARGUMENT');
  });

  it('rejects invalid options with INVALID_ARGUMENT', () => {
    expect(
      codeOf(() =>
        createFormatters('en').formatNumber(1, { maximumFractionDigits: 999 })
      )
    ).toBe('INVALID_ARGUMENT');
  });
});

describe('formatCurrency', () => {
  it('formats USD and uses Indian digit grouping for en-IN', () => {
    expect(createFormatters('en-US').formatCurrency(1234.5, 'USD')).toBe(
      '$1,234.50'
    );
    expect(createFormatters('en-IN').formatCurrency(123456, 'INR')).toBe(
      '₹1,23,456.00'
    );
  });

  it('accepts a lower-case code', () => {
    expect(createFormatters('en-US').formatCurrency(5, 'usd')).toBe('$5.00');
  });

  it('places the symbol per locale', () => {
    expect(plain(createFormatters('fr-FR').formatCurrency(5, 'EUR'))).toBe(
      '5,00 €'
    );
  });

  it.each(['US', 'USDD', '', '12$', undefined, 5])(
    'rejects currency %p with INVALID_ARGUMENT',
    (currency) => {
      expect(
        codeOf(() =>
          createFormatters('en').formatCurrency(
            1,
            currency as unknown as string
          )
        )
      ).toBe('INVALID_ARGUMENT');
    }
  );

  it('rejects a non-finite amount', () => {
    expect(
      codeOf(() => createFormatters('en').formatCurrency(NaN, 'USD'))
    ).toBe('INVALID_ARGUMENT');
  });

  it('does not let options override the currency style', () => {
    expect(
      createFormatters('en-US').formatCurrency(1, 'USD', {
        style: 'decimal',
      } as Intl.NumberFormatOptions)
    ).toBe('$1.00');
  });
});

describe('formatPercent', () => {
  it('formats fractions as percentages', () => {
    expect(createFormatters('en').formatPercent(0.256)).toBe('26%');
    expect(
      createFormatters('en').formatPercent(0.256, { maximumFractionDigits: 1 })
    ).toBe('25.6%');
    expect(createFormatters('en').formatPercent(1)).toBe('100%');
  });

  it('rejects non-finite input', () => {
    expect(codeOf(() => createFormatters('en').formatPercent(NaN))).toBe(
      'INVALID_ARGUMENT'
    );
  });
});

describe('formatDate', () => {
  const date = new Date(Date.UTC(2024, 0, 15, 13, 5));

  it('defaults to a medium date', () => {
    expect(
      createFormatters('en').formatDate(date, {
        timeZone: 'UTC',
        dateStyle: 'medium',
      })
    ).toBe('Jan 15, 2024');
    expect(createFormatters('en').formatDate(date)).toMatch(/2024/);
  });

  it('formats per locale', () => {
    expect(
      plain(
        createFormatters('fr').formatDate(date, {
          timeZone: 'UTC',
          dateStyle: 'medium',
        })
      )
    ).toBe('15 janv. 2024');
  });

  it('accepts a millisecond timestamp', () => {
    expect(
      createFormatters('en').formatDate(date.getTime(), {
        timeZone: 'UTC',
        dateStyle: 'medium',
      })
    ).toBe('Jan 15, 2024');
  });

  describe('device clock preference', () => {
    const time = {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC',
    } as const;

    it('uses a 24-hour clock when the device does and the caller did not choose', () => {
      const f = createFormatters('en', { uses24HourClock: () => true });
      expect(f.formatDate(date, time)).toBe('13:05');
    });

    it('uses a 12-hour clock when the device does', () => {
      const f = createFormatters('en', { uses24HourClock: () => false });
      expect(plain(f.formatDate(date, time))).toBe('1:05 PM');
    });

    it('lets an explicit hour12 override the device setting', () => {
      const f = createFormatters('en', { uses24HourClock: () => true });
      expect(plain(f.formatDate(date, { ...time, hour12: true }))).toBe(
        '1:05 PM'
      );
    });

    it('lets an explicit hourCycle override the device setting', () => {
      const f = createFormatters('en', { uses24HourClock: () => false });
      expect(f.formatDate(date, { ...time, hourCycle: 'h23' })).toBe('13:05');
    });

    it('leaves the locale default when the device setting is unknown', () => {
      const f = createFormatters('en', { uses24HourClock: () => undefined });
      expect(plain(f.formatDate(date, time))).toBe('1:05 PM');
    });

    it('ignores the device setting for date-only formats', () => {
      const f = createFormatters('en', { uses24HourClock: () => true });
      expect(f.formatDate(date, { timeZone: 'UTC', dateStyle: 'medium' })).toBe(
        'Jan 15, 2024'
      );
    });
  });

  it.each([
    ['an invalid Date', new Date('nope')],
    ['NaN', NaN],
    ['a date string', '2024-01-01'],
    ['null', null],
    ['undefined', undefined],
    ['an object', {}],
  ])('rejects %s with INVALID_ARGUMENT', (_label, value) => {
    expect(
      codeOf(() => createFormatters('en').formatDate(value as unknown as Date))
    ).toBe('INVALID_ARGUMENT');
  });

  it('rejects invalid options with INVALID_ARGUMENT', () => {
    expect(
      codeOf(() =>
        createFormatters('en').formatDate(date, {
          timeZone: 'Not/AZone',
          dateStyle: 'medium',
        })
      )
    ).toBe('INVALID_ARGUMENT');
  });
});

describe('formatRelativeTime', () => {
  it('formats past and future per locale', () => {
    expect(createFormatters('en').formatRelativeTime(-3, 'day')).toBe(
      '3 days ago'
    );
    expect(createFormatters('en').formatRelativeTime(2, 'hour')).toBe(
      'in 2 hours'
    );
    expect(createFormatters('fr').formatRelativeTime(-3, 'day')).toBe(
      'il y a 3 jours'
    );
  });

  it('supports numeric: auto', () => {
    expect(
      createFormatters('en').formatRelativeTime(1, 'day', { numeric: 'auto' })
    ).toBe('tomorrow');
  });

  it.each([['an invalid unit', 'fortnight']])(
    'rejects %s with INVALID_ARGUMENT',
    (_label, unit) => {
      expect(
        codeOf(() =>
          createFormatters('en').formatRelativeTime(
            1,
            unit as Intl.RelativeTimeFormatUnit
          )
        )
      ).toBe('INVALID_ARGUMENT');
    }
  );

  it('rejects non-finite values', () => {
    expect(
      codeOf(() => createFormatters('en').formatRelativeTime(NaN, 'day'))
    ).toBe('INVALID_ARGUMENT');
  });
});

describe('locale handling and missing Intl', () => {
  it('falls back to the runtime default for an unknown locale tag', () => {
    expect(createFormatters('not a locale!').formatNumber(1234.5)).toMatch(
      /1.?234/
    );
  });

  it('throws INTL_UNAVAILABLE when Intl is missing', () => {
    const original = globalThis.Intl;
    // @ts-expect-error simulate a runtime without Intl
    globalThis.Intl = undefined;
    try {
      expect(codeOf(() => createFormatters('en').formatNumber(1))).toBe(
        'INTL_UNAVAILABLE'
      );
    } finally {
      globalThis.Intl = original;
    }
  });

  it('throws INTL_UNAVAILABLE when Intl.RelativeTimeFormat is missing', () => {
    const intl = Intl as unknown as { RelativeTimeFormat: unknown };
    const original = intl.RelativeTimeFormat;
    intl.RelativeTimeFormat = undefined;
    try {
      expect(
        codeOf(() => createFormatters('en').formatRelativeTime(1, 'day'))
      ).toBe('INTL_UNAVAILABLE');
    } finally {
      intl.RelativeTimeFormat = original;
    }
  });

  it('creates independent formatters per locale', () => {
    const en = createFormatters('en');
    const de = createFormatters('de');
    expect(en.formatNumber(1.5)).toBe('1.5');
    expect(de.formatNumber(1.5)).toBe('1,5');
  });
});

describe('formatRelativeTime - native fallback (runtimes without Intl.RelativeTimeFormat)', () => {
  const intl = Intl as unknown as { RelativeTimeFormat: unknown };
  let original: unknown;

  beforeEach(() => {
    original = intl.RelativeTimeFormat;
    intl.RelativeTimeFormat = undefined;
  });
  afterEach(() => {
    intl.RelativeTimeFormat = original;
  });

  it('uses the fallback with a singular unit, the locale and numeric mode', () => {
    const relativeTimeFallback = jest.fn().mockReturnValue('fallback text');
    const f = createFormatters('fr', { relativeTimeFallback });
    expect(f.formatRelativeTime(-3, 'day')).toBe('fallback text');
    expect(relativeTimeFallback).toHaveBeenCalledWith(
      -3,
      'day',
      'fr',
      'always'
    );
  });

  it('passes numeric: auto through', () => {
    const relativeTimeFallback = jest.fn().mockReturnValue('x');
    createFormatters('en', { relativeTimeFallback }).formatRelativeTime(
      1,
      'day',
      { numeric: 'auto' }
    );
    expect(relativeTimeFallback).toHaveBeenCalledWith(1, 'day', 'en', 'auto');
  });

  it.each([
    ['days', 'day'],
    ['hours', 'hour'],
    ['years', 'year'],
    ['week', 'week'],
  ])('accepts the plural form %s', (given, singular) => {
    const relativeTimeFallback = jest.fn().mockReturnValue('x');
    createFormatters('en', { relativeTimeFallback }).formatRelativeTime(
      2,
      given as Intl.RelativeTimeFormatUnit
    );
    expect(relativeTimeFallback.mock.calls[0]?.[1]).toBe(singular);
  });

  it('throws INTL_UNAVAILABLE when no fallback is configured', () => {
    expect(
      codeOf(() => createFormatters('en').formatRelativeTime(1, 'day'))
    ).toBe('INTL_UNAVAILABLE');
  });

  it('wraps a failing fallback as INVALID_ARGUMENT', () => {
    const f = createFormatters('en', {
      relativeTimeFallback: () => {
        throw new Error('platform said no');
      },
    });
    expect(codeOf(() => f.formatRelativeTime(1, 'day'))).toBe(
      'INVALID_ARGUMENT'
    );
  });

  it('keeps an I18nKitError thrown by the fallback unchanged', () => {
    const f = createFormatters('en', {
      relativeTimeFallback: () => {
        throw new I18nKitError('NATIVE_CALL_FAILED', 'native boom');
      },
    });
    expect(codeOf(() => f.formatRelativeTime(1, 'day'))).toBe(
      'NATIVE_CALL_FAILED'
    );
  });

  it.each(['fortnight', '', undefined, 5])(
    'rejects unit %p before calling the fallback',
    (unit) => {
      const relativeTimeFallback = jest.fn();
      const f = createFormatters('en', { relativeTimeFallback });
      expect(
        codeOf(() =>
          f.formatRelativeTime(
            1,
            unit as unknown as Intl.RelativeTimeFormatUnit
          )
        )
      ).toBe('INVALID_ARGUMENT');
      expect(relativeTimeFallback).not.toHaveBeenCalled();
    }
  );

  it('rejects a non-finite value before calling the fallback', () => {
    const relativeTimeFallback = jest.fn();
    const f = createFormatters('en', { relativeTimeFallback });
    expect(codeOf(() => f.formatRelativeTime(NaN, 'day'))).toBe(
      'INVALID_ARGUMENT'
    );
    expect(relativeTimeFallback).not.toHaveBeenCalled();
  });
});

describe('formatRelativeTime - prefers Intl when it exists', () => {
  it('does not call the fallback', () => {
    const relativeTimeFallback = jest.fn();
    const f = createFormatters('en', { relativeTimeFallback });
    expect(f.formatRelativeTime(-3, 'days')).toBe('3 days ago');
    expect(relativeTimeFallback).not.toHaveBeenCalled();
  });
});
