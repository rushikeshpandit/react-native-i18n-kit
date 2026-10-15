import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-native-i18n-kit';

/** Human-readable labels for the codes we ship translations for. Kept here
 * (not in the translation files) since these are *names of languages*,
 * conventionally shown in their own language regardless of the active locale. */
const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  fr: 'Français',
  ar: 'العربية',
  hi: 'हिन्दी',
};

/**
 * Renders one tappable chip per available locale. Tapping a chip calls
 * `setLocale`, which immediately re-renders every `t()` call in the tree
 * and updates `isRTL` — demonstrating the library's core "switch the
 * language via a hook" requirement end-to-end.
 *
 * @returns A wrapping row of language chips; the active one is highlighted.
 */
export function LanguageSelector(): React.ReactElement {
  const { locale, setLocale, availableLocales } = useTranslation();

  return (
    <View style={styles.row}>
      {availableLocales.map((code) => {
        const isActive = code === locale;
        return (
          <Pressable
            key={code}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => {
              setLocale(code).catch((error) => {
                // setLocale rejects only for programmer errors (e.g. an
                // empty string) — surfacing it here keeps the failure
                // visible during development instead of swallowing it.
                console.warn('Failed to switch locale:', error);
              });
            }}
            style={[styles.chip, isActive && styles.chipActive]}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {LANGUAGE_LABELS[code] ?? code}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    backgroundColor: '#1B6B5A',
    borderColor: '#1B6B5A',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#344054',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
});
