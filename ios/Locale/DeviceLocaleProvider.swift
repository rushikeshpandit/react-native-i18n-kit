import Foundation

/// Single-responsibility: read OS-level locale/region/format preferences
/// from Foundation. Contains no React Native bridge types so the core
/// logic stays testable with plain XCTest unit tests.
struct DeviceLocaleProvider {

    /// All user-preferred locales, most-preferred first.
    ///
    /// - Returns: The preferred locales; always at least one (`Locale.current` as a fallback).
    func getLocales() -> [Locale] {
        let identifiers = Locale.preferredLanguages
        guard !identifiers.isEmpty else { return [Locale.current] }
        return identifiers.map { Locale(identifier: $0) }
    }

    /// All preferred locales in the bridge shape.
    ///
    /// - Returns: One `NativeLocaleInfo`-shaped dictionary per locale.
    func getLocalesAsArray() -> [[String: Any]] {
        LocaleInfoMapper.toArray(getLocales())
    }

    /// The most-preferred locale in the bridge shape.
    ///
    /// - Returns: A `NativeLocaleInfo`-shaped dictionary.
    func getPrimaryLocaleAsDictionary() -> [String: Any] {
        LocaleInfoMapper.toDictionary(getLocales().first ?? Locale.current)
    }

    /// ISO 3166-1 alpha-2 country/region code, e.g. "IN".
    ///
    /// - Returns: The primary locale's region, else the device region, else `""`.
    func getCountry() -> String {
        let locale = getLocales().first ?? Locale.current
        return locale.regionCode ?? Locale.current.regionCode ?? ""
    }

    /// Calendar identifier in use, e.g. "gregorian", "islamic", "japanese".
    ///
    /// - Returns: A lowercase identifier; `"gregorian"` for unknown calendars.
    func getCalendar() -> String {
        let calendar = (getLocales().first ?? Locale.current).calendar
        return calendarIdentifierString(calendar.identifier)
    }

    /// IANA time zone identifier, e.g. "Asia/Kolkata".
    ///
    /// - Returns: The current time zone identifier.
    func getTimeZone() -> String {
        TimeZone.current.identifier
    }

    /// Decimal & grouping separators for the primary locale.
    ///
    /// - Returns: A dictionary with `decimalSeparator` and `groupingSeparator`.
    func getNumberFormatSettings() -> [String: Any] {
        let locale = getLocales().first ?? Locale.current
        let formatter = NumberFormatter()
        formatter.locale = locale
        return [
            "decimalSeparator": formatter.decimalSeparator ?? ".",
            "groupingSeparator": formatter.groupingSeparator ?? ",",
        ]
    }

    /// True if the user's system setting prefers a 24-hour clock.
    /// Derived from whether the locale's short time format contains an "a"
    /// (AM/PM) pattern symbol — there is no direct boolean API on iOS.
    func uses24HourClock() -> Bool {
        let locale = getLocales().first ?? Locale.current
        let formatString = DateFormatter.dateFormat(fromTemplate: "j", options: 0, locale: locale) ?? ""
        return !formatString.contains("a")
    }

    /// True if the device region conventionally uses the metric system.
    ///
    /// - Returns: `true` for metric; a language-only locale defers to the device region.
    func usesMetricSystem() -> Bool {
        let locale = getLocales().first ?? Locale.current
        // A bare language tag ("en") carries no region, so defer to the device region.
        return (locale.regionCode == nil ? Locale.current : locale).usesMetricSystem
    }

    /// Maps a Foundation calendar identifier to the library's string form.
    ///
    /// - Parameter identifier: The Foundation calendar identifier.
    /// - Returns: A lowercase identifier such as `"gregorian"`.
    private func calendarIdentifierString(_ identifier: Calendar.Identifier) -> String {
        switch identifier {
        case .gregorian: return "gregorian"
        case .buddhist: return "buddhist"
        case .chinese: return "chinese"
        case .coptic: return "coptic"
        case .ethiopicAmeteMihret: return "ethiopic"
        case .ethiopicAmeteAlem: return "ethiopic-amete-alem"
        case .hebrew: return "hebrew"
        case .indian: return "indian"
        case .islamic: return "islamic"
        case .islamicCivil: return "islamic-civil"
        case .islamicTabular: return "islamic-tabular"
        case .islamicUmmAlQura: return "islamic-umm-al-qura"
        case .iso8601: return "iso8601"
        case .japanese: return "japanese"
        case .persian: return "persian"
        case .republicOfChina: return "republic-of-china"
        @unknown default: return "gregorian"
        }
    }
}
