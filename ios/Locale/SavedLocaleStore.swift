import Foundation

/// Single-responsibility: persist the locale the user picked inside the app so
/// it can be restored on the next launch. Backed by `UserDefaults`.
final class SavedLocaleStore {

    private static let key = "I18nKitSavedLocale"
    private let defaults: UserDefaults

    /// Creates a store.
    ///
    /// - Parameter defaults: The defaults database to use (`.standard` unless a test injects another).
    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    /// Reads the saved locale.
    ///
    /// - Returns: The saved locale code, or `""` when nothing was saved.
    func get() -> String {
        defaults.string(forKey: Self.key) ?? ""
    }

    /// Saves a locale, replacing any previous value.
    ///
    /// - Parameter locale: A non-blank locale code such as `"fr"`.
    /// - Returns: `true` if saved, `false` if `locale` is blank (nothing is written).
    @discardableResult
    func save(_ locale: String) -> Bool {
        guard !locale.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return false }
        defaults.set(locale, forKey: Self.key)
        return true
    }

    /// Removes the saved locale; a no-op when none was saved.
    func clear() {
        defaults.removeObject(forKey: Self.key)
    }
}
