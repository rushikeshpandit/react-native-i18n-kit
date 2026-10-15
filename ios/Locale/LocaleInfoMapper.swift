import Foundation

/// Single-responsibility: convert a `Locale` into the `[String: Any]`
/// shape defined by `NativeLocaleInfo` on the TypeScript side. Kept
/// separate from `DeviceLocaleProvider` so the mapping logic is
/// independently unit-testable without touching `Locale.preferredLanguages`.
struct LocaleInfoMapper {

    /// Maps a single `Locale` into `{ languageTag, languageCode, countryCode, isRTL }`.
    ///
    /// - Parameter locale: The locale to describe.
    /// - Returns: A dictionary with the four `NativeLocaleInfo` fields; `languageTag` is hyphenated BCP-47.
    static func toDictionary(_ locale: Locale) -> [String: Any] {
        [
            "languageTag": locale.identifier.replacingOccurrences(of: "_", with: "-"),
            "languageCode": locale.languageCode ?? "",
            "countryCode": locale.regionCode ?? "",
            "isRTL": isRTL(locale),
        ]
    }

    /// Maps an array of `Locale`s, preserving order (most-preferred first).
    ///
    /// - Parameter locales: The locales to describe.
    /// - Returns: One dictionary per locale.
    static func toArray(_ locales: [Locale]) -> [[String: Any]] {
        locales.map(toDictionary)
    }

    /// Resolves writing-direction using Foundation's own bidi tables, not a hardcoded list.
    ///
    /// - Parameter locale: The locale to inspect.
    /// - Returns: `true` if its language is written right-to-left; `false` if it has no language code.
    static func isRTL(_ locale: Locale) -> Bool {
        guard let languageCode = locale.languageCode else { return false }
        return Locale.characterDirection(forLanguage: languageCode) == .rightToLeft
    }
}
