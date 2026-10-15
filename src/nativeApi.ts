import { Platform } from 'react-native';
import NativeI18nKit from './NativeI18nKit';
import type { Spec } from './NativeI18nKit';
import { I18nKitError, toI18nKitError } from './errors';
import type { LocaleInfo, NumberFormatSettings } from './types';

const SUPPORTED_PLATFORMS = ['ios', 'android'] as const;

/**
 * Verifies the app is running on a platform the native module supports.
 *
 * @throws {I18nKitError} `UNSUPPORTED_PLATFORM` when `Platform.OS` is neither
 * `"ios"` nor `"android"` (for example `"web"` or `"windows"`).
 */
function assertSupportedPlatform(): void {
  if (!SUPPORTED_PLATFORMS.includes(Platform.OS as 'ios' | 'android')) {
    throw new I18nKitError(
      'UNSUPPORTED_PLATFORM',
      `react-native-i18n-kit only supports iOS and Android. Current platform: "${Platform.OS}".`
    );
  }
}

/**
 * Returns the linked native module.
 *
 * @returns The TurboModule instance.
 * @throws {I18nKitError} `NATIVE_MODULE_UNAVAILABLE` when the module is not
 * linked (missing `pod install` or a stale Android build).
 */
function getNativeModule(): Spec {
  if (!NativeI18nKit) {
    throw new I18nKitError(
      'NATIVE_MODULE_UNAVAILABLE',
      'The native I18nKit module is not linked. Did you forget to run `pod install` (iOS) ' +
        'or rebuild the Android app after installing react-native-i18n-kit?'
    );
  }
  return NativeI18nKit;
}

/**
 * Runs a synchronous native call after the platform and module checks,
 * normalising any thrown error into an {@link I18nKitError}.
 *
 * @param fn - Callback that receives the native module and returns a value.
 * @returns Whatever `fn` returns.
 * @throws {I18nKitError} `UNSUPPORTED_PLATFORM`, `NATIVE_MODULE_UNAVAILABLE`,
 * or `NATIVE_CALL_FAILED` (wrapping the original error as `cause`).
 */
function guard<T>(fn: (native: Spec) => T): T {
  assertSupportedPlatform();
  const native = getNativeModule();
  try {
    return fn(native);
  } catch (error) {
    throw toI18nKitError(error);
  }
}

/**
 * Asynchronous counterpart of {@link guard}; also normalises promise
 * rejections.
 *
 * @param fn - Callback that receives the native module and returns a promise.
 * @returns A promise resolving to the value `fn` resolves to.
 * @throws {I18nKitError} Same codes as {@link guard}.
 */
async function guardAsync<T>(fn: (native: Spec) => Promise<T>): Promise<T> {
  assertSupportedPlatform();
  const native = getNativeModule();
  try {
    return await fn(native);
  } catch (error) {
    throw toI18nKitError(error);
  }
}

/**
 * Lists every locale the user configured on the device, most preferred first.
 *
 * @returns One {@link LocaleInfo} per configured locale (at least one entry).
 * @throws {I18nKitError} On an unsupported platform, a missing native module,
 * or a native failure.
 */
export function getDeviceLocales(): LocaleInfo[] {
  return guard((native) => native.getDeviceLocales());
}

/**
 * Returns the single most-preferred device locale.
 *
 * @returns The primary {@link LocaleInfo}.
 * @throws {I18nKitError} On an unsupported platform, a missing native module,
 * or a native failure.
 */
export function getDeviceLocale(): LocaleInfo {
  return guard((native) => native.getDeviceLocale());
}

/**
 * Returns the ISO 3166-1 alpha-2 country code of the device's region setting.
 *
 * @returns Upper-case country code such as `"IN"`, or `""` if unknown.
 * @throws {I18nKitError} On an unsupported platform, a missing native module,
 * or a native failure.
 */
export function getCountry(): string {
  return guard((native) => native.getCountry());
}

/**
 * Returns the calendar system in use.
 *
 * @returns A calendar identifier such as `"gregorian"`, `"japanese"` or
 * `"buddhist"`.
 * @throws {I18nKitError} On an unsupported platform, a missing native module,
 * or a native failure.
 */
export function getCalendar(): string {
  return guard((native) => native.getCalendar());
}

/**
 * Returns the device's IANA time zone identifier.
 *
 * @returns For example `"Asia/Kolkata"`.
 * @throws {I18nKitError} On an unsupported platform, a missing native module,
 * or a native failure.
 */
export function getTimeZone(): string {
  return guard((native) => native.getTimeZone());
}

/**
 * Returns the decimal and grouping separators of the active numeric locale.
 *
 * @returns A {@link NumberFormatSettings} object, e.g.
 * `{ decimalSeparator: ".", groupingSeparator: "," }`.
 * @throws {I18nKitError} On an unsupported platform, a missing native module,
 * or a native failure.
 */
export function getNumberFormatSettings(): NumberFormatSettings {
  return guard((native) => native.getNumberFormatSettings());
}

/**
 * Tells whether the device is set to a 24-hour clock.
 *
 * @returns `true` for a 24-hour clock, `false` for 12-hour (AM/PM).
 * @throws {I18nKitError} On an unsupported platform, a missing native module,
 * or a native failure.
 */
export function uses24HourClock(): boolean {
  return guard((native) => native.uses24HourClock());
}

/**
 * Tells whether the device region uses the metric system.
 *
 * @returns `true` for metric, `false` for imperial / US customary units.
 * @throws {I18nKitError} On an unsupported platform, a missing native module,
 * or a native failure.
 */
export function usesMetricSystem(): boolean {
  return guard((native) => native.usesMetricSystem());
}

/**
 * Tells whether a language is written right-to-left, using the platform's own
 * bidi data.
 *
 * @param languageCode - A BCP-47 language code such as `"ar"` or `"he"`.
 * @returns `true` if the language is right-to-left, otherwise `false`.
 * @throws {I18nKitError} `INVALID_LOCALE` when `languageCode` is empty (the
 * native layer is not called); otherwise the same errors as the other native
 * calls.
 */
export function isRTLForLanguage(languageCode: string): boolean {
  if (!languageCode) {
    throw new I18nKitError(
      'INVALID_LOCALE',
      'isRTLForLanguage() requires a non-empty language code.'
    );
  }
  return guard((native) => native.isRTLForLanguage(languageCode));
}

/**
 * Applies an in-app language override at the native layer.
 *
 * @param languageTag - A BCP-47 tag such as `"fr"` or `"pt-BR"`.
 * @returns A promise resolving to `true` when the change applies immediately
 * (Android) or `false` when it only takes effect after the app restarts (iOS).
 * @throws {I18nKitError} `INVALID_LOCALE` (rejection) when `languageTag` is
 * empty; otherwise the same errors as the other native calls.
 */
export async function setAppLanguage(languageTag: string): Promise<boolean> {
  if (!languageTag) {
    throw new I18nKitError(
      'INVALID_LOCALE',
      'setAppLanguage() requires a non-empty BCP-47 language tag.'
    );
  }
  return guardAsync((native) => native.setAppLanguage(languageTag));
}

/**
 * Reads the app-level language override set through {@link setAppLanguage}.
 *
 * @returns The BCP-47 tag of the override, or `""` if none was set.
 * @throws {I18nKitError} On an unsupported platform, a missing native module,
 * or a native failure.
 */
export function getAppLanguage(): string {
  return guard((native) => native.getAppLanguage());
}
