package com.i18nkit.locale

import android.content.Context
import android.icu.util.Calendar as IcuCalendar
import android.icu.util.LocaleData
import android.icu.util.ULocale
import android.text.format.DateFormat.is24HourFormat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import java.text.DecimalFormatSymbols
import java.util.Locale
import java.util.TimeZone

/**
 * Single-responsibility: read OS-level locale/region/format preferences
 * from the Android framework. Contains no React Native bridge types in
 * its return values (besides the small WritableMap/WritableArray helpers)
 * so the core logic stays testable with plain JVM unit tests.
 *
 * @property context any [Context]; only its resources and system settings are read.
 */
class DeviceLocaleProvider(private val context: Context) {

    /**
     * All user-configured locales, most-preferred first.
     *
     * @return the configured locales; always contains at least one entry
     * ([Locale.getDefault] when the configuration list is empty).
     */
    fun getLocales(): List<Locale> {
        val configLocales = context.resources.configuration.locales
        if (configLocales.isEmpty) {
            return listOf(Locale.getDefault())
        }
        return (0 until configLocales.size()).map { configLocales.get(it) }
    }

    /**
     * All configured locales in the bridge shape.
     *
     * @return a [WritableArray] of `NativeLocaleInfo` maps, most-preferred first.
     */
    fun getLocalesAsWritableArray(): WritableArray = LocaleInfoMapper.toWritableArray(getLocales())

    /**
     * The most-preferred locale in the bridge shape.
     *
     * @return a [WritableMap] describing the first configured locale.
     */
    fun getPrimaryLocaleAsWritableMap(): WritableMap = LocaleInfoMapper.toWritableMap(getLocales().first())

    /**
     * ISO 3166-1 alpha-2 country code, uppercased, e.g. "IN".
     *
     * @return the primary locale's country, else the JVM default country, else "".
     */
    fun getCountry(): String = getLocales().first().country.ifEmpty { Locale.getDefault().country }

    /**
     * Calendar system identifier, e.g. "gregorian", "japanese", "buddhist",
     * as reported by ICU for the primary locale.
     *
     * @return the ICU calendar type, or "gregorian" if ICU reports none.
     */
    fun getCalendar(): String = IcuCalendar.getInstance(getLocales().first()).type ?: "gregorian"

    /**
     * IANA time zone identifier, e.g. "Asia/Kolkata".
     *
     * @return the JVM default time zone id.
     */
    fun getTimeZone(): String = TimeZone.getDefault().id

    /**
     * Decimal & grouping separators for the primary locale, as single-character strings.
     *
     * @return a [WritableMap] with `decimalSeparator` and `groupingSeparator`.
     */
    fun getNumberFormatSettings(): WritableMap {
        val symbols = DecimalFormatSymbols.getInstance(getLocales().first())
        return Arguments.createMap().apply {
            putString("decimalSeparator", symbols.decimalSeparator.toString())
            putString("groupingSeparator", symbols.groupingSeparator.toString())
        }
    }

    /**
     * Whether the user's system setting prefers a 24-hour clock.
     *
     * @return `true` for 24-hour, `false` for 12-hour.
     */
    fun uses24HourClock(): Boolean = is24HourFormat(context)

    /**
     * Whether the device uses the metric system.
     *
     * Uses ICU's measurement-system data for the primary locale, which also
     * honours the `-u-ms-` extension Android 14+ adds to the configuration
     * locale for the user's regional preference. A locale without a region
     * falls back to the country: only US, LR and MM are treated as non-metric.
     *
     * @return `false` for the US customary system, `true` otherwise (SI, and
     * the UK system, matching iOS `Locale.usesMetricSystem`'s notion of "not US").
     */
    fun usesMetricSystem(): Boolean {
        val primary = getLocales().first()
        if (primary.country.isEmpty()) {
            return getCountry().uppercase() !in IMPERIAL_COUNTRY_CODES
        }
        return try {
            LocaleData.getMeasurementSystem(ULocale.forLocale(primary)) != LocaleData.MeasurementSystem.US
        } catch (e: Exception) {
            primary.country.uppercase() !in IMPERIAL_COUNTRY_CODES
        }
    }

    companion object {
        // United States, Liberia, and Myanmar are the only countries that
        // have not officially adopted the metric system as their primary
        // system of measurement.
        private val IMPERIAL_COUNTRY_CODES = setOf("US", "LR", "MM")
    }
}
