package com.i18nkit.locale

import android.content.Context
import android.icu.util.Calendar as IcuCalendar
import android.os.Build
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
    fun getCalendar(): String {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            IcuCalendar.getInstance(getLocales().first()).calendarType ?: "gregorian"
        } else {
            "gregorian"
        }
    }

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
     * Whether the device region conventionally uses the metric system.
     * Android exposes no direct "measurement system" API (unlike iOS's
     * `Locale.usesMetricSystem`), so this is derived from the country
     * code against the small set of countries that officially use
     * imperial/US customary units.
     *
     * @return `false` for US, LR and MM; `true` otherwise.
     */
    fun usesMetricSystem(): Boolean = getCountry().uppercase() !in IMPERIAL_COUNTRY_CODES

    companion object {
        // United States, Liberia, and Myanmar are the only countries that
        // have not officially adopted the metric system as their primary
        // system of measurement.
        private val IMPERIAL_COUNTRY_CODES = setOf("US", "LR", "MM")
    }
}
