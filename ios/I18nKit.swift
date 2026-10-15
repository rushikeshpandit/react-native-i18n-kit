import Foundation

/// Swift implementation behind the `I18nKit` Objective-C++ TurboModule
/// (`I18nKit.mm`), which conforms to the codegen'd `NativeI18nKitSpec`.
/// Kept free of React imports so it only depends on Foundation.
@objcMembers
public final class I18nKitImpl: NSObject {

    private let deviceLocaleProvider = DeviceLocaleProvider()
    private let appLanguageManager = AppLanguageManager()
    private let savedLocaleStore = SavedLocaleStore()
    private let relativeTimeProvider = RelativeTimeProvider()

    // MARK: - Device locale detection

    /// Lists every user-preferred locale.
    ///
    /// - Returns: One `NativeLocaleInfo`-shaped dictionary per locale, most preferred first.
    public func getDeviceLocales() -> [[String: Any]] {
        deviceLocaleProvider.getLocalesAsArray()
    }

    /// Returns the single most-preferred device locale.
    ///
    /// - Returns: A `NativeLocaleInfo`-shaped dictionary.
    public func getDeviceLocale() -> [String: Any] {
        deviceLocaleProvider.getPrimaryLocaleAsDictionary()
    }

    /// Returns the ISO 3166-1 alpha-2 country code of the device region.
    ///
    /// - Returns: For example `"IN"`, or `""` if unknown.
    public func getCountry() -> String {
        deviceLocaleProvider.getCountry()
    }

    /// Returns the calendar system in use.
    ///
    /// - Returns: For example `"gregorian"` or `"islamic"`.
    public func getCalendar() -> String {
        deviceLocaleProvider.getCalendar()
    }

    /// Returns the IANA time zone identifier.
    ///
    /// - Returns: For example `"Asia/Kolkata"`.
    public func getTimeZone() -> String {
        deviceLocaleProvider.getTimeZone()
    }

    /// Returns the decimal and grouping separators of the primary locale.
    ///
    /// - Returns: A dictionary with `decimalSeparator` and `groupingSeparator`.
    public func getNumberFormatSettings() -> [String: Any] {
        deviceLocaleProvider.getNumberFormatSettings()
    }

    /// Reports the device's clock preference.
    ///
    /// - Returns: `true` for a 24-hour clock.
    public func uses24HourClock() -> Bool {
        deviceLocaleProvider.uses24HourClock()
    }

    /// Reports the measurement system of the device region.
    ///
    /// - Returns: `true` for metric.
    public func usesMetricSystem() -> Bool {
        deviceLocaleProvider.usesMetricSystem()
    }

    /// Tells whether a language is written right-to-left.
    ///
    /// - Parameter languageCode: A BCP-47 language code such as `"ar"`.
    /// - Returns: `true` for right-to-left languages; `false` for an empty code.
    public func isRTLForLanguage(_ languageCode: String) -> Bool {
        guard !languageCode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return false }
        return LocaleInfoMapper.isRTL(Locale(identifier: languageCode))
    }

    // MARK: - App-level language override

    /// Persists the override for the next launch.
    ///
    /// - Parameter languageTag: A BCP-47 tag such as `"fr"`.
    /// - Returns: Always `false` on iOS (a restart is required) — see `AppLanguageManager`.
    public func setAppLanguage(_ languageTag: String) -> Bool {
        appLanguageManager.setAppLanguage(languageTag)
    }

    // MARK: - Relative time

    /// Formats a relative time with Foundation's `RelativeDateTimeFormatter`.
    ///
    /// - Parameters:
    ///   - value: The offset; negative means the past (rounded to a whole unit).
    ///   - unit: `"second"`, `"minute"`, `"hour"`, `"day"`, `"week"`, `"month"`, `"quarter"` or `"year"`.
    ///   - locale: A BCP-47 locale tag.
    ///   - numeric: `"auto"` or `"always"`.
    /// - Returns: The formatted string, or `""` if it cannot be formatted.
    public func formatRelativeTime(_ value: Double, unit: String, locale: String, numeric: String) -> String {
        relativeTimeProvider.format(value: value, unit: unit, localeTag: locale, numeric: numeric)
    }

    // MARK: - Saved in-app locale

    /// Reads the locale the user saved in the app.
    ///
    /// - Returns: The saved locale code, or `""` if none was saved.
    public func getSavedLocale() -> String {
        savedLocaleStore.get()
    }

    /// Saves the user's in-app locale choice for the next launch.
    ///
    /// - Parameter locale: A non-blank locale code such as `"fr"`.
    /// - Returns: `true` if saved, `false` if `locale` is blank.
    public func saveLocale(_ locale: String) -> Bool {
        savedLocaleStore.save(locale)
    }

    /// Removes the saved locale.
    ///
    /// - Returns: Always `true` (also when nothing was saved).
    public func clearSavedLocale() -> Bool {
        savedLocaleStore.clear()
        return true
    }

    /// Reads the persisted app-language override.
    ///
    /// - Returns: The BCP-47 tag, or `""` if none was set.
    public func getAppLanguage() -> String {
        appLanguageManager.getAppLanguage()
    }
}
