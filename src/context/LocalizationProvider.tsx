import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { I18nManager, NativeEventEmitter } from 'react-native';
import NativeI18nKit from '../NativeI18nKit';
import { getDeviceLocales, isRTLForLanguage } from '../nativeApi';
import { listAvailableLocales, translate } from '../translator';
import { I18nKitError } from '../errors';
import type {
  LocalizationProviderProps,
  TFunction,
  TranslateOptions,
} from '../types';

/** Shape of the value shared through the localization React context. */
interface LocalizationContextValue {
  /** Currently active locale code. */
  locale: string;
  /** Switches the active locale (see `useTranslation`). */
  setLocale: (locale: string) => Promise<void>;
  /** Sorted locale codes present in the `translations` prop. */
  availableLocales: string[];
  /** Whether the active locale is written right-to-left. */
  isRTL: boolean;
  /** Translate function bound to the active locale. */
  t: TFunction;
}

const LocalizationContext = createContext<LocalizationContextValue | null>(
  null
);
LocalizationContext.displayName = 'I18nKitLocalizationContext';

/**
 * Picks the best starting locale: the first device-preferred locale that
 * exists in `availableLocales`, falling back to `defaultLocale` when the
 * user's device languages aren't among the ones the app ships.
 *
 * @param availableLocales - Locale codes the app ships translations for.
 * @param defaultLocale - Locale to use when no device locale matches or the
 * native module cannot be read.
 * @returns A locale code (an exact tag such as `"pt-BR"` is preferred over
 * the bare language such as `"pt"`).
 */
function resolveInitialLocale(
  availableLocales: string[],
  defaultLocale: string
): string {
  try {
    const deviceLocales = getDeviceLocales();
    const match = deviceLocales.find(
      (candidate) =>
        availableLocales.includes(candidate.languageTag) ||
        availableLocales.includes(candidate.languageCode)
    );
    if (match) {
      return availableLocales.includes(match.languageTag)
        ? match.languageTag
        : match.languageCode;
    }
  } catch {
    // Native module unavailable (e.g. mid-development, or an unsupported
    // platform during tests) — silently fall through to defaultLocale
    // rather than crashing app bootstrap over a non-critical feature.
  }
  return defaultLocale;
}

/**
 * Wraps your app and makes `useTranslation()` / `useDeviceLocale()`
 * available anywhere below it. Mount this once, near the root.
 *
 * @param props - See {@link LocalizationProviderProps}: `translations` and
 * `defaultLocale` are required; `fallbackLocale`, `autoDetectDeviceLocale`
 * (default `true`) and `manageRTL` (default `true`) are optional.
 * @returns A context provider element wrapping `children`.
 */
