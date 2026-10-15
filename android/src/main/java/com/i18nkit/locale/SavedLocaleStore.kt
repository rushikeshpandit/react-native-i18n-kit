package com.i18nkit.locale

import android.content.Context

/**
 * Single-responsibility: persist the locale the user picked inside the app so
 * it can be restored on the next launch. Backed by a private
 * `SharedPreferences` file owned by this library.
 *
 * @property context any [Context]; the application context is used for storage.
 */
class SavedLocaleStore(context: Context) {

    private val preferences =
        context.applicationContext.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    /**
     * Reads the saved locale.
     *
     * @return the saved locale code, or "" when nothing was saved.
     */
    fun get(): String = preferences.getString(KEY_LOCALE, "") ?: ""

    /**
     * Saves [locale], replacing any previous value.
     *
     * @param locale a non-blank locale code such as "fr".
     * @throws IllegalArgumentException if [locale] is blank.
     */
    fun save(locale: String) {
        require(locale.isNotBlank()) { "locale must not be blank" }
        preferences.edit().putString(KEY_LOCALE, locale).apply()
    }

    /** Removes the saved locale; a no-op when none was saved. */
    fun clear() {
        preferences.edit().remove(KEY_LOCALE).apply()
    }

    private companion object {
        const val PREFERENCES_NAME = "react_native_i18n_kit"
        const val KEY_LOCALE = "saved_locale"
    }
}
