/** Deprecated ISO 639 codes mapped to their modern replacements. */
const LEGACY_LANGUAGE_CODES: Record<string, string> = {
  iw: 'he',
  in: 'id',
  ji: 'yi',
};

/** The pieces of a BCP-47 tag that matter for locale matching. */
interface TagParts {
  language: string;
  script?: string;
  region?: string;
}

/**
 * Normalizes a locale tag for comparison: trims, converts `_` to `-`,
 * lower-cases and maps legacy language codes (`iw` → `he`).
 *
 * @param tag - A locale tag such as `"pt_BR"` or `"ZH-Hans-CN"`.
 * @returns The comparison form, e.g. `"pt-br"` or `"zh-hans-cn"`; `""` for
 * blank or non-string input.
 */
export function normalizeTag(tag: string): string {
  if (typeof tag !== 'string') return '';
  const lowered = tag.trim().replace(/_/g, '-').toLowerCase();
  if (!lowered) return '';
  const [language = '', ...rest] = lowered.split('-');
  return [LEGACY_LANGUAGE_CODES[language] ?? language, ...rest].join('-');
}

/**
 * Splits a normalized tag into language, script (4 letters) and region
 * (2 letters or 3 digits). Other subtags are ignored.
 *
 * @param normalized - A tag produced by {@link normalizeTag}.
 * @returns The recognised parts.
 */
function parseTag(normalized: string): TagParts {
  const [language = '', ...rest] = normalized.split('-');
  const parts: TagParts = { language };
  for (const subtag of rest) {
    if (!parts.script && /^[a-z]{4}$/.test(subtag)) parts.script = subtag;
    else if (!parts.region && /^([a-z]{2}|\d{3})$/.test(subtag))
      parts.region = subtag;
  }
  return parts;
}

/**
 * Lists the tags a requested locale may resolve to, most specific first:
 * full tag, language-script, language-region, language.
 *
 * @param normalized - A tag produced by {@link normalizeTag}.
 * @returns De-duplicated candidate tags (all normalized).
 */
function candidatesFor(normalized: string): string[] {
  const { language, script, region } = parseTag(normalized);
  const list = [
    normalized,
    script && region ? `${language}-${script}-${region}` : '',
    script ? `${language}-${script}` : '',
    region ? `${language}-${region}` : '',
    language,
  ].filter(Boolean);
  return list.filter((tag, index) => list.indexOf(tag) === index);
}

/**
 * Finds the shipped locale that best represents a requested locale tag.
 *
 * Comparison is case-insensitive and treats `_` like `-`. Resolution order:
 * the full tag, then language-script, language-region and language alone
 * (so `zh-Hans-CN` finds `zh-CN`, `zh-Hans` or `zh`), and finally the first
 * shipped locale (in the order given) that shares the language
 * (so `pt` finds `pt-BR`).
 *
 * @param requested - The tag to resolve, e.g. `"fr-CA"` or `"FR"`.
 * @param available - Locale codes the app ships, as written in `translations`.
 * @returns The matching entry of `available` exactly as spelled there, or
 * `undefined` when nothing matches or the input is blank.
 */
export function matchLocale(
  requested: string,
  available: string[]
): string | undefined {
  return matchFirstLocale([requested], available);
}

/**
 * Finds the best shipped locale for a preference-ordered list of requested
 * tags (for example the device's language list).
 *
 * Specific matches (full tag or its script/region/language reductions) are
 * preferred over sibling-language matches across the *whole* list, so a
 * later exact preference beats an earlier language-only sibling.
 *
 * @param requested - Requested tags, most preferred first.
 * @param available - Locale codes the app ships, as written in `translations`.
 * @returns The matching entry of `available` exactly as spelled there, or
 * `undefined` when nothing matches.
 */
export function matchFirstLocale(
  requested: string[],
  available: string[]
): string | undefined {
  const lookup = new Map<string, string>();
  for (const code of available) {
    const key = normalizeTag(code);
    if (key && !lookup.has(key)) lookup.set(key, code);
  }

  const normalizedRequests = requested.map(normalizeTag).filter(Boolean);

  for (const request of normalizedRequests) {
    for (const candidate of candidatesFor(request)) {
      const hit = lookup.get(candidate);
      if (hit !== undefined) return hit;
    }
  }

  for (const request of normalizedRequests) {
    const { language } = parseTag(request);
    for (const [key, original] of lookup) {
      if (parseTag(key).language === language) return original;
    }
  }
  return undefined;
}
