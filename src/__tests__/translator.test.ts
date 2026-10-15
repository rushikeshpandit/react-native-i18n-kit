import { translate, listAvailableLocales } from '../translator';
import { I18nKitError } from '../errors';
import type { TranslationMap } from '../types';

const translations: TranslationMap = {
  en: {
    greeting: 'Hello, {{name}}!',
    home: { title: 'Home' },
    items: { zero: 'No items', one: 'One item', other: '{{count}} items' },
  },
  fr: {
    greeting: 'Bonjour, {{name}}!',
    home: { title: 'Accueil' },
  },
};

describe('translate', () => {
  it('resolves a simple key', () => {
    expect(translate({ translations, locale: 'en' }, 'home.title')).toBe(
      'Home'
    );
  });

  it('interpolates placeholders', () => {
    expect(
      translate({ translations, locale: 'en' }, 'greeting', {
        name: 'Rushikesh',
      })
    ).toBe('Hello, Rushikesh!');
  });

  it('leaves unmatched placeholders untouched', () => {
    expect(translate({ translations, locale: 'en' }, 'greeting')).toBe(
      'Hello, {{name}}!'
    );
  });

  it('resolves plural buckets by count', () => {
    expect(
      translate({ translations, locale: 'en' }, 'items', { count: 0 })
    ).toBe('No items');
    expect(
      translate({ translations, locale: 'en' }, 'items', { count: 1 })
    ).toBe('One item');
    expect(
      translate({ translations, locale: 'en' }, 'items', { count: 5 })
    ).toBe('5 items');
  });

  it('falls back to fallbackLocale when key is missing in active locale', () => {
    expect(
      translate({ translations, locale: 'fr', fallbackLocale: 'en' }, 'items', {
        count: 1,
      })
    ).toBe('One item');
  });

  it('falls back to the literal key when no locale has the key', () => {
    expect(translate({ translations, locale: 'fr' }, 'does.not.exist')).toBe(
      'does.not.exist'
    );
  });

  it('respects an explicit defaultValue over the literal-key fallback', () => {
    expect(
      translate({ translations, locale: 'fr' }, 'does.not.exist', {
        defaultValue: 'N/A',
      })
    ).toBe('N/A');
  });

  it('invokes onMissingKey exactly once per missing key', () => {
    const onMissingKey = jest.fn();
    translate({ translations, locale: 'fr', onMissingKey }, 'does.not.exist');
    expect(onMissingKey).toHaveBeenCalledWith('does.not.exist', 'fr');
  });

  it('throws I18nKitError for an empty key', () => {
    expect(() => translate({ translations, locale: 'en' }, '')).toThrow();
  });
});

describe('listAvailableLocales', () => {
  it('returns sorted locale codes', () => {
    expect(listAvailableLocales(translations)).toEqual(['en', 'fr']);
  });
});

