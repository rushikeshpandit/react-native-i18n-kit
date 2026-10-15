package com.i18nkit

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.i18nkit.locale.AppLanguageManager
import com.i18nkit.locale.DeviceLocaleProvider
import com.i18nkit.locale.LocaleInfoMapper
import com.i18nkit.receiver.LocaleChangeReceiver
import java.util.Locale

/**
 * `NativeI18nKitSpec` is generated at build time by React Native's
 * codegen from `src/NativeI18nKit.ts` (see `codegenConfig` in
 * package.json). It will not resolve until you have run a build at
 * least once (`./gradlew generateCodegenArtifactsFromSchema` or simply
 * building the app) — this is expected and not an error in this file.
 */
class I18nKitModule(reactContext: ReactApplicationContext) :
    NativeI18nKitSpec(reactContext) {

    private val deviceLocaleProvider = DeviceLocaleProvider(reactContext)
    private val appLanguageManager = AppLanguageManager()
    private var listenerCount = 0

    private val localeChangeReceiver = LocaleChangeReceiver(onLocaleChanged = ::emitLocaleChanged)

    init {
        localeChangeReceiver.register(reactContext)
    }

    /**
     * Name under which the module is registered with React Native.
     *
     * @return the constant module name, `"I18nKit"`.
     */
    override fun getName(): String = NAME

    // ---- Device locale detection -------------------------------------------------

    /**
     * Lists all device locales.
     *
     * @return a [WritableArray] of locale maps, most-preferred first.
     * @throws RuntimeException if the underlying native read fails.
     */
    override fun getDeviceLocales(): WritableArray = runCatchingNative {
        deviceLocaleProvider.getLocalesAsWritableArray()
    }

    /**
     * Returns the primary device locale.
     *
     * @return a [WritableMap] with `languageTag`, `languageCode`, `countryCode`, `isRTL`.
     * @throws RuntimeException if the underlying native read fails.
     */
    override fun getDeviceLocale(): WritableMap = runCatchingNative {
        deviceLocaleProvider.getPrimaryLocaleAsWritableMap()
    }

    /**
     * Returns the device region's country code.
     *
     * @return an ISO 3166-1 alpha-2 code, or "".
     * @throws RuntimeException if the underlying native read fails.
     */
    override fun getCountry(): String = runCatchingNative { deviceLocaleProvider.getCountry() }

    /**
     * Returns the calendar identifier.
     *
     * @return for example "gregorian".
     * @throws RuntimeException if the underlying native read fails.
     */
    override fun getCalendar(): String = runCatchingNative { deviceLocaleProvider.getCalendar() }

    /**
     * Returns the IANA time zone id.
     *
     * @return for example "Asia/Kolkata".
     * @throws RuntimeException if the underlying native read fails.
     */
    override fun getTimeZone(): String = runCatchingNative { deviceLocaleProvider.getTimeZone() }

    /**
     * Returns the numeric separators of the primary locale.
     *
     * @return a [WritableMap] with `decimalSeparator` and `groupingSeparator`.
     * @throws RuntimeException if the underlying native read fails.
     */
    override fun getNumberFormatSettings(): WritableMap = runCatchingNative {
        deviceLocaleProvider.getNumberFormatSettings()
    }

    /**
     * Reports the 24-hour clock preference.
     *
     * @return `true` for 24-hour.
     * @throws RuntimeException if the underlying native read fails.
     */
    override fun uses24HourClock(): Boolean = runCatchingNative { deviceLocaleProvider.uses24HourClock() }

    /**
     * Reports the measurement system of the device region.
     *
     * @return `true` for metric.
     * @throws RuntimeException if the underlying native read fails.
     */
    override fun usesMetricSystem(): Boolean = runCatchingNative { deviceLocaleProvider.usesMetricSystem() }

    /**
     * Tells whether a language is written right-to-left.
     *
     * @param languageCode a non-blank BCP-47 language code.
     * @return `true` for right-to-left languages.
     * @throws RuntimeException (wrapping [IllegalArgumentException]) if
     * [languageCode] is blank.
     */
    override fun isRTLForLanguage(languageCode: String): Boolean = runCatchingNative {
        require(languageCode.isNotBlank()) { "languageCode must not be blank" }
        LocaleInfoMapper.isRTL(Locale.forLanguageTag(languageCode))
    }

    // ---- App-level language override ---------------------------------------------

    /**
     * Applies an app-level language override on the main thread.
     *
     * @param languageTag a non-blank BCP-47 tag.
     * @param promise resolved with `true` once applied; rejected with
     * `INVALID_LOCALE` for a blank tag or `NATIVE_CALL_FAILED` on any other failure.
     */
    override fun setAppLanguage(languageTag: String, promise: Promise) {
        try {
            require(languageTag.isNotBlank()) { "languageTag must not be blank" }
            val applied = appLanguageManager.setAppLanguage(languageTag)
            promise.resolve(applied)
        } catch (e: IllegalArgumentException) {
            promise.reject("INVALID_LOCALE", "Invalid languageTag \"$languageTag\": ${e.message}", e)
        } catch (e: Exception) {
            promise.reject("NATIVE_CALL_FAILED", "setAppLanguage failed: ${e.message}", e)
        }
    }

    /**
     * Reads the app-level language override.
     *
     * @return the BCP-47 tag, or "" if none is set.
     * @throws RuntimeException if the underlying native read fails.
     */
    override fun getAppLanguage(): String = runCatchingNative { appLanguageManager.getAppLanguage() }

    // ---- Event emitter plumbing ---------------------------------------------------
    // NativeEventEmitter only forwards addListener/removeListeners to native on
    // iOS, so Android cannot rely on them for bookkeeping. These are no-ops
    // required by the spec; events are emitted whenever a React instance is active.

    /**
     * No-op: required by the spec, not forwarded by `NativeEventEmitter` on Android.
     *
     * @param eventName the event a JS listener subscribed to.
     */
    override fun addListener(eventName: String) {
        listenerCount++
    }

    /**
     * No-op: required by the spec, not forwarded by `NativeEventEmitter` on Android.
     *
     * @param count number of JS listeners removed.
     */
    override fun removeListeners(count: Double) {
        listenerCount = (listenerCount - count.toInt()).coerceAtLeast(0)
    }

    /**
     * Called by React Native when the module's owning context is torn down;
     * unregisters the locale-change receiver to avoid leaking it.
     */
    override fun invalidate() {
        localeChangeReceiver.unregister(reactApplicationContext)
        super.invalidate()
    }

    /** Emits `onLocaleChanged` to JS, skipping silently when React is not running. */
    private fun emitLocaleChanged() {
        if (listenerCount <= 0) return
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(EVENT_LOCALE_CHANGED, null)
    }

    /**
     * Centralizes the "any unexpected native exception becomes a
     * descriptive RuntimeException instead of an opaque crash" policy
     * for every synchronous (non-Promise) method in this module.
     *
     * @param block the native work to run.
     * @return the value produced by [block].
     * @throws RuntimeException wrapping any [Exception] thrown by [block].
     */
    private inline fun <T> runCatchingNative(block: () -> T): T =
        try {
            block()
        } catch (e: Exception) {
            throw RuntimeException("[react-native-i18n-kit] Native call failed: ${e.message}", e)
        }

    companion object {
        const val NAME = "I18nKit"
        private const val EVENT_LOCALE_CHANGED = "onLocaleChanged"
    }
}
