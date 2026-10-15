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

export default TurboModuleRegistry.getEnforcing<Spec>('I18nKit');
