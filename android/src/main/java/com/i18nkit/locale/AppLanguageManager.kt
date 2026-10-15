package com.i18nkit.locale

import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat

/**
 * Single-responsibility: applies and reads the app-scoped (not
 * system-wide) language override.
 *
 * Uses `AppCompatDelegate.setApplicationLocales`, which is the
 * AndroidX-recommended replacement for manually recreating Activities
 * with a patched `Configuration`. It is backed natively by the
 * platform "Per-app language preferences" API on Android 13+ (API 33)
 * and transparently falls back to an AppCompat-managed override on
 * API 29–32, applying immediately without requiring a process restart.
 *
 * Both methods must be called on the main thread.
 */
class AppLanguageManager {

    /**
     * Applies [languageTag] as the app's locale override.
     *
     * @param languageTag a BCP-47 tag such as "fr" or "pt-BR".
     * @return always `true` — Android applies the change immediately, unlike iOS.
     */
    fun setAppLanguage(languageTag: String): Boolean {
        val localeList = LocaleListCompat.forLanguageTags(languageTag)
        AppCompatDelegate.setApplicationLocales(localeList)
        return true
    }

    /**
     * Reads the currently applied override.
     *
     * @return the first override locale as a BCP-47 tag, or "" if none has been set.
     */
    fun getAppLanguage(): String {
        val applied = AppCompatDelegate.getApplicationLocales()
        return if (applied.isEmpty) "" else applied.get(0)?.toLanguageTag() ?: ""
    }
}
