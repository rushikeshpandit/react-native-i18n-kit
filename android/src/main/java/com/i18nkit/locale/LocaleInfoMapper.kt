package com.i18nkit.locale

import androidx.core.text.TextUtilsCompat
import androidx.core.view.ViewCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import java.util.Locale

/**
 * Single-responsibility: convert a [Locale] into the plain map shape
 * defined by `NativeLocaleInfo` on the TypeScript side. Kept separate
 * from [DeviceLocaleProvider] so the mapping logic is independently
 * unit-testable without touching Android's Configuration APIs.
 */
object LocaleInfoMapper {

    /**
     * Legacy ISO 639 codes that `java.util.Locale.getLanguage()` may still
     * return, mapped to the modern codes apps ship translations under.
     */
    private val LEGACY_LANGUAGE_CODES = mapOf("iw" to "he", "in" to "id", "ji" to "yi")

    /**
     * Normalizes a language code to its modern ISO 639 form.
     *
     * @param languageCode a language code as reported by [Locale.getLanguage].
     * @return the modern equivalent (`iw`→`he`, `in`→`id`, `ji`→`yi`), or
     * [languageCode] unchanged when it is not a legacy code.
     */
    fun normalizeLanguageCode(languageCode: String): String =
        LEGACY_LANGUAGE_CODES[languageCode] ?: languageCode

    /**
     * Maps a single [Locale] into a `{ languageTag, languageCode, countryCode, isRTL }` map.
     *
     * @param locale the locale to describe.
     * @return a new [WritableMap] with the four `NativeLocaleInfo` fields;
     * `languageTag` is the BCP-47 tag and `languageCode` is normalized via
     * [normalizeLanguageCode].
     */
    fun toWritableMap(locale: Locale): WritableMap {
        val map = Arguments.createMap()
        map.putString("languageTag", locale.toLanguageTag())
        map.putString("languageCode", normalizeLanguageCode(locale.language))
        map.putString("countryCode", locale.country)
        map.putBoolean("isRTL", isRTL(locale))
        return map
    }

    /**
     * Maps a list of [Locale]s, preserving order (most-preferred first).
     *
     * @param locales the locales to describe.
     * @return a new [WritableArray] containing one map per locale.
     */
    fun toWritableArray(locales: List<Locale>): WritableArray =
        Arguments.createArray().apply {
            locales.forEach { pushMap(toWritableMap(it)) }
        }

    /**
     * Resolves writing-direction using the platform's own bidi tables, not a hardcoded list.
     *
     * @param locale the locale to inspect.
     * @return `true` if text in [locale] is laid out right-to-left.
     */
    fun isRTL(locale: Locale): Boolean =
        TextUtilsCompat.getLayoutDirectionFromLocale(locale) == ViewCompat.LAYOUT_DIRECTION_RTL
}
