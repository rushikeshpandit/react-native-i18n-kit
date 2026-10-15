import { createFormatters as createPureFormatters } from './formatters';
import type { Formatters, FormattersConfig } from './formatters';
import { formatRelativeTimeNative, uses24HourClock } from './nativeApi';

/**
 * Creates formatters bound to a locale, wired to the device: times follow the
 * device's 12/24-hour setting and relative times fall back to the platform
 * formatter when the runtime has no `Intl.RelativeTimeFormat` (Hermes).
 *
 * @param locale - BCP-47 locale used for every call, e.g. `"fr"` or `"ar-EG"`.
 * @param config - Optional overrides; anything you pass replaces the device-backed default.
 * @returns A {@link Formatters} object; nothing is computed until a method is called.
 */
export function createFormatters(
  locale: string,
  config: FormattersConfig = {}
): Formatters {
  return createPureFormatters(locale, {
    relativeTimeFallback: formatRelativeTimeNative,
    uses24HourClock: () => {
      try {
        return uses24HourClock();
      } catch {
        return undefined;
      }
    },
    ...config,
  });
}
