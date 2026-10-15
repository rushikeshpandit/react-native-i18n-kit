import Foundation

/// Single-responsibility: format relative times ("in 3 days", "yesterday") with
/// Foundation's `RelativeDateTimeFormatter`. Used because Hermes has no
/// `Intl.RelativeTimeFormat`.
struct RelativeTimeProvider {

    /// Formats a relative time.
    ///
    /// - Parameters:
    ///   - value: The offset; negative means the past. Rounded to a whole unit.
    ///   - unit: One of `"second"`, `"minute"`, `"hour"`, `"day"`, `"week"`, `"month"`, `"quarter"`, `"year"`.
    ///   - localeTag: A BCP-47 locale tag such as `"fr"`.
    ///   - numeric: `"auto"` to allow words like "tomorrow", anything else for always-numeric output.
    /// - Returns: The formatted string, or `""` for an unsupported unit or non-finite value.
    func format(value: Double, unit: String, localeTag: String, numeric: String) -> String {
        guard value.isFinite else { return "" }
        let amount = Int(value.rounded())
        var components = DateComponents()
        switch unit {
        case "second": components.second = amount
        case "minute": components.minute = amount
        case "hour": components.hour = amount
        case "day": components.day = amount
        case "week": components.weekOfYear = amount
        case "month": components.month = amount
        case "quarter": components.quarter = amount
        case "year": components.year = amount
        default: return ""
        }
        let formatter = RelativeDateTimeFormatter()
        formatter.locale = Locale(identifier: localeTag)
        formatter.unitsStyle = .full
        formatter.dateTimeStyle = numeric == "auto" ? .named : .numeric
        return formatter.localizedString(from: components)
    }
}
