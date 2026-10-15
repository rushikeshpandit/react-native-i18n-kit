import type {
  PluralMap,
  TranslateOptions,
  TranslationMap,
  TranslationTree,
  TranslationValue,
} from './types';
import { I18nKitError } from './errors';

const PLACEHOLDER_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;
const KEY_SEPARATOR = '.';

/**
 * Walks a dot-separated key path (e.g. "home.greeting") through a nested
 * translation tree. Returns `undefined` rather than throwing when any
 * segment is missing, so callers can decide how to fall back.
 *
 * @param tree - Translation tree of a single locale.
 * @param key - Dot-separated path such as `"home.title"`.
 * @returns The leaf string or plural map, or `undefined` if the path is
 * missing or points at a branch.
 */
function resolvePath(
  tree: TranslationTree,
  key: string
): TranslationValue | undefined {
  const segments = key.split(KEY_SEPARATOR);

  let node: any = tree;

  for (const segment of segments) {
    if (node == null || typeof node !== 'object') {
      return undefined;
    }
    node = node[segment];
  }

  return typeof node === 'string' ||
    (node && typeof node === 'object' && typeof node.other === 'string')
    ? (node as TranslationValue)
    : undefined;
}

/**
 * Picks the plural bucket for `count` using CLDR rules for `locale`
 * (via `Intl.PluralRules`).
 *
 * @param map - Plural map with a mandatory `other` bucket.
 * @param count - The quantity being described.
 * @param locale - BCP-47 locale whose plural rules apply.
 * @returns The selected string; `other` when the exact bucket is missing.
 */
function resolvePlural(map: PluralMap, count: number, locale: string): string {
  // An explicit "zero" bucket always wins for 0, regardless of language rules.
  if (count === 0 && map.zero !== undefined) return map.zero;

  let category: Intl.LDMLPluralRule | undefined;
  try {
    category = new Intl.PluralRules(locale).select(count);
  } catch {
    // Intl.PluralRules unavailable or locale tag invalid — use English-style rules.
    category = count === 1 ? 'one' : undefined;
  }
  return (category && map[category]) ?? map.other;
}

/**
 * Replaces every `{{token}}` occurrence with the matching value from `params`.
 *
 * @param template - String containing `{{token}}` placeholders.
 * @param params - Values keyed by token name.
 * @returns The interpolated string; tokens without a matching param are left
 * untouched.
 */
function interpolate(
  template: string,
  params: Record<string, string | number>
): string {
  return template.replace(PLACEHOLDER_PATTERN, (full, token: string) => {
    const value = params[token];
    // Leave the placeholder untouched if no matching param was supplied —
    // this surfaces missing-param bugs visibly instead of silently
    // collapsing them into an empty string.
    return value === undefined ? full : String(value);
  });
}

export interface TranslateContext {
  translations: TranslationMap;
  locale: string;
  fallbackLocale?: string;
  /** Called (in __DEV__ only) whenever a key can't be resolved in any locale. */
  onMissingKey?: (key: string, locale: string) => void;
}

/**
 * Resolves `key` against `locale`, falling back to `fallbackLocale` and
 * finally to the literal key itself (the universally-expected i18n
 * behavior — broken keys should be visible, not throw and crash a screen).
 *
 * @param ctx - Translations, active locale, optional fallback locale and an
 * optional missing-key callback.
 * @param key - Dot-separated translation key.
 * @param options - Optional interpolation values, `count` for plurals and
 * `defaultValue` returned verbatim when the key is missing everywhere.
 * @returns The translated string, `options.defaultValue`, or `key`.
 * @throws {I18nKitError} `TRANSLATION_KEY_NOT_FOUND` when `key` is empty.
 */
export function translate(
  ctx: TranslateContext,
  key: string,
  options?: TranslateOptions
): string {
  if (!key) {
    throw new I18nKitError(
      'TRANSLATION_KEY_NOT_FOUND',
      'translate() was called with an empty key.'
    );
  }

  const tryLocales = [ctx.locale, ctx.fallbackLocale].filter(
    (l, index, arr): l is string => !!l && arr.indexOf(l) === index
  );

  for (const localeCode of tryLocales) {
    const tree = ctx.translations[localeCode];
    if (!tree) continue;

    const value = resolvePath(tree, key);
    if (value === undefined) continue;

    const resolvedString =
      typeof value === 'string'
        ? value
        : resolvePlural(value, options?.count ?? 0, localeCode);

    return options ? interpolate(resolvedString, options) : resolvedString;
  }

  ctx.onMissingKey?.(key, ctx.locale);
  return options?.defaultValue ?? key;
}

/**
 * Lists the locale codes present in a translation map.
 *
 * @param translations - Map of locale code to translation tree.
 * @returns A new array of locale codes, sorted for stable UI rendering.
 */
export function listAvailableLocales(translations: TranslationMap): string[] {
  return Object.keys(translations).sort();
}
