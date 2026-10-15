import type {
  NativeLocaleInfo,
  NativeNumberFormatSettings,
} from './NativeI18nKit';
import type React from 'react';

/** Re-exported so consumers never need to import from the native spec file directly. */
export type LocaleInfo = NativeLocaleInfo;
export type NumberFormatSettings = NativeNumberFormatSettings;

/**
 * A single language's string table. Values can be:
 * - a plain string, optionally containing `{{placeholder}}` tokens
 * - a pluralization map, selected by the `count` option passed to `t()`
 */
export type TranslationValue = string | PluralMap;

export interface PluralMap {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string; // mandatory fallback bucket
}

/** Nested key-value translation tree for a single locale, e.g. `{ home: { title: '...' } }`. */
export interface TranslationTree {
  [key: string]: TranslationValue | TranslationTree;
}

/** Map of BCP-47 locale code -> translation tree, e.g. `{ en: {...}, fr: {...} }`. */
export type TranslationMap = Record<string, TranslationTree>;

/** Values interpolated into a translation string via `{{token}}` syntax. */
export type InterpolationParams = Record<string, string | number>;

/**
 * Note: an intersection (not `interface ... extends InterpolationParams`)
 * is used deliberately — `count`/`defaultValue` have types that don't fit
 * the `string | number` index signature on `InterpolationParams`, and
 * `extends` would force TypeScript to reject that at the declaration
 * site even though real-world usage is always unambiguous.
 */
export type TranslateOptions = InterpolationParams & {
  /** Selects a plural bucket when the resolved value is a `PluralMap`. */
  count?: number;
  /** Overrides the default fallback locale for this single lookup. */
  defaultValue?: string;
};

export type TFunction = (key: string, options?: TranslateOptions) => string;

export interface LocalizationProviderProps {
  /** All translation trees this app ships, keyed by locale code. */
  translations: TranslationMap;
  /** Locale to use when nothing else has been chosen yet (e.g. "en"). */
  defaultLocale: string;
  /** Locale used as a last-resort fallback when a key is missing in the active locale. */
  fallbackLocale?: string;
  /**
   * When true (default), the provider initializes `locale` from the device's
   * preferred language (intersected with the locales you provide in
   * `translations`) instead of always starting at `defaultLocale`.
   */
  autoDetectDeviceLocale?: boolean;
  /**
   * When true (default), calls `I18nManager.forceRTL` automatically whenever
   * the active locale's writing direction differs from the current layout
   * direction. Note: RN requires a JS bundle reload to visually apply RTL,
   * which this library cannot do for you — see README "Platform limitations".
   */
  manageRTL?: boolean;
  children: React.ReactNode;
}

export interface UseTranslationResult {
  /** Translate a key, with optional interpolation / pluralization. */
  t: TFunction;
  /** Currently active locale code. */
  locale: string;
  /** Switches the active locale. Resolves once native RTL state (if any) settles. */
  setLocale: (locale: string) => Promise<void>;
  /** All locale codes available in the `translations` map you supplied. */
  availableLocales: string[];
  /** Whether the active locale renders right-to-left. */
  isRTL: boolean;
}
