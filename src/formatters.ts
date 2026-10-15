import { I18nKitError } from './errors';

/** Number, currency, percent, date and relative-time formatters bound to one locale. */
export interface Formatters {
  /**
   * Formats a number using the locale's digits and separators.
   *
   * @param value - A finite number.
   * @param options - Optional `Intl.NumberFormat` options.
   * @returns The formatted string, e.g. `"1,234.5"`.
   * @throws {I18nKitError} `INVALID_ARGUMENT` for a non-finite or non-number
   * value or invalid options; `INTL_UNAVAILABLE` if `Intl` is missing.
   */
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string;
  /**
   * Formats a monetary amount.
   *
   * @param value - A finite number.
   * @param currency - ISO 4217 code such as `"USD"` or `"INR"`.
   * @param options - Optional `Intl.NumberFormat` options (style is forced to currency).
   * @returns The formatted string, e.g. `"$1,234.50"`.
   * @throws {I18nKitError} `INVALID_ARGUMENT` for a bad value or currency code;
   * `INTL_UNAVAILABLE` if `Intl` is missing.
   */
  formatCurrency(
    value: number,
    currency: string,
    options?: Intl.NumberFormatOptions
  ): string;
  /**
   * Formats a fraction as a percentage.
   *
   * @param value - A finite fraction, where `0.256` means 25.6%.
   * @param options - Optional `Intl.NumberFormat` options (style is forced to percent).
   * @returns The formatted string, e.g. `"26%"`.
   * @throws {I18nKitError} `INVALID_ARGUMENT` / `INTL_UNAVAILABLE` as above.
   */
  formatPercent(value: number, options?: Intl.NumberFormatOptions): string;
  /**
   * Formats a date and/or time.
   *
   * @param value - A valid `Date` or a millisecond timestamp.
   * @param options - Optional `Intl.DateTimeFormat` options (default: medium date).
   * @returns The formatted string.
   * @throws {I18nKitError} `INVALID_ARGUMENT` for an invalid date or options;
   * `INTL_UNAVAILABLE` if `Intl` is missing.
   */
  formatDate(
    value: Date | number,
    options?: Intl.DateTimeFormatOptions
  ): string;
  /**
   * Formats a relative time such as "in 3 days" or "2 hours ago".
   *
   * @param value - A finite number; negative means the past.
   * @param unit - `"second"`, `"minute"`, `"hour"`, `"day"`, `"week"`, `"month"`, `"quarter"` or `"year"`.
   * @param options - Optional `Intl.RelativeTimeFormat` options.
   * @returns The formatted string.
   * @throws {I18nKitError} `INVALID_ARGUMENT` for a bad value or unit;
   * `INTL_UNAVAILABLE` if `Intl.RelativeTimeFormat` is missing.
   */
  formatRelativeTime(
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    options?: Intl.RelativeTimeFormatOptions
  ): string;
}

/** Settings that tune how {@link createFormatters} formats values. */
export interface FormattersConfig {
  /**
   * Whether times should use a 24-hour clock when the caller did not choose
   * (`hour12` / `hourCycle`). Omit to let the locale decide.
   */
  uses24HourClock?: () => boolean | undefined;
  /**
   * Formats a relative time when the runtime has no `Intl.RelativeTimeFormat`
   * (Hermes). Receives a singular unit and the locale; may throw.
   * Without it, `formatRelativeTime` throws `INTL_UNAVAILABLE` there.
   */
  relativeTimeFallback?: (
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    locale: string,
    numeric: 'auto' | 'always'
  ) => string;
}

const RELATIVE_UNITS = [
  'second',
  'minute',
  'hour',
  'day',
  'week',
  'month',
  'quarter',
  'year',
] as const;

/**
 * Reduces a relative-time unit to its singular form.
 *
 * @param unit - `"day"` or `"days"` etc.
 * @returns The singular unit, or `undefined` when it is not a supported unit.
 */
function singularUnit(unit: unknown): Intl.RelativeTimeFormatUnit | undefined {
  if (typeof unit !== 'string') return undefined;
  const singular = unit.endsWith('s') ? unit.slice(0, -1) : unit;
  return (RELATIVE_UNITS as readonly string[]).includes(singular)
    ? (singular as Intl.RelativeTimeFormatUnit)
    : undefined;
}

/**
 * Asserts that a value is a finite number.
 *
 * @param value - Value to check.
 * @param name - Argument name used in the error message.
 * @throws {I18nKitError} `INVALID_ARGUMENT` when `value` is not a finite number.
 */
function assertFiniteNumber(
  value: unknown,
  name: string
): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new I18nKitError(
      'INVALID_ARGUMENT',
      `${name} must be a finite number, got ${String(value)}.`
    );
  }
}

