import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  I18nKitError,
  getAppLanguage,
  getCalendar,
  getCountry,
  getDeviceLocale,
  getDeviceLocales,
  getNumberFormatSettings,
  getTimeZone,
  isRTLForLanguage,
  setAppLanguage,
  uses24HourClock,
  usesMetricSystem,
} from 'react-native-i18n-kit';

type Check = {
  /** API under test, shown as the row title. */
  name: string;
  /** Runs the API and returns a displayable value; throws if the expectation fails. */
  run: () => unknown | Promise<unknown>;
};

type Outcome = { name: string; ok: boolean; detail: string };

/**
 * Throws when an expectation does not hold.
 *
 * @param condition - Value expected to be truthy.
 * @param message - Failure description shown in the row.
 * @throws {Error} When `condition` is falsy.
 */
const assert = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(message);
};

/**
 * Type guard for strings.
 *
 * @param v - Any value.
 * @returns `true` when `v` is a string.
 */
const isString = (v: unknown): v is string => typeof v === 'string';

/**
 * Asserts that `fn` fails with an I18nKitError carrying `code`.
 *
 * @param fn - Call expected to throw or reject.
 * @param code - Expected {@link I18nKitError} code.
 * @returns A short success description.
 * @throws {Error} When `fn` succeeds, or fails with a different error/code.
 */
const expectI18nKitError = async (
  fn: () => unknown | Promise<unknown>,
  code: string
): Promise<string> => {
  try {
    await fn();
  } catch (error) {
    assert(
      error instanceof I18nKitError,
      `expected I18nKitError, got ${error}`
    );
    assert(
      (error as I18nKitError).code === code,
      `expected code ${code}, got ${(error as I18nKitError).code}`
    );
    return `rejected with ${code}`;
  }
  throw new Error(`expected ${code} but the call succeeded`);
};

const CHECKS: Check[] = [
  {
    name: 'getDeviceLocales()',
    run: () => {
      const locales = getDeviceLocales();
      assert(Array.isArray(locales) && locales.length > 0, 'empty list');
      locales.forEach((l) => {
        assert(
          isString(l.languageTag) && l.languageTag.length > 0,
          'languageTag'
        );
        assert(
          isString(l.languageCode) && l.languageCode.length > 0,
          'languageCode'
        );
        assert(isString(l.countryCode), 'countryCode');
        assert(typeof l.isRTL === 'boolean', 'isRTL');
      });
      return locales.map((l) => l.languageTag).join(', ');
    },
  },
  {
    name: 'getDeviceLocale()',
    run: () => {
      const locale = getDeviceLocale();
      assert(
        isString(locale.languageTag) && locale.languageTag.length > 0,
        'languageTag'
      );
      assert(
        getDeviceLocales()[0]?.languageTag === locale.languageTag,
        'must equal locales[0]'
      );
      return JSON.stringify(locale);
    },
  },
  {
    name: 'getCountry()',
    run: () => {
      const country = getCountry();
      assert(/^[A-Z]{2}$|^$/.test(country), `unexpected "${country}"`);
      return country || '(empty)';
    },
  },
  {
    name: 'getCalendar()',
    run: () => {
      const calendar = getCalendar();
      assert(isString(calendar) && calendar.length > 0, 'empty calendar');
      return calendar;
    },
  },
  {
    name: 'getTimeZone()',
    run: () => {
      const tz = getTimeZone();
      assert(
        /^[A-Za-z_]+(\/[A-Za-z_+\-0-9]+)*$|^GMT|^UTC/.test(tz),
        `unexpected "${tz}"`
      );
      return tz;
    },
  },
  {
    name: 'getNumberFormatSettings()',
    run: () => {
      const s = getNumberFormatSettings();
      assert(
        isString(s.decimalSeparator) && s.decimalSeparator.length > 0,
        'decimal'
      );
      assert(isString(s.groupingSeparator), 'grouping');
      assert(
        s.decimalSeparator !== s.groupingSeparator,
        'separators must differ'
      );
      return `decimal "${s.decimalSeparator}" grouping "${s.groupingSeparator}"`;
    },
  },
  {
    name: 'uses24HourClock()',
    run: () => {
      const v = uses24HourClock();
      assert(typeof v === 'boolean', 'not a boolean');
      return String(v);
    },
  },
  {
    name: 'usesMetricSystem()',
    run: () => {
      const v = usesMetricSystem();
      assert(typeof v === 'boolean', 'not a boolean');
      return String(v);
    },
  },
  {
    name: "isRTLForLanguage('ar') → true",
    run: () => {
      assert(isRTLForLanguage('ar') === true, 'ar must be RTL');
      return 'true';
    },
  },
  {
    name: "isRTLForLanguage('he') → true",
    run: () => {
      assert(isRTLForLanguage('he') === true, 'he must be RTL');
      return 'true';
    },
  },
  {
    name: "isRTLForLanguage('en') → false",
    run: () => {
      assert(isRTLForLanguage('en') === false, 'en must be LTR');
      return 'false';
    },
  },
  {
    name: "isRTLForLanguage('hi') → false",
    run: () => {
      assert(isRTLForLanguage('hi') === false, 'hi must be LTR');
      return 'false';
    },
  },
  {
    name: "isRTLForLanguage('') → INVALID_LOCALE",
    run: () => expectI18nKitError(() => isRTLForLanguage(''), 'INVALID_LOCALE'),
  },
  {
    name: 'setAppLanguage(current) + getAppLanguage()',
    run: async () => {
      // Re-applies the language the device already uses, so running this
      // never changes the app's visible language.
      const tag = getDeviceLocale().languageTag;
      const appliedImmediately = await setAppLanguage(tag);
      assert(
        typeof appliedImmediately === 'boolean',
        'resolve value must be boolean'
      );
      const stored = getAppLanguage();
      assert(
        stored.toLowerCase().replace('_', '-') === tag.toLowerCase(),
        `stored "${stored}" !== "${tag}"`
      );
      return `applied immediately: ${appliedImmediately}, stored: ${stored}`;
    },
  },
  {
    name: "isRTLForLanguage('   ') → INVALID_LOCALE",
    run: () =>
      expectI18nKitError(() => isRTLForLanguage('   '), 'INVALID_LOCALE'),
  },
  {
    name: "setAppLanguage('   ') → INVALID_LOCALE",
    run: () =>
      expectI18nKitError(() => setAppLanguage('   '), 'INVALID_LOCALE'),
  },
  {
    name: "setAppLanguage('') → INVALID_LOCALE",
    run: () => expectI18nKitError(() => setAppLanguage(''), 'INVALID_LOCALE'),
  },
];