export function LocalizationProvider({
  translations,
  defaultLocale,
  fallbackLocale,
  autoDetectDeviceLocale = true,
  manageRTL = true,
  children,
}: LocalizationProviderProps): React.ReactElement {
  // Sorted locale codes of the `translations` prop; recomputed only when it changes.
  const availableLocales = useMemo(
    () => listAvailableLocales(translations),
    [translations]
  );

  if (__DEV__ && !translations[defaultLocale]) {
    console.warn(
      `[react-native-i18n-kit] defaultLocale "${defaultLocale}" has no matching entry in ` +
        `"translations". Falling back will not work as expected until you add it.`
    );
  }

  const [locale, setLocaleState] = useState<string>(() =>
    autoDetectDeviceLocale
      ? resolveInitialLocale(availableLocales, defaultLocale)
      : defaultLocale
  );

  const warnedKeysRef = useRef<Set<string>>(new Set());

  /**
   * Aligns `I18nManager` with the writing direction of `nextLocale`. Never
   * throws: native failures are logged in dev and otherwise ignored.
   *
   * @param nextLocale - The locale about to become active.
   */
  const applyRTLIfNeeded = useCallback(
    (nextLocale: string) => {
      if (!manageRTL) return;
      try {
        const shouldBeRTL = isRTLForLanguage(
          nextLocale.split('-')[0] ?? nextLocale
        );
        if (shouldBeRTL !== I18nManager.isRTL) {
          I18nManager.forceRTL(shouldBeRTL);
          if (__DEV__) {
            console.warn(
              '[react-native-i18n-kit] Writing direction changed. React Native requires a ' +
                'JS bundle reload for RTL layout changes to take visual effect — prompt the ' +
                'user to restart the app (see README "Platform limitations").'
            );
          }
        }
      } catch (error) {
        if (__DEV__) {
          console.warn(
            '[react-native-i18n-kit] Failed to evaluate RTL for locale',
            nextLocale,
            error
          );
        }
      }
    },
    [manageRTL]
  );

  // Apply RTL once for the initial locale on mount.
  useEffect(() => {
    applyRTLIfNeeded(locale);
    // We intentionally only want this on mount — subsequent changes go
    // through setLocale(), which calls applyRTLIfNeeded itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Switches the active locale and updates RTL state.
   *
   * @param next - Locale code to activate, e.g. `"fr"`. It does not need to
   * exist in `translations` (lookups then use the fallback locale).
   * @returns A promise that resolves once the locale state is updated.
   * @throws {I18nKitError} `INVALID_LOCALE` (rejection) when `next` is empty,
   * whitespace-only or not a string; the active locale is left unchanged.
   */
  const setLocale = useCallback(
    async (next: string) => {
      if (typeof next !== 'string' || next.trim().length === 0) {
        throw new I18nKitError(
          'INVALID_LOCALE',
          'setLocale() requires a non-empty locale code.'
        );
      }
      if (!availableLocales.includes(next) && __DEV__) {
        console.warn(
          `[react-native-i18n-kit] setLocale("${next}") — this locale has no entry in ` +
            `"translations". Lookups will fall back to "${fallbackLocale ?? defaultLocale}".`
        );
      }
      applyRTLIfNeeded(next);
      setLocaleState(next);
    },
    [availableLocales, applyRTLIfNeeded, defaultLocale, fallbackLocale]
  );

  /**
   * Logs a missing-translation warning once per locale/key pair (dev only).
   *
   * @param key - The translation key that could not be resolved.
   * @param activeLocale - The locale that was active during the lookup.
   */
  const onMissingKey = useCallback((key: string, activeLocale: string) => {
    if (!__DEV__) return;
    const warnKey = `${activeLocale}:${key}`;
    if (warnedKeysRef.current.has(warnKey)) return; // avoid log spam on re-renders
    warnedKeysRef.current.add(warnKey);

    console.warn(
      `[react-native-i18n-kit] Missing translation for key "${key}" in locale "${activeLocale}".`
    );
  }, []);

  /**
   * Translate function exposed to consumers.
   *
   * @param key - Dot-separated key such as `"home.greeting"`.
   * @param options - Optional interpolation values, `count` and `defaultValue`.
   * @returns The translated string, or the key / `defaultValue` when missing.
   * @throws {I18nKitError} `TRANSLATION_KEY_NOT_FOUND` for an empty key.
   */
  const t = useCallback<TFunction>(
    (key: string, options?: TranslateOptions) =>
      translate(
        { translations, locale, fallbackLocale, onMissingKey },
        key,
        options
      ),
    [translations, locale, fallbackLocale, onMissingKey]
  );

  // Writing direction of the active locale; falls back to the current
  // I18nManager state if the native lookup fails.
  const isRTL = useMemo(() => {
    try {
      return isRTLForLanguage(locale.split('-')[0] ?? locale);
    } catch {
      return I18nManager.isRTL;
    }
  }, [locale]);

  // Context value is memoized so consumers re-render only when something they read changes.
  const value = useMemo<LocalizationContextValue>(
    () => ({ locale, setLocale, availableLocales, isRTL, t }),
    [locale, setLocale, availableLocales, isRTL, t]
  );

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}

/**
 * Internal accessor shared by useTranslation/useDeviceLocale — not exported
 * publicly.
 *
 * @returns The current localization context value.
 * @throws {I18nKitError} `PROVIDER_NOT_FOUND` when called outside a
 * `<LocalizationProvider>`.
 */
export function useLocalizationContext(): LocalizationContextValue {
  const ctx = useContext(LocalizationContext);
  if (!ctx) {
    throw new I18nKitError(
      'PROVIDER_NOT_FOUND',
      'useTranslation()/useDeviceLocale() was called outside of a <LocalizationProvider>. ' +
        'Wrap your app root with <LocalizationProvider translations={...} defaultLocale="...">.'
    );
  }
  return ctx;
}

let sharedEmitter: NativeEventEmitter | null = null;

/**
 * Exposes the shared NativeEventEmitter for "onLocaleChanged" events so
 * hooks can subscribe without each creating their own emitter instance.
 *
 * @returns The cached emitter, or `null` when the native module is not linked.
 */
export function getI18nKitEventEmitter(): NativeEventEmitter | null {
  if (!NativeI18nKit) return null;
  if (sharedEmitter) return sharedEmitter;
  sharedEmitter = new NativeEventEmitter(
    NativeI18nKit as unknown as ConstructorParameters<
      typeof NativeEventEmitter
    >[0]
  );
  return sharedEmitter;
}