/**
 * Runs an `Intl` operation, translating failures into {@link I18nKitError}s.
 * An unknown locale tag is retried once with the runtime default locale.
 *
 * @param locale - Locale to format with.
 * @param build - Callback that receives a locale (or `undefined` for the
 * runtime default) and returns the formatted string.
 * @returns The formatted string.
 * @throws {I18nKitError} `INTL_UNAVAILABLE` if `Intl` does not exist,
 * otherwise `INVALID_ARGUMENT` wrapping the underlying `RangeError`/`TypeError`.
 */
function withIntl(
  locale: string,
  build: (locale: string | undefined) => string
): string {
  if (typeof Intl === 'undefined') {
    throw new I18nKitError(
      'INTL_UNAVAILABLE',
      'Intl is not available in this JavaScript runtime.'
    );
  }
  try {
    return build(locale);
  } catch (error) {
    if (error instanceof RangeError && /locale/i.test(error.message)) {
      try {
        return build(undefined);
      } catch (retryError) {
        throw new I18nKitError(
          'INVALID_ARGUMENT',
          String((retryError as Error).message),
          retryError
        );
      }
    }
    throw new I18nKitError(
      'INVALID_ARGUMENT',
      String((error as Error)?.message ?? error),
      error
    );
  }
}

/**
 * Creates formatters bound to a locale.
 *
 * @param locale - BCP-47 locale used for every call, e.g. `"fr"` or `"ar-EG"`.
 * @param config - Optional {@link FormattersConfig}.
 * @returns A {@link Formatters} object; nothing is computed until a method is called.
 */
export function createFormatters(
  locale: string,
  config: FormattersConfig = {}
): Formatters {
  return {
    formatNumber(value, options) {
      assertFiniteNumber(value, 'formatNumber value');
      return withIntl(locale, (l) =>
        new Intl.NumberFormat(l, options).format(value)
      );
    },
    formatCurrency(value, currency, options) {
      assertFiniteNumber(value, 'formatCurrency value');
      if (typeof currency !== 'string' || !/^[A-Za-z]{3}$/.test(currency)) {
        throw new I18nKitError(
          'INVALID_ARGUMENT',
          `currency must be a 3-letter ISO 4217 code, got ${String(currency)}.`
        );
      }
      return withIntl(locale, (l) =>
        new Intl.NumberFormat(l, {
          ...options,
          style: 'currency',
          currency: currency.toUpperCase(),
        }).format(value)
      );
    },
    formatPercent(value, options) {
      assertFiniteNumber(value, 'formatPercent value');
      return withIntl(locale, (l) =>
        new Intl.NumberFormat(l, { ...options, style: 'percent' }).format(value)
      );
    },
    formatDate(value, options) {
      const date = value instanceof Date ? value : new Date(value as number);
      if (
        !(value instanceof Date || typeof value === 'number') ||
        Number.isNaN(date.getTime())
      ) {
        throw new I18nKitError(
          'INVALID_ARGUMENT',
          `formatDate value must be a valid Date or timestamp, got ${String(value)}.`
        );
      }
      const base: Intl.DateTimeFormatOptions =
        options && Object.keys(options).length > 0
          ? { ...options }
          : { dateStyle: 'medium' };
      const showsTime =
        base.timeStyle !== undefined ||
        base.hour !== undefined ||
        base.minute !== undefined;
      if (
        showsTime &&
        base.hour12 === undefined &&
        base.hourCycle === undefined
      ) {
        const is24 = config.uses24HourClock?.();
        if (is24 !== undefined) base.hour12 = !is24;
      }
      return withIntl(locale, (l) =>
        new Intl.DateTimeFormat(l, base).format(date)
      );
    },
    formatRelativeTime(value, unit, options) {
      assertFiniteNumber(value, 'formatRelativeTime value');
      const singular = singularUnit(unit);
      if (!singular) {
        throw new I18nKitError(
          'INVALID_ARGUMENT',
          `formatRelativeTime unit must be one of ${RELATIVE_UNITS.join(', ')}, got ${String(unit)}.`
        );
      }
      const hasIntl =
        typeof Intl !== 'undefined' &&
        typeof Intl.RelativeTimeFormat === 'function';
      if (!hasIntl) {
        if (!config.relativeTimeFallback) {
          throw new I18nKitError(
            'INTL_UNAVAILABLE',
            'Intl.RelativeTimeFormat is not available in this JavaScript runtime.'
          );
        }
        try {
          return config.relativeTimeFallback(
            value,
            singular,
            locale,
            options?.numeric === 'auto' ? 'auto' : 'always'
          );
        } catch (error) {
          if (error instanceof I18nKitError) throw error;
          throw new I18nKitError(
            'INVALID_ARGUMENT',
            String((error as Error)?.message ?? error),
            error
          );
        }
      }
      return withIntl(locale, (l) =>
        new Intl.RelativeTimeFormat(l, options).format(value, singular)
      );
    },
  };
}