/**
 * Runs every check sequentially, converting thrown errors into FAIL rows.
 *
 * @returns One {@link Outcome} per entry of `CHECKS`, in order.
 */
async function runChecks(): Promise<Outcome[]> {
  const outcomes: Outcome[] = [];
  for (const check of CHECKS) {
    try {
      const value = await check.run();
      outcomes.push({ name: check.name, ok: true, detail: String(value) });
    } catch (error) {
      outcomes.push({
        name: check.name,
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return outcomes;
}

/**
 * Exercises every public native API of the library on the real device and
 * reports PASS/FAIL per call, including the expected-failure paths. Runs
 * automatically on mount; tap "Run again" to repeat.
 *
 * @returns The explorer card with a PASS/FAIL summary and one row per check.
 */
export function ApiExplorer(): React.ReactElement {
  const [outcomes, setOutcomes] = useState<Outcome[] | null>(null);

  /** Clears the results and re-runs every check. */
  const run = useCallback(() => {
    setOutcomes(null);
    runChecks().then(setOutcomes);
  }, []);

  useEffect(run, [run]);

  const passed = outcomes?.filter((o) => o.ok).length ?? 0;
  const total = CHECKS.length;
  const allGreen = outcomes !== null && passed === total;

  return (
    <View style={styles.container} testID="api-explorer">
      <View style={styles.header}>
        <Text style={styles.title}>API Explorer</Text>
        <Pressable accessibilityRole="button" onPress={run} testID="api-rerun">
          <Text style={styles.rerun}>Run again</Text>
        </Pressable>
      </View>
      <Text
        style={[styles.summary, allGreen ? styles.pass : styles.fail]}
        testID="api-summary"
      >
        {outcomes === null
          ? 'Running…'
          : `${passed}/${total} passed${allGreen ? ' ✅' : ' ❌'}`}
      </Text>
      {outcomes?.map((o) => (
        <View key={o.name} style={styles.row} testID={`api-row-${o.name}`}>
          <Text style={[styles.status, o.ok ? styles.pass : styles.fail]}>
            {o.ok ? 'PASS' : 'FAIL'}
          </Text>
          <View style={styles.rowBody}>
            <Text style={styles.name}>{o.name}</Text>
            <Text style={styles.detail} numberOfLines={3}>
              {o.detail}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    gap: 10,
    width: '100%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '700', color: '#101828' },
  rerun: { color: '#1B6B5A', fontWeight: '700', fontSize: 13 },
  summary: { fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10 },
  rowBody: { flex: 1 },
  status: { fontSize: 12, fontWeight: '800', width: 36 },
  name: { fontSize: 13, fontWeight: '600', color: '#101828' },
  detail: { fontSize: 12, color: '#667085' },
  pass: { color: '#067647' },
  fail: { color: '#B42318' },
});
