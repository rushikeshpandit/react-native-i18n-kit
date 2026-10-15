import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * Raw locale descriptor returned directly by the native layer.
 * Mirrors what Android's `LocaleList` / `Configuration` and iOS's
 * `Locale.preferredLanguages` expose, normalized to a single shape.
 */
export interface NativeLocaleInfo {
  languageTag: string; // e.g. "en-US"
  languageCode: string; // e.g. "en"
  countryCode: string; // e.g. "US"
  isRTL: boolean;
}

/** Native-reported decimal / grouping separators for the current locale. */
export interface NativeNumberFormatSettings {
  decimalSeparator: string;
  groupingSeparator: string;
}

/**
 * Spec consumed by the New Architecture codegen to generate the
 * platform-specific TurboModule glue (`NativeI18nKitSpec` on both
 * Android and iOS). Every method here MUST stay codegen-compatible:
 * primitives, arrays, object literals, and Promises only — no unions
 * of incompatible shapes, no `any`.
 */
export interface Spec extends TurboModule {
  // ---- Device locale detection -------------------------------------------------
  /**
   * All user-preferred locales, in priority order.
   * @returns Locale descriptors; index 0 is the most preferred (never empty).
   */
  getDeviceLocales(): NativeLocaleInfo[];
  /**
   * Convenience accessor for the single most-preferred device locale.
   * @returns The first entry of {@link getDeviceLocales}.
   */
  getDeviceLocale(): NativeLocaleInfo;
  /**
   * ISO 3166-1 country code derived from the device's region setting.
   * @returns Upper-case alpha-2 code, or `""` if unknown.
   */
  getCountry(): string;
  /**
   * Calendar identifier in use.
   * @returns For example `"gregorian"`, `"islamic"` or `"japanese"`.
   */
  getCalendar(): string;
  /**
   * IANA time zone identifier.
   * @returns For example `"Asia/Kolkata"`.
   */
  getTimeZone(): string;
  /**
   * Decimal & grouping separators for the current numeric locale.
   * @returns Both separators as strings.
   */
  getNumberFormatSettings(): NativeNumberFormatSettings;
  /**
   * Whether the user's device clock preference is 24-hour.
   * @returns `true` for 24-hour, `false` for 12-hour.
   */
  uses24HourClock(): boolean;
  /**
   * Whether the user's device measurement preference is metric.
   * @returns `true` for metric, `false` for imperial / US customary.
   */
  usesMetricSystem(): boolean;
  /**
   * Resolves whether a given BCP-47 language code is conventionally RTL.
   * @param languageCode - Language code such as `"ar"` (non-empty).
   * @returns `true` if the language is written right-to-left.
   */
  isRTLForLanguage(languageCode: string): boolean;

  // ---- App-level language override ---------------------------------------------
  /**
   * Applies an in-app language override.
   * - Android: uses `AppCompatDelegate.setApplicationLocales`, applied immediately,
   *   no restart required (API levels < 33 get this via the AppCompat backport).
   * - iOS: persists the preference for next launch (`AppleLanguages` in
   *   `UserDefaults`) since iOS has no public live-override API; resolves
   *   `false` to signal "requires restart" so JS can prompt the user.
   * @param languageTag - BCP-47 tag such as `"fr"` or `"pt-BR"` (non-empty).
   * @returns Promise resolving to `true` if applied immediately, `false` if a
   * restart is required. Rejects with `INVALID_LOCALE` for a blank tag.
   */
  setAppLanguage(languageTag: string): Promise<boolean>;
  /**
   * Currently active app-level language override.
   * @returns The BCP-47 tag, or `""` if unset.
   */
  getAppLanguage(): string;

  // ---- Relative time fallback (Hermes has no Intl.RelativeTimeFormat) -----------
  /**
   * Formats a relative time with the platform's own formatter (Android ICU
   * `RelativeDateTimeFormatter`, iOS `RelativeDateTimeFormatter`).
   * @param value - Finite number; negative means the past. iOS rounds to a whole unit.
   * @param unit - `"second"`, `"minute"`, `"hour"`, `"day"`, `"week"`, `"month"`, `"quarter"` or `"year"`.
   * @param locale - BCP-47 locale tag, e.g. `"fr"`.
   * @param numeric - `"always"` for "in 1 day" or `"auto"` for "tomorrow" when the locale has such a word.
   * @returns The formatted string; `""` if the platform cannot format it.
   */
  formatRelativeTime(
    value: number,
    unit: string,
    locale: string,
    numeric: string
  ): string;

  // ---- Saved in-app locale (survives app restarts) ------------------------------
  /**
   * Reads the locale the user picked in the app and saved earlier.
   * @returns The saved locale code, or `""` if none was saved.
   */
  getSavedLocale(): string;
  /**
   * Saves the user's in-app locale choice (Android `SharedPreferences`,
   * iOS `UserDefaults`) so it can be restored on the next launch.
   * Returns a boolean (not `void`) on purpose: TurboModule `void` methods run
   * asynchronously, so a following `getSavedLocale()` could miss the write.
   * @param locale - Non-empty locale code, e.g. `"fr"`.
   * @returns `true` once saved; `false` if `locale` is blank (nothing written).
   */
  saveLocale(locale: string): boolean;
  /**
   * Removes the saved locale so the app follows the device language again.
   * Synchronous for the same reason as `saveLocale`.
   * @returns `true` once removed (also when nothing was saved).
   */
  clearSavedLocale(): boolean;

  // ---- Event emitter plumbing (NativeEventEmitter requires these two) -----------
  /**
   * Called by `NativeEventEmitter` when a JS listener attaches (iOS only; a
   * no-op on Android).
   * @param eventName - Event the listener subscribed to (`"onLocaleChanged"`).
   */
  addListener(eventName: string): void;
  /**
   * Called by `NativeEventEmitter` when JS listeners detach (iOS only; a
   * no-op on Android).
   * @param count - Number of listeners removed.
   */
  removeListeners(count: number): void;
}

// `get` (not `getEnforcing`) so importing the library never throws when the
// native module is missing; nativeApi.ts raises a descriptive I18nKitError
// on first use instead.
export default TurboModuleRegistry.get<Spec>('I18nKit');
