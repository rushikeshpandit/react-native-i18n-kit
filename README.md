# react-native-i18n-kit

**A fully native, zero-dependency localization & internationalization toolkit for React Native.**
TurboModule + Fabric ready. New Architecture first. 16 KB page-size compliant. No third-party native deps — just Kotlin, Swift, and TypeScript.

[![npm version](https://img.shields.io/npm/v/react-native-i18n-kit.svg)](https://www.npmjs.com/package/react-native-i18n-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![New Architecture](https://img.shields.io/badge/Architecture-TurboModules%20%2B%20Fabric-7C3AED)](#)
[![Platforms](https://img.shields.io/badge/platforms-android%20%7C%20ios-lightgrey)](#)

---

## Table of contents

1. [Why this exists](#why-this-exists)
2. [Features](#features)
3. [Platform support](#platform-support)
4. [Installation](#installation)
5. [Quick start](#quick-start)
6. [Examples](#examples)
7. [API reference](#api-reference)
   - [`<LocalizationProvider>`](#localizationprovider)
   - [`useTranslation()`](#usetranslation)
   - [`useDeviceLocale()`](#usedevicelocale)
   - [Standalone functions](#standalone-functions)
   - [Formatting](#formatting)
   - [Locale matching](#locale-matching)
   - [Translation file format](#translation-file-format)
   - [Types](#types)
   - [`I18nKitError` and error codes](#i18nkiterror-and-error-codes)
8. [App-level language override](#app-level-language-override)
9. [Testing your app](#testing-your-app)
10. [Platform limitations](#platform-limitations)
11. [Troubleshooting](#troubleshooting)
12. [Example app](#example-app)
13. [Contributing](#contributing)
14. [License](#license)

---

## Why this exists

Most React Native localization libraries are thin JS wrappers around platform-default behavior or haven't been updated for the New Architecture / Android 15's 16 KB page-size requirement. `react-native-i18n-kit` is built for how a localization module should look today:

- **Fully native.** Locale, calendar, time zone, number-format, and clock/measurement detection is read directly from `android.icu` / `Configuration` on Android and `Foundation.Locale` on iOS — not guessed from JS.
- **Zero third-party dependencies.** No `i18n-js`, no `intl` polyfill, no transitive native SDKs.
- **New Architecture native.** A TurboModule (codegen spec in [`src/NativeI18nKit.ts`](./src/NativeI18nKit.ts)).
- **16 KB page-size compliant.** Ships no prebuilt `.so` binaries of its own.
- **Hooks-first API.** `useTranslation()` and `useDeviceLocale()`.

## Features

| | |
|---|---|
| 🌍 **Device locale detection** | Preferred languages, country, calendar system, time zone, number formatting, 12h/24h clock, metric/imperial |
| 🔁 **Hooks-based language switching** | `useTranslation().setLocale(code)` re-renders your whole tree instantly |
| 🧩 **Pluralization & interpolation** | `{{token}}` interpolation and CLDR plural buckets (`zero`/`one`/`two`/`few`/`many`/`other`) chosen per language |
| 🪞 **RTL-aware** | `isRTL` per locale, with optional automatic `I18nManager.forceRTL` management |
| 📡 **Live system-locale events** | `useDeviceLocale()` re-reads automatically when the user changes the OS language mid-session |
| 🧵 **TypeScript strict mode** | Every public API is fully typed, including translation trees and plural maps |
| 💾 **Remembers the user's language** | `setLocale` is saved natively (SharedPreferences / UserDefaults) and restored on the next launch |
| 🎯 **Smart locale matching** | Case-insensitive, with script/region fallback: `zh-Hans-CN` → `zh-CN` → `zh`, `pt` → `pt-BR`, legacy `iw` → `he` |
| 🔢 **Locale-aware formatting** | `formatNumber`, `formatCurrency`, `formatPercent`, `formatDate`, `formatRelativeTime` — follows the active language and the device's 12/24-hour setting |
| 🛡️ **Typed error handling** | One `I18nKitError` class with stable `.code` values instead of opaque native exceptions |

## Platform support

| | Version |
|---|---|
| React Native | 0.85 (New Architecture). Developed and verified on this version |
| Android | API 29 (Android 10) and newer |
| iOS | 15.1 and newer (the React Native 0.85 minimum) |
| TypeScript | 5.0+ (strict mode recommended) |

Plural selection uses `Intl.PluralRules`, which is available in Hermes on both platforms. If it is missing, the library falls back to English-style rules (`1` → `one`, everything else → `other`).

---

## Installation

```sh
npm install react-native-i18n-kit
# or
yarn add react-native-i18n-kit
```

### iOS

```sh
cd ios && pod install
```

The pod contains Swift and Objective-C++ sources; no extra Xcode configuration is needed (`use_frameworks!` is supported). Rebuild the app after installing.

### Android

No extra steps — autolinking picks the package up on your next build. Requirements:

- `minSdkVersion` 29 or higher.
- Your main activity must be an `AppCompatActivity` (React Native's `ReactActivity` already is). This is what makes `setAppLanguage` apply instantly.
- If you maintain a custom `PackageList`, the package class is `com.i18nkit.I18nKitPackage`.

### New Architecture

Codegen reads [`src/NativeI18nKit.ts`](./src/NativeI18nKit.ts) automatically at build time (`codegenConfig` in `package.json`). Nothing to configure.

### Verify the install

```tsx
import { getDeviceLocale } from 'react-native-i18n-kit';

console.log(getDeviceLocale()); // { languageTag: "en-US", languageCode: "en", countryCode: "US", isRTL: false }
```

If this throws `NATIVE_MODULE_UNAVAILABLE`, see [Troubleshooting](#troubleshooting).

---

## Quick start

**1. Create translation files** (plain nested JSON):

```json
// translations/en.json
{
  "home": {
    "greeting": "Hello, {{name}}!",
    "cart": {
      "zero": "Your cart is empty",
      "one": "1 item in your cart",
      "other": "{{count}} items in your cart"
    }
  }
}
```

```json
// translations/fr.json
{
  "home": {
    "greeting": "Bonjour, {{name}} !",
    "cart": {
      "one": "{{count}} article dans votre panier",
      "other": "{{count}} articles dans votre panier"
    }
  }
}
```

**2. Wrap your app once**, near the root. Keep the `translations` object stable (declare it at module level):

```tsx
import { LocalizationProvider } from 'react-native-i18n-kit';
import en from './translations/en.json';
import fr from './translations/fr.json';

const TRANSLATIONS = { en, fr };

export default function App() {
  return (
    <LocalizationProvider
      translations={TRANSLATIONS}
      defaultLocale="en"
      fallbackLocale="en"
    >
      <RootNavigator />
    </LocalizationProvider>
  );
}
```

**3. Translate anywhere below the provider:**

```tsx
import { Button, Text, View } from 'react-native';
import { useTranslation } from 'react-native-i18n-kit';

function Home() {
  const { t, locale, setLocale } = useTranslation();

  return (
    <View>
      <Text>{t('home.greeting', { name: 'Rushikesh' })}</Text>
      <Text>{t('home.cart', { count: 3 })}</Text>
      <Button
        title={locale === 'en' ? 'Français' : 'English'}
        onPress={() => setLocale(locale === 'en' ? 'fr' : 'en')}
      />
    </View>
  );
}
```

On first launch the provider picks the device language if you ship it, otherwise `defaultLocale`.

---

## Examples

### Interpolation

```tsx
// "Hello, {{name}}!"
t('home.greeting', { name: 'Ana' }); // "Hello, Ana!"
t('home.greeting');                   // "Hello, {{name}}!"  (missing params stay visible)
t('home.greeting', { name: 0 });      // "Hello, 0!"         (0 and "" are valid values)
```

### Pluralization

```tsx
// en: { "zero": "No items", "one": "1 item", "other": "{{count}} items" }
t('items', { count: 0 }); // "No items"       (an explicit "zero" bucket always wins for 0)
t('items', { count: 1 }); // "1 item"
t('items', { count: 5 }); // "5 items"
```

Buckets follow the CLDR rules of the active language, so Arabic uses all six (`zero`, `one`, `two`, `few`, `many`, `other`), French treats 0 and 1 as `one`, and Hindi treats 0 and 1 as `one`. A missing bucket falls back to `other` (which is mandatory in a plural map).

### Fallback and missing keys

```tsx
<LocalizationProvider translations={TRANSLATIONS} defaultLocale="en" fallbackLocale="en">

t('only.in.english');                          // active "fr" → falls back to the "en" text
t('does.not.exist');                           // "does.not.exist"  (the key itself, never a crash)
t('does.not.exist', { defaultValue: 'N/A' });  // "N/A"
```

In development, each missing key is logged once per locale with `console.warn`.

### Language picker

```tsx
function LanguagePicker() {
  const { locale, setLocale, availableLocales } = useTranslation();

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {availableLocales.map((code) => (
        <Pressable key={code} onPress={() => setLocale(code)}>
          <Text style={{ fontWeight: code === locale ? '700' : '400' }}>{code}</Text>
        </Pressable>
      ))}
    </View>
  );
}
```

### Right-to-left layouts

```tsx
function Screen() {
  const { isRTL } = useTranslation();
  return <ScrollView style={{ direction: isRTL ? 'rtl' : 'ltr' }}>{/* ... */}</ScrollView>;
}
```

`isRTL` updates immediately. The native layout direction only changes after a reload — see [Platform limitations](#platform-limitations).

### Remembering the user's language

By default the choice made with `setLocale` is saved on the device and restored on the next launch (it takes priority over the device language). Use `resetLocale()` to forget it and follow the device language again:

```tsx
const { setLocale, resetLocale } = useTranslation();

await setLocale('fr');     // saved → the app starts in French next time
await resetLocale();       // forgets the choice → device language (or defaultLocale)
```

Pass `persistLocale={false}` to the provider to turn this off. A saved locale that is no longer shipped is ignored. Saving and restoring never throw: a storage failure just means the choice isn't remembered.

### Asking the user to restart after an RTL change

```tsx
<LocalizationProvider
  translations={TRANSLATIONS}
  defaultLocale="en"
  onRTLReloadRequired={(isRTL) =>
    Alert.alert('Restart required', 'Reopen the app to apply the new layout direction.')
  }
>
```

The callback fires only when a locale change (including the restored one at start-up) flips the layout direction.

### Formatting numbers, currency, dates and relative time

```tsx
const { formatNumber, formatCurrency, formatPercent, formatDate, formatRelativeTime } = useTranslation();

formatNumber(1234567.891);                    // en: "1,234,567.891"  fr: "1 234 567,891"
formatCurrency(1234.5, 'USD');                // en: "$1,234.50"
formatPercent(0.256, { maximumFractionDigits: 1 }); // "25.6%"
formatDate(new Date(), { dateStyle: 'long' });
formatDate(new Date(), { hour: 'numeric', minute: '2-digit' }); // follows the device 12/24-hour setting
formatRelativeTime(-3, 'day', { numeric: 'auto' });  // "3 days ago"
```

### Reading device settings

```tsx
function DeviceInfo() {
  const { country, timeZone, numberFormatSettings, uses24HourClock, usesMetricSystem } =
    useDeviceLocale();

  return (
    <Text>
      {country} · {timeZone} · decimal "{numberFormatSettings.decimalSeparator}" ·{' '}
      {uses24HourClock ? '24h' : '12h'} · {usesMetricSystem ? 'metric' : 'imperial'}
    </Text>
  );
}
```

The hook re-renders when the user changes the system language while the app is running.

### Outside React components

```ts
import { getDeviceLocale, getTimeZone, isRTLForLanguage } from 'react-native-i18n-kit';

const { languageCode } = getDeviceLocale();
const rtl = isRTLForLanguage('ar'); // true
```

### Following the device language natively too

`setLocale` only switches the JS string tables. To make OS-rendered UI (date pickers, system alerts, share sheets) follow your in-app choice as well, also call `setAppLanguage`:

```tsx
async function changeLanguage(code: string) {
  await setLocale(code);
  const appliedNow = await setAppLanguage(code);
  if (!appliedNow) {
    // iOS: stored for the next launch
  }
}
```

### Handling errors

```tsx
import { I18nKitError, setAppLanguage } from 'react-native-i18n-kit';

try {
  await setAppLanguage('   ');
} catch (err) {
  if (err instanceof I18nKitError && err.code === 'INVALID_LOCALE') {
    // show a validation message
  }
}
```

---

## API reference

### `<LocalizationProvider>`

Mount once near the root. Makes `useTranslation()` and `useDeviceLocale()` available below it.

| Prop | Type | Required | Description |
|---|---|---|---|
| `translations` | `Record<string, TranslationTree>` | ✅ | Full translation map keyed by locale code. Keep its identity stable. |
| `defaultLocale` | `string` | ✅ | Starting locale when device detection is off or finds no match. Warns in dev if it has no entry in `translations`. |
| `fallbackLocale` | `string` | ❌ | Locale consulted when a key is missing in the active locale. |
| `autoDetectDeviceLocale` | `boolean` (default `true`) | ❌ | Start from the first device-preferred language you ship (exact tag such as `pt-BR` preferred over `pt`). |
| `manageRTL` | `boolean` (default `true`) | ❌ | Call `I18nManager.forceRTL` when the direction changes. |
| `persistLocale` | `boolean` (default `true`) | ❌ | Save the `setLocale` choice natively and restore it on the next launch (priority: saved choice → device language → `defaultLocale`). |
| `onRTLReloadRequired` | `(isRTL: boolean) => void` | ❌ | Called when a locale change flips the layout direction, so you can ask the user to restart. |
| `children` | `ReactNode` | ✅ | Your app. |

**Returns:** a React element. **Never throws** during start-up: if the native module is unavailable it falls back to `defaultLocale`.

### `useTranslation()`

```ts
const { t, locale, setLocale, availableLocales, isRTL } = useTranslation();
```

| Member | Type | Description |
|---|---|---|
| `t` | `(key: string, options?: TranslateOptions) => string` | Resolves a key with interpolation and pluralization. Stable between renders until `translations`, locale or `fallbackLocale` change. |
| `locale` | `string` | Active locale code. |
| `setLocale` | `(locale: string) => Promise<void>` | Switches the active locale (matched case-insensitively with script/region fallback), updates RTL state and saves the choice. |
| `resetLocale` | `() => Promise<void>` | Forgets the saved choice and returns to the device language (or `defaultLocale`). |
| `formatNumber`, `formatCurrency`, `formatPercent`, `formatDate`, `formatRelativeTime` | see [Formatting](#formatting) | Formatters bound to the active locale. |
| `availableLocales` | `string[]` | Sorted locale codes present in `translations`. |
| `isRTL` | `boolean` | Whether the active locale is right-to-left. |

**Errors**

- `t('')` throws `TRANSLATION_KEY_NOT_FOUND`.
- `setLocale('')`, `setLocale('   ')` and non-string input reject with `INVALID_LOCALE`; the locale is unchanged.
- Calling the hook outside a provider throws `PROVIDER_NOT_FOUND`.
- `setLocale('xx')` for a locale you don't ship is allowed; it warns in dev and lookups use the fallback.

`t` options:

```ts
type TranslateOptions = {
  [placeholder: string]: string | number | undefined; // values for {{placeholder}}
  count?: number;        // selects a plural bucket (missing count is treated as 0)
  defaultValue?: string; // returned verbatim when the key is missing everywhere
};
```

Key lookup is a dot path (`"home.cart"`). A path that stops at a branch, runs through a string, or is missing resolves as "not found".

### `useDeviceLocale()`

Read-only OS-level locale info — independent of which language your UI currently shows.

```ts
const {
  locale,               // LocaleInfo — most-preferred device locale
  locales,              // LocaleInfo[] — all preferred locales, in order
  country,              // "IN"
  calendar,             // "gregorian"
  timeZone,             // "Asia/Kolkata"
  numberFormatSettings, // { decimalSeparator: ".", groupingSeparator: "," }
  uses24HourClock,      // boolean
  usesMetricSystem,     // boolean
} = useDeviceLocale();
```

**Returns:** a `DeviceLocaleSnapshot`. A new snapshot is produced when the system locale changes (Android `ACTION_LOCALE_CHANGED`, iOS `NSCurrentLocaleDidChangeNotification`).

**Errors:** throws an `I18nKitError` on first render if the native module cannot be read. A failed *refresh* keeps the last good snapshot.

### Standalone functions

Usable anywhere (sagas, utilities, before the provider mounts). All are synchronous except `setAppLanguage`.

```ts
import {
  getDeviceLocale, getDeviceLocales, getCountry, getCalendar, getTimeZone,
  getNumberFormatSettings, uses24HourClock, usesMetricSystem,
  isRTLForLanguage, setAppLanguage, getAppLanguage,
} from 'react-native-i18n-kit';
```

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getDeviceLocale()` | — | `LocaleInfo` | Most-preferred device locale. |
| `getDeviceLocales()` | — | `LocaleInfo[]` | All preferred device locales, most preferred first (never empty). |
| `getCountry()` | — | `string` | ISO 3166-1 alpha-2 country code, e.g. `"IN"` (`""` if unknown). |
| `getCalendar()` | — | `string` | Calendar identifier, e.g. `"gregorian"`, `"islamic"`, `"japanese"`, `"buddhist"`. |
| `getTimeZone()` | — | `string` | IANA time zone, e.g. `"Asia/Kolkata"`. |
| `getNumberFormatSettings()` | — | `NumberFormatSettings` | `{ decimalSeparator, groupingSeparator }` of the active numeric locale. |
| `uses24HourClock()` | — | `boolean` | `true` for a 24-hour clock. |
| `usesMetricSystem()` | — | `boolean` | `true` for metric. |
| `isRTLForLanguage(code)` | `code: string` — BCP-47 language code | `boolean` | Writing direction for **any** language, not just the active one. |
| `setAppLanguage(tag)` | `tag: string` — BCP-47 tag | `Promise<boolean>` | App-only language override. See [below](#app-level-language-override). |
| `getAppLanguage()` | — | `string` | Currently applied override, or `""`. |
| `getSavedLocale()` | — | `string` | Locale the user saved with `setLocale`/`saveLocale`, or `""`. |
| `saveLocale(locale)` | `locale: string` | `void` | Saves a locale natively (SharedPreferences / UserDefaults). Synchronous: `getSavedLocale()` sees it immediately. Blank values throw `INVALID_LOCALE`. |
| `clearSavedLocale()` | — | `void` | Removes the saved locale. |

**Throws / rejects** (all functions): `UNSUPPORTED_PLATFORM` (not iOS/Android), `NATIVE_MODULE_UNAVAILABLE` (not linked), `NATIVE_CALL_FAILED` (native failure; original error in `.cause`).
Additionally, `isRTLForLanguage`, `setAppLanguage` and `saveLocale` reject empty, whitespace-only and non-string arguments with `INVALID_LOCALE` **before** calling native code.

### Formatting

`useTranslation()` exposes formatters bound to the active locale. Outside components use `createFormatters(locale, config?)`, which returns the same five functions.

| Function | Parameters | Returns |
|---|---|---|
| `formatNumber(value, options?)` | finite `number`, `Intl.NumberFormatOptions` | `"1,234.5"` |
| `formatCurrency(value, currency, options?)` | finite `number`, ISO 4217 code (`"USD"`), options | `"$1,234.50"` |
| `formatPercent(value, options?)` | finite fraction (`0.256` = 25.6%), options | `"26%"` |
| `formatDate(value, options?)` | `Date` or millisecond timestamp, `Intl.DateTimeFormatOptions` (default: medium date) | `"Jan 15, 2024"` |
| `formatRelativeTime(value, unit, options?)` | finite `number` (negative = past), unit (`"day"`, `"hour"`, …), `Intl.RelativeTimeFormatOptions` | `"3 days ago"` |

- Times follow the device's 12/24-hour setting unless you pass `hour12` or `hourCycle`.
- Implemented with `Intl`. **Hermes does not ship `Intl.RelativeTimeFormat`**, so `formatRelativeTime` automatically uses the platform's own formatter (Android ICU `RelativeDateTimeFormatter`, iOS `RelativeDateTimeFormatter`) when `Intl` has none. The native path rounds fractional values to whole units on iOS. `createFormatters` is wired this way by default; pass `relativeTimeFallback` / `uses24HourClock` in its config to override.
- If `Intl` itself is missing, the functions throw `INTL_UNAVAILABLE`.
- Invalid input (NaN, Infinity, strings, invalid dates, bad currency codes or units) throws `INVALID_ARGUMENT` instead of printing `NaN`.
- An unknown locale tag falls back to the runtime default locale.

### Locale matching

The same matcher is used for the device language, the saved choice and `setLocale`. It is case-insensitive, treats `_` as `-`, and tries the full tag, then language-script, language-region and language; finally a sibling region of the same language. Legacy codes `iw`/`in`/`ji` map to `he`/`id`/`yi`.

| Requested | Shipped | Result |
|---|---|---|
| `zh-Hans-CN` | `zh-CN` | `zh-CN` |
| `FR-ca` | `fr` | `fr` |
| `pt` | `pt-BR`, `pt-PT` | `pt-BR` (first in sorted order) |
| `de` | `en`, `fr` | no match → `defaultLocale` |

The helpers are exported if you need them: `matchLocale(requested, available)`, `matchFirstLocale(requestedList, available)` and `normalizeTag(tag)`.

### Translation file format

```ts
type TranslationValue = string | PluralMap;

interface PluralMap {
  zero?: string; one?: string; two?: string; few?: string; many?: string;
  other: string; // mandatory
}

interface TranslationTree {
  [key: string]: TranslationValue | TranslationTree;
}
```

- Placeholders use `{{name}}` (whitespace allowed: `{{ name }}`; dotted names such as `{{user.name}}` match a param literally named `user.name`).
- A node is treated as a plural map only if it has a **string** `other` property, so a branch that happens to contain a child called `other` is still a branch.
- Locale codes are used exactly as written (`"en"`, `"pt-BR"`); matching with the device language is case-sensitive.

### Types

```ts
interface LocaleInfo {
  languageTag: string;  // "en-US"
  languageCode: string; // "en" (modern ISO 639 code, e.g. "he" not "iw")
  countryCode: string;  // "US" ("" when the locale has no region)
  isRTL: boolean;
}

interface NumberFormatSettings {
  decimalSeparator: string;
  groupingSeparator: string;
}
```

Also exported: `TranslationTree`, `TranslationMap`, `TranslationValue`, `PluralMap`, `TranslateOptions`, `TFunction`, `InterpolationParams`, `LocalizationProviderProps`, `UseTranslationResult`, `DeviceLocaleSnapshot`, `I18nKitErrorCode`.

### `I18nKitError` and error codes

Every error thrown or rejected by this library is an `I18nKitError` (`instanceof Error`) with a stable `code`, a readable `message`, and the original error in `cause` when one exists.

| Code | When |
|---|---|
| `NATIVE_MODULE_UNAVAILABLE` | The native module isn't linked (missing `pod install` / rebuild). Raised on first use, never at import time. |
| `UNSUPPORTED_PLATFORM` | Called on a platform other than iOS/Android (e.g. web). |
| `INVALID_LOCALE` | An empty, whitespace-only or non-string locale/language was passed. |
| `TRANSLATION_KEY_NOT_FOUND` | `t()` was called with an empty key. (Unknown non-empty keys do **not** throw; they return the key.) |
| `PROVIDER_NOT_FOUND` | A hook was used outside `<LocalizationProvider>`. |
| `NATIVE_CALL_FAILED` | An unexpected native-side exception occurred. |
| `INVALID_ARGUMENT` | A formatter received an invalid value, currency code, unit, date or options. |
| `INTL_UNAVAILABLE` | A formatter was called in a JavaScript runtime without `Intl`. |
| `MISSING_TRANSLATION_TREE` | Reserved; not currently thrown. |

---

## App-level language override

`setAppLanguage` changes the OS-recognized language **for this app only** (not system-wide):

- **Android:** applied immediately via `AppCompatDelegate.setApplicationLocales` on the main thread — resolves `true`, no restart.
- **iOS:** persisted via `UserDefaults["AppleLanguages"]` for the **next launch** — resolves `false` to signal a restart is required. iOS has no public API for a live, app-scoped language change.

For most apps `useTranslation().setLocale()` is all you need; it works instantly and identically on both platforms. Use `setAppLanguage` only if OS-rendered strings must follow your in-app language.

---

## Testing your app

The package's `exports` map exposes only the root entry, so mock the native module where it is looked up — `TurboModuleRegistry` — before the library is imported:

```ts
// jest.setup.ts (listed in jest `setupFiles`)
import { TurboModuleRegistry } from 'react-native';

const locale = { languageTag: 'en-US', languageCode: 'en', countryCode: 'US', isRTL: false };

const fakeI18nKit = {
  getDeviceLocales: () => [locale],
  getDeviceLocale: () => locale,
  getCountry: () => 'US',
  getCalendar: () => 'gregorian',
  getTimeZone: () => 'UTC',
  getNumberFormatSettings: () => ({ decimalSeparator: '.', groupingSeparator: ',' }),
  uses24HourClock: () => true,
  usesMetricSystem: () => true,
  isRTLForLanguage: (code: string) => ['ar', 'he'].includes(code),
  setAppLanguage: async () => true,
  getAppLanguage: () => '',
  getSavedLocale: () => '',
  saveLocale: () => {},
  clearSavedLocale: () => {},
  addListener: () => {},
  removeListeners: () => {},
};

jest
  .spyOn(TurboModuleRegistry, 'get')
  .mockImplementation(((name: string) => (name === 'I18nKit' ? fakeI18nKit : null)) as never);
```

If you only test components that use `useTranslation()`, no mock is needed: render with `autoDetectDeviceLocale={false}` and `manageRTL={false}` and the provider never touches native code.

This repository's own suite (`yarn test`) has complete examples in [`src/__tests__`](./src/__tests__) — including this recipe in `consumerMocking.test.tsx` — and a reusable mock in [`jest/nativeMock.ts`](./jest/nativeMock.ts).

---

## Platform limitations

- **iOS app-language override requires a restart.** `setAppLanguage` persists the preference for next launch only. `setLocale` is unaffected and works live on both platforms.
- **RTL layout changes require a JS bundle reload.** `I18nManager.forceRTL` (called automatically when `manageRTL` is `true`) takes visual effect only after React Native reloads. Use `onRTLReloadRequired` to ask the user to restart. `isRTL` itself updates immediately, and because the chosen language is saved, the restarted app comes back in the right direction.
- **Android `usesMetricSystem()` follows ICU data.** It reads ICU's measurement system for the device locale, which includes the regional preference Android 14+ adds to the locale. If the locale has no region, it falls back to the countries that officially use imperial/US customary units (US, Liberia, Myanmar). iOS uses `Locale.usesMetricSystem`.
- **Formatting relies on `Intl`.** Hermes provides number, date and plural formatting on both platforms (relative time uses the native fallback described above). Output can differ slightly from Node/Chrome depending on the platform's ICU version.
- **Legacy language codes are normalized on Android.** `iw`, `in` and `ji` are reported as `he`, `id` and `yi` so they match the translation files you ship.
- **Emulators don't always reflect real device locale lists.** Test multi-locale ordering through the OS language settings.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `NATIVE_MODULE_UNAVAILABLE` | iOS: run `pod install` and rebuild. Android: rebuild the app (a Metro reload is not enough). |
| iOS build error `This file must be compiled as Obj-C++` | Update to the latest version; the public header is guarded for Swift module builds. |
| `UNSUPPORTED_PLATFORM` on web | The library is native-only; guard calls with `Platform.OS`. |
| Language chip tapped but layout didn't flip | Expected for RTL — restart the app (see limitations). |
| `t('key')` prints the key | Check the key path and that the active (or fallback) locale contains it; dev builds log the missing key. |
| Plural form looks wrong | Verify the bucket exists for the active language (Arabic needs `two`/`few`/`many`); a missing bucket uses `other`. |
| React Native `SafeAreaView` deprecation toast in the example | Fixed by using `react-native-safe-area-context` (already done in `/example`). |

---

## Example app

[`/example`](./example) is a complete, runnable reference: a language picker, live device-locale card and a pluralized counter in English, French, Arabic (RTL) and Hindi, plus an **API Explorer** that calls every API on the device — including the expected-failure paths — and reports PASS/FAIL per call.

```sh
yarn install
yarn example start          # Metro
yarn example ios            # or: yarn example android
```

(On iOS run `cd example/ios && pod install` the first time.)

---

## Contributing

PRs, issues, and feature requests are welcome.

1. Fork the repo and clone it
2. `yarn install` at the root
3. Kotlin lives in `/android`, Swift/Objective-C++ in `/ios`, TypeScript in `/src`
4. Run the checks: `yarn test && yarn typecheck && yarn lint` (and the Android unit tests with `cd example/android && ./gradlew :react-native-i18n-kit:testDebugUnitTest`)
5. Use [Conventional Commits](https://www.conventionalcommits.org/) and open a PR describing the change and, for native changes, which devices/emulators you tested on

Please open an issue before starting anything larger than a small fix. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the full guide.

---

## License

MIT © [Rushikesh Pandit](https://github.com/rushikeshpandit)
