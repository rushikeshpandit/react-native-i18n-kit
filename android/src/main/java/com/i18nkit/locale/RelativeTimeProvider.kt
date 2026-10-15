package com.i18nkit.locale

import android.icu.text.RelativeDateTimeFormatter
import android.icu.text.RelativeDateTimeFormatter.RelativeDateTimeUnit
import android.icu.util.ULocale

/**
 * Single-responsibility: format relative times ("in 3 days", "yesterday") with
 * the platform's ICU data. Used because Hermes has no `Intl.RelativeTimeFormat`.
 */
class RelativeTimeProvider {

    /**
     * Formats a relative time.
     *
     * @param value the offset; negative means the past.
     * @param unit one of "second", "minute", "hour", "day", "week", "month", "quarter", "year".
     * @param localeTag a BCP-47 locale tag such as "fr".
     * @param numeric "auto" to allow words like "tomorrow", anything else for always-numeric output.
     * @return the formatted string in the requested locale.
     * @throws IllegalArgumentException if [unit] is not a supported unit.
     */
    fun format(value: Double, unit: String, localeTag: String, numeric: String): String {
        val relativeUnit = when (unit) {
            "second" -> RelativeDateTimeUnit.SECOND
            "minute" -> RelativeDateTimeUnit.MINUTE
            "hour" -> RelativeDateTimeUnit.HOUR
            "day" -> RelativeDateTimeUnit.DAY
            "week" -> RelativeDateTimeUnit.WEEK
            "month" -> RelativeDateTimeUnit.MONTH
            "quarter" -> RelativeDateTimeUnit.QUARTER
            "year" -> RelativeDateTimeUnit.YEAR
            else -> throw IllegalArgumentException("unsupported unit \"$unit\"")
        }
        val formatter = RelativeDateTimeFormatter.getInstance(ULocale.forLanguageTag(localeTag))
        return if (numeric == "auto") formatter.format(value, relativeUnit)
        else formatter.formatNumeric(value, relativeUnit)
    }
}
