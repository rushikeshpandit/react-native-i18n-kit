import Foundation

/// Single-responsibility: persist and read the app-scoped language
/// override.
///
/// iOS has no public, live, app-only equivalent of Android's
/// `AppCompatDelegate.setApplicationLocales` — the only supported way
/// to influence which `.lproj` bundle `NSLocalizedString` resolves
/// against is the `AppleLanguages` key in `UserDefaults.standard`,
/// which Apple's own docs say only takes effect **on the next launch**.
/// This class is intentionally honest about that constraint rather
/// than faking a live update — see README "Platform limitations".
final class AppLanguageManager {

    private static let appleLanguagesKey = "AppleLanguages"
    private static let i18nKitOverrideKey = "I18nKitAppLanguageOverride"

    /// Persists `languageTag` as the preferred language for the *next*
    /// launch.
    ///
    /// - Parameter languageTag: A BCP-47 tag such as `"fr"`.
    /// - Returns: Always `false` (unlike Android) to signal to the JS layer
    ///   that a restart is required to take visual effect.
    func setAppLanguage(_ languageTag: String) -> Bool {
        UserDefaults.standard.set([languageTag], forKey: Self.appleLanguagesKey)
        UserDefaults.standard.set(languageTag, forKey: Self.i18nKitOverrideKey)
        UserDefaults.standard.synchronize()
        return false
    }

    /// Returns the override most recently set via `setAppLanguage`, or ""
    /// if this API has never been called (i.e. the app is following the
    /// system language as normal).
    ///
    /// - Returns: The BCP-47 tag, or `""` when no override exists.
    func getAppLanguage() -> String {
        UserDefaults.standard.string(forKey: Self.i18nKitOverrideKey) ?? ""
    }
}