describe('translate - edge cases', () => {
  const tr: TranslationMap = {
    en: {
      deep: { a: { b: { c: 'deep value' } } },
      branch: { child: 'x' },
      spaced: 'Hi {{ name }}!',
      dotted: 'Hi {{user.name}}',
      twice: '{{n}} and {{n}}',
      mixed: '{{a}}-{{b}}',
      settings: { other: { label: 'nested branch named other' } },
      apples: { one: '{{count}} apple', other: '{{count}} apples' },
    },
    fr: {
      apples: { one: '{{count}} pomme', other: '{{count}} pommes' },
    },
    ar: {
      items: {
        zero: 'صفر',
        one: 'واحد',
        two: 'اثنان',
        few: 'قليل',
        many: 'كثير',
        other: 'آخر',
      },
    },
    hi: {
      items: { one: 'एक', other: 'अन्य' },
    },
    empty: {},
  };
  const ctx = (locale: string, extra: object = {}) => ({
    translations: tr,
    locale,
    ...extra,
  });

  describe('key resolution', () => {
    it('resolves deeply nested keys', () => {
      expect(translate(ctx('en'), 'deep.a.b.c')).toBe('deep value');
    });

    it.each([
      ['a branch (not a leaf)', 'branch'],
      ['a missing child', 'branch.nope'],
      ['a path through a string leaf', 'spaced.deeper'],
      ['a trailing dot', 'branch.'],
      ['a leading dot', '.branch'],
      ['a prototype key', '__proto__.polluted'],
      ['constructor access', 'constructor.name'],
      ['toString access', 'toString'],
    ])('treats %s as missing and returns the key', (_label, key) => {
      expect(translate(ctx('en'), key)).toBe(key);
    });

    it('does not mistake a branch named "other" for a plural map', () => {
      expect(translate(ctx('en'), 'settings')).toBe('settings');
      expect(translate(ctx('en'), 'settings.other.label')).toBe(
        'nested branch named other'
      );
    });

    it('returns the key when the locale has no translation tree', () => {
      expect(translate(ctx('de'), 'deep.a.b.c')).toBe('deep.a.b.c');
    });

    it('returns the key when the locale tree is empty', () => {
      expect(translate(ctx('empty'), 'anything')).toBe('anything');
    });
  });

  describe('fallback behaviour', () => {
    it('does not consult the fallback when the active locale has the key', () => {
      const onMissingKey = jest.fn();
      expect(
        translate(ctx('en', { fallbackLocale: 'fr', onMissingKey }), 'spaced', {
          name: 'A',
        })
      ).toBe('Hi A!');
      expect(onMissingKey).not.toHaveBeenCalled();
    });

    it('works when fallbackLocale equals the active locale', () => {
      expect(translate(ctx('en', { fallbackLocale: 'en' }), 'nope')).toBe(
        'nope'
      );
    });

    it('ignores a fallbackLocale that has no tree', () => {
      expect(translate(ctx('de', { fallbackLocale: 'xx' }), 'nope')).toBe(
        'nope'
      );
    });

    it('reports the ACTIVE locale (not the fallback) to onMissingKey', () => {
      const onMissingKey = jest.fn();
      translate(ctx('fr', { fallbackLocale: 'en', onMissingKey }), 'nope');
      expect(onMissingKey).toHaveBeenCalledTimes(1);
      expect(onMissingKey).toHaveBeenCalledWith('nope', 'fr');
    });

    it('returns defaultValue verbatim (no interpolation)', () => {
      expect(
        translate(ctx('en'), 'nope', { defaultValue: 'Hi {{name}}', name: 'A' })
      ).toBe('Hi {{name}}');
    });
  });

  describe('interpolation', () => {
    it('tolerates whitespace inside the braces', () => {
      expect(translate(ctx('en'), 'spaced', { name: 'Ana' })).toBe('Hi Ana!');
    });

    it('supports dotted token names', () => {
      expect(translate(ctx('en'), 'dotted', { 'user.name': 'Ana' })).toBe(
        'Hi Ana'
      );
    });

    it('replaces every occurrence of a repeated token', () => {
      expect(translate(ctx('en'), 'twice', { n: 7 })).toBe('7 and 7');
    });

    it('interpolates falsy-but-defined values (0 and empty string)', () => {
      expect(translate(ctx('en'), 'mixed', { a: 0, b: '' })).toBe('0-');
    });

    it('leaves only the missing token untouched', () => {
      expect(translate(ctx('en'), 'mixed', { a: 'x' })).toBe('x-{{b}}');
    });

    it('does not interpret regex/replacement specials in values', () => {
      expect(translate(ctx('en'), 'spaced', { name: '$& $1 $$' })).toBe(
        'Hi $& $1 $$!'
      );
    });

    it('ignores extra params that have no placeholder', () => {
      expect(translate(ctx('en'), 'spaced', { name: 'A', extra: 'B' })).toBe(
        'Hi A!'
      );
    });
  });

  describe('pluralization', () => {
    it('uses English rules for en', () => {
      expect(translate(ctx('en'), 'apples', { count: 1 })).toBe('1 apple');
      expect(translate(ctx('en'), 'apples', { count: 2 })).toBe('2 apples');
      expect(translate(ctx('en'), 'apples', { count: 0 })).toBe('0 apples');
    });

    it('uses French rules (0 and 1 are "one")', () => {
      expect(translate(ctx('fr'), 'apples', { count: 0 })).toBe('0 pomme');
      expect(translate(ctx('fr'), 'apples', { count: 1 })).toBe('1 pomme');
      expect(translate(ctx('fr'), 'apples', { count: 2 })).toBe('2 pommes');
    });

    it('uses Hindi rules (0 is "one")', () => {
      expect(translate(ctx('hi'), 'items', { count: 0 })).toBe('एक');
      expect(translate(ctx('hi'), 'items', { count: 5 })).toBe('अन्य');
    });

    it.each([
      [0, 'صفر'],
      [1, 'واحد'],
      [2, 'اثنان'],
      [3, 'قليل'],
      [10, 'قليل'],
      [11, 'كثير'],
      [99, 'كثير'],
      [100, 'آخر'],
    ])('uses all six Arabic buckets (count %i)', (count, expected) => {
      expect(translate(ctx('ar'), 'items', { count })).toBe(expected);
    });

    it('prefers an explicit zero bucket over language rules (Hindi 0 = one)', () => {
      const withZero: TranslationMap = {
        hi: { items: { zero: 'none', one: 'one', other: 'many' } },
      };
      expect(
        translate({ translations: withZero, locale: 'hi' }, 'items', {
          count: 0,
        })
      ).toBe('none');
    });

    it('falls back to "other" when the needed bucket is missing', () => {
      const sparse: TranslationMap = { en: { x: { other: 'o' } } };
      expect(
        translate({ translations: sparse, locale: 'en' }, 'x', { count: 1 })
      ).toBe('o');
    });

    it.each([
      ['negative', -1],
      ['fractional', 1.5],
      ['NaN', NaN],
      ['Infinity', Infinity],
    ])('does not throw for a %s count', (_label, count) => {
      expect(() => translate(ctx('en'), 'apples', { count })).not.toThrow();
    });

    it('treats a missing count as 0', () => {
      expect(translate(ctx('en'), 'apples')).toBe('{{count}} apples');
    });

    it('survives an invalid locale tag for PluralRules', () => {
      const bad: TranslationMap = {
        'not a locale!': { x: { one: '1', other: 'o' } },
      };
      expect(
        translate({ translations: bad, locale: 'not a locale!' }, 'x', {
          count: 1,
        })
      ).toBe('1');
      expect(
        translate({ translations: bad, locale: 'not a locale!' }, 'x', {
          count: 5,
        })
      ).toBe('o');
    });
  });

  describe('invalid input', () => {
    it('throws a TRANSLATION_KEY_NOT_FOUND I18nKitError for an empty key', () => {
      try {
        translate(ctx('en'), '');
        throw new Error('should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(I18nKitError);
        expect((error as I18nKitError).code).toBe('TRANSLATION_KEY_NOT_FOUND');
      }
    });
  });
});

describe('listAvailableLocales - edge cases', () => {
  it('returns an empty array for an empty map', () => {
    expect(listAvailableLocales({})).toEqual([]);
  });

  it('does not mutate the input map', () => {
    const input: TranslationMap = { fr: {}, en: {} };
    listAvailableLocales(input);
    expect(Object.keys(input)).toEqual(['fr', 'en']);
  });
});
