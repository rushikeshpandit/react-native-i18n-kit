import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LocalizationProvider } from 'react-native-i18n-kit';
import { HomeScreen } from './src/screens/HomeScreen';
import en from './src/translations/en.json';
import fr from './src/translations/fr.json';
import ar from './src/translations/ar.json';
import hi from './src/translations/hi.json';

/** Every translation the example ships. Declared once so the object identity is stable across renders. */
const TRANSLATIONS = { en, fr, ar, hi };

/**
 * Root component of the example app.
 *
 * Mount `LocalizationProvider` once near the root of your app — every
 * `useTranslation()` / `useDeviceLocale()` call anywhere below it shares
 * this single source of truth for the active locale. `SafeAreaProvider`
 * supplies the insets used by `SafeAreaView`.
 *
 * @returns The fully wired example application tree.
 */
export default function App(): React.ReactElement {
  return (
    <SafeAreaProvider>
      <LocalizationProvider
        translations={TRANSLATIONS}
        defaultLocale="en"
        fallbackLocale="en"
        autoDetectDeviceLocale
        manageRTL
      >
        <SafeAreaView style={styles.flex}>
          <StatusBar barStyle="dark-content" />
          <HomeScreen />
        </SafeAreaView>
      </LocalizationProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFFFFF' },
});
