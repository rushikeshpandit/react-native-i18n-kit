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
import {
  clearSavedLocale,
  getDeviceLocales,
  getSavedLocale,
  isRTLForLanguage,
  saveLocale,
} from '../nativeApi';
import { createFormatters } from '../defaultFormatters';
import { matchFirstLocale, matchLocale } from '../localeMatcher';
import { listAvailableLocales, translate } from '../translator';
import { I18nKitError } from '../errors';
import type {
  LocalizationProviderProps,
  TFunction,
  TranslateOptions,
  UseTranslationResult,
} from '../types';

/** Shape of the value shared through the localization React context. */
type LocalizationContextValue = UseTranslationResult;

const LocalizationContext = createContext<LocalizationContextValue | null>(
  null
);
LocalizationContext.displayName = 'I18nKitLocalizationContext';

/**
 * Picks the locale shipped in `availableLocales` that best matches the
 * device's language list.
 *
 * @param availableLocales - Locale codes the app ships translations for.
 * @returns The matching shipped locale (case-insensitive, with script/region
 * fallback such as `zh-Hans-CN` → `zh-CN` → `zh`), or `undefined` when none
 * matches or the native module cannot be read.
 */
function detectDeviceLocale(availableLocales: string[]): string | undefined {
  try {
    const tags = getDeviceLocales().flatMap((device) => [
      device.languageTag,
      device.languageCode,
    ]);
    return matchFirstLocale(tags, availableLocales);
  } catch {
    // Native module unavailable (e.g. mid-development, or an unsupported
    // platform during tests) — silently fall through rather than crashing
    // app bootstrap over a non-critical feature.
    return undefined;
  }
}

/**
 * Reads the locale the user saved earlier and resolves it against the shipped
 * locales.
 *
 * @param availableLocales - Locale codes the app ships translations for.
 * @returns The matching shipped locale, or `undefined` when nothing was saved,
 * the saved locale is no longer shipped, or the native read fails.
 */
function readSavedLocale(availableLocales: string[]): string | undefined {
  try {
    const saved = getSavedLocale();
    return saved ? matchLocale(saved, availableLocales) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Picks the starting locale. Priority: the user's saved choice, then the
 * device language (when `autoDetect`), then `defaultLocale`.
 *
 * @param availableLocales - Locale codes the app ships translations for.
 * @param defaultLocale - Locale used when nothing else matches.
 * @param autoDetect - Whether to consult the device language.
 * @param persist - Whether to consult the saved choice.
 * @returns A locale code.
 */
function resolveInitialLocale(
  availableLocales: string[],
  defaultLocale: string,
  autoDetect: boolean,
  persist: boolean
): string {
  const saved = persist ? readSavedLocale(availableLocales) : undefined;
  if (saved) return saved;
  const detected = autoDetect
    ? detectDeviceLocale(availableLocales)
    : undefined;
  return detected ?? defaultLocale;
}

/**
 * Wraps your app and makes `useTranslation()` / `useDeviceLocale()`
 * available anywhere below it. Mount this once, near the root.
 *
 * @param props - See {@link LocalizationProviderProps}: `translations` and
 * `defaultLocale` are required; `fallbackLocale`, `autoDetectDeviceLocale`
 * (default `true`), `manageRTL` (default `true`), `persistLocale` (default
 * `true`) and `onRTLReloadRequired` are optional.
 * @returns A context provider element wrapping `children`.
 */
export function LocalizationProvider({
  translations,
  defaultLocale,
  fallbackLocale,
  autoDetectDeviceLocale = true,
  manageRTL = true,
  persistLocale = true,
  onRTLReloadRequired,
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
    resolveInitialLocale(
      availableLocales,
      defaultLocale,
      autoDetectDeviceLocale,
      persistLocale
    )
  );

  const warnedKeysRef = useRef<Set<string>>(new Set());

  // Latest RTL callback, read at call time so changing it never re-creates setLocale.
  const onRTLReloadRequiredRef = useRef(onRTLReloadRequired);
  onRTLReloadRequiredRef.current = onRTLReloadRequired;

  /**
   * Aligns `I18nManager` with the writing direction of `nextLocale` and
   * reports a required reload. Never throws: native failures are logged in
   * dev and otherwise ignored.
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
          try {
            onRTLReloadRequiredRef.current?.(shouldBeRTL);
          } catch (callbackError) {
            if (__DEV__) {
              console.warn(
                '[react-native-i18n-kit] onRTLReloadRequired threw',
                callbackError
              );
            }
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
   * Switches the active locale, updates RTL state and (unless disabled) saves
   * the choice natively.
   *
   * @param next - Locale code to activate, e.g. `"fr"`. Matching is
   * case-insensitive and tolerant of script/region (`"FR"` → `"fr"`,
   * `"zh-Hans-CN"` → `"zh-CN"`); an unshipped locale is accepted as written
   * (lookups then use the fallback locale).
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
      const requested = next.trim();
      const resolved = matchLocale(requested, availableLocales) ?? requested;
      if (!availableLocales.includes(resolved) && __DEV__) {
        console.warn(
          `[react-native-i18n-kit] setLocale("${requested}") — this locale has no entry in ` +
            `"translations". Lookups will fall back to "${fallbackLocale ?? defaultLocale}".`
        );
      }
      applyRTLIfNeeded(resolved);
      setLocaleState(resolved);
      if (persistLocale) {
        try {
          saveLocale(resolved);
        } catch (error) {
          if (__DEV__) {
            console.warn(
              '[react-native-i18n-kit] Could not save the locale choice',
              error
            );
          }
        }
      }
    },
    [
      availableLocales,
      applyRTLIfNeeded,
      defaultLocale,
      fallbackLocale,
      persistLocale,
    ]
  );

  /**
   * Forgets the saved locale choice and returns to the device language (or to
   * `defaultLocale` when `autoDetectDeviceLocale` is off).
   *
   * @returns A promise that resolves once the locale state is updated.
   */
  const resetLocale = useCallback(async () => {
    try {
      clearSavedLocale();
    } catch (error) {
      if (__DEV__) {
        console.warn(
          '[react-native-i18n-kit] Could not clear the saved locale',
          error
        );
      }
    }
    const next = resolveInitialLocale(
      availableLocales,
      defaultLocale,
      autoDetectDeviceLocale,
      false
    );
    applyRTLIfNeeded(next);
    setLocaleState(next);
  }, [
    availableLocales,
    defaultLocale,
    autoDetectDeviceLocale,
    applyRTLIfNeeded,
  ]);

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

  // Number/currency/percent/date/relative-time formatters for the active locale.
  // Times follow the device's 12/24-hour setting; relative times fall back to the
  // platform formatter on runtimes without Intl.RelativeTimeFormat (Hermes).
  const formatters = useMemo(() => createFormatters(locale), [locale]);

  // Context value is memoized so consumers re-render only when something they read changes.
  const value = useMemo<LocalizationContextValue>(
    () => ({
      locale,
      setLocale,
      resetLocale,
      availableLocales,
      isRTL,
      t,
      ...formatters,
    }),
    [locale, setLocale, resetLocale, availableLocales, isRTL, t, formatters]
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
