import { useEffect, useState } from 'react';
import { getI18nKitEventEmitter } from '../context/LocalizationProvider';
import {
  getCalendar,
  getCountry,
  getDeviceLocale,
  getDeviceLocales,
  getNumberFormatSettings,
  getTimeZone,
  uses24HourClock,
  usesMetricSystem,
} from '../nativeApi';
import type { LocaleInfo, NumberFormatSettings } from '../types';

/** Point-in-time copy of every OS-level locale setting the library exposes. */
export interface DeviceLocaleSnapshot {
  /** Most-preferred device locale. */
  locale: LocaleInfo;
  /** All preferred device locales, most preferred first. */
  locales: LocaleInfo[];
  /** ISO 3166-1 alpha-2 country code of the device region. */
  country: string;
  /** Calendar identifier, e.g. `"gregorian"`. */
  calendar: string;
  /** IANA time zone identifier. */
  timeZone: string;
  /** Decimal and grouping separators. */
  numberFormatSettings: NumberFormatSettings;
  /** `true` when the device uses a 24-hour clock. */
  uses24HourClock: boolean;
  /** `true` when the device region uses the metric system. */
  usesMetricSystem: boolean;
}

const NATIVE_LOCALE_CHANGED_EVENT = 'onLocaleChanged';

/**
 * Reads every device setting synchronously from the native module.
 *
 * @returns A fresh {@link DeviceLocaleSnapshot}.
 * @throws {I18nKitError} When any underlying native call fails.
 */
function readSnapshot(): DeviceLocaleSnapshot {
  return {
    locale: getDeviceLocale(),
    locales: getDeviceLocales(),
    country: getCountry(),
    calendar: getCalendar(),
    timeZone: getTimeZone(),
    numberFormatSettings: getNumberFormatSettings(),
    uses24HourClock: uses24HourClock(),
    usesMetricSystem: usesMetricSystem(),
  };
}

/**
 * Reads the device's OS-level locale settings (NOT your app's chosen
 * translation language — use `useTranslation().locale` for that).
 * Automatically refreshes if the user changes their system language
 * while your app is running, by subscribing to the native
 * `onLocaleChanged` broadcast (Android `Locale.ACTION_LOCALE_CHANGED`,
 * iOS `NSCurrentLocaleDidChangeNotification`).
 *
 * @returns The latest {@link DeviceLocaleSnapshot}; a new object is produced
 * whenever the system locale changes.
 * @throws {I18nKitError} On first render if the native module cannot be read
 * (later refresh failures are swallowed and the last good snapshot is kept).
 *
 * @example
 * const { country, timeZone, numberFormatSettings } = useDeviceLocale();
 */
export function useDeviceLocale(): DeviceLocaleSnapshot {
  const [snapshot, setSnapshot] = useState<DeviceLocaleSnapshot>(readSnapshot);

  useEffect(() => {
    const emitter = getI18nKitEventEmitter();
    if (!emitter) return undefined;

    const subscription = emitter.addListener(
      NATIVE_LOCALE_CHANGED_EVENT,
      () => {
        try {
          setSnapshot(readSnapshot());
        } catch {
          // Native call failed transiently (e.g. during app teardown) —
          // keep the last known-good snapshot rather than throwing inside
          // an event callback, which would crash with no useful stack.
        }
      }
    );

    return () => subscription.remove();
  }, []);

  return snapshot;
}
