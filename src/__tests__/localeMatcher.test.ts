import { matchFirstLocale, matchLocale, normalizeTag } from '../localeMatcher';

describe('normalizeTag', () => {
  it.each([
    ['en-US', 'en-us'],
    ['EN_us', 'en-us'],
    ['  fr  ', 'fr'],
    ['zh_Hans_CN', 'zh-hans-cn'],
    ['iw', 'he'],
    ['IW-IL', 'he-il'],
    ['in', 'id'],
    ['ji', 'yi'],
    ['', ''],
    ['   ', ''],
  ])('normalizes %p to %p', (input, expected) => {
    expect(normalizeTag(input)).toBe(expected);
  });

  it.each([undefined, null, 42, {}])('returns "" for non-string %p', (v) => {
    expect(normalizeTag(v as unknown as string)).toBe('');
  });
});

describe('matchLocale - positive', () => {
  it('matches an exact tag', () => {
    expect(matchLocale('fr-FR', ['en', 'fr-FR'])).toBe('fr-FR');
  });

  it('is case-insensitive and returns the shipped spelling', () => {
    expect(matchLocale('FR', ['en', 'fr'])).toBe('fr');
    expect(matchLocale('pt-br', ['PT-BR'])).toBe('PT-BR');
  });

  it('treats underscores like hyphens', () => {
    expect(matchLocale('pt_BR', ['pt-BR'])).toBe('pt-BR');
  });

  it('reduces a regional tag to its language', () => {
    expect(matchLocale('fr-CA', ['en', 'fr'])).toBe('fr');
  });

  it.each([
    ['zh-Hans-CN', ['zh-CN'], 'zh-CN'],
    ['zh-Hans-CN', ['zh-Hans'], 'zh-Hans'],
    ['zh-Hans-CN', ['zh'], 'zh'],
    ['zh-Hant-TW', ['zh-TW', 'zh-CN'], 'zh-TW'],
    ['sr-Latn-RS', ['sr-Latn'], 'sr-Latn'],
  ])('resolves %s against %p', (requested, available, expected) => {
    expect(matchLocale(requested, available)).toBe(expected);
  });

  it('prefers the most specific shipped locale', () => {
    expect(matchLocale('pt-BR', ['pt', 'pt-BR'])).toBe('pt-BR');
  });

  it('falls back to a sibling region of the same language', () => {
    expect(matchLocale('pt', ['en', 'pt-BR', 'pt-PT'])).toBe('pt-BR');
    expect(matchLocale('es-MX', ['es-ES'])).toBe('es-ES');
  });

  it('maps legacy language codes', () => {
    expect(matchLocale('iw', ['he'])).toBe('he');
    expect(matchLocale('in-ID', ['id'])).toBe('id');
  });

  it('matches a shipped legacy code as well', () => {
    expect(matchLocale('he', ['iw'])).toBe('iw');
  });
});

describe('matchLocale - negative', () => {
  it.each([
    ['an unrelated language', 'de', ['en', 'fr']],
    ['an empty request', '', ['en']],
    ['a whitespace request', '   ', ['en']],
    ['an empty available list', 'en', []],
  ])('returns undefined for %s', (_label, requested, available) => {
    expect(matchLocale(requested, available)).toBeUndefined();
  });

  it.each([undefined, null, 5])('ignores non-string request %p', (value) => {
    expect(matchLocale(value as unknown as string, ['en'])).toBeUndefined();
  });

  it('does not match a different language that shares a prefix', () => {
    expect(matchLocale('es', ['est'])).toBeUndefined();
  });

  it('ignores blank entries in the shipped list', () => {
    expect(matchLocale('en', ['', '  '])).toBeUndefined();
  });
});

describe('matchFirstLocale', () => {
  it('honours request order for equally specific matches', () => {
    expect(matchFirstLocale(['fr-FR', 'en-US'], ['en', 'fr'])).toBe('fr');
  });

  it('skips unsupported requests', () => {
    expect(matchFirstLocale(['de-DE', 'ja-JP', 'fr-FR'], ['en', 'fr'])).toBe(
      'fr'
    );
  });

  it('prefers a later specific match over an earlier sibling-only match', () => {
    // "pt" would only sibling-match pt-BR; "en" matches exactly.
    expect(matchFirstLocale(['pt', 'en'], ['pt-BR', 'en'])).toBe('en');
  });

  it('uses the sibling match when nothing more specific exists', () => {
    expect(matchFirstLocale(['pt', 'de'], ['pt-BR', 'en'])).toBe('pt-BR');
  });

  it('returns undefined for an empty request list', () => {
    expect(matchFirstLocale([], ['en'])).toBeUndefined();
  });

  it('does not mutate its inputs', () => {
    const requested = ['fr-FR'];
    const available = ['fr', 'en'];
    matchFirstLocale(requested, available);
    expect(requested).toEqual(['fr-FR']);
    expect(available).toEqual(['fr', 'en']);
  });
});
