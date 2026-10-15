package com.i18nkit.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter

/**
 * Single-responsibility: listen for `Intent.ACTION_LOCALE_CHANGED`
 * (fired when the user changes their system language/region in
 * Settings while the app is running/backgrounded) and forward it via
 * [onLocaleChanged], decoupled from any React Native bridge types so
 * it stays trivially unit-testable.
 */
class LocaleChangeReceiver(private val onLocaleChanged: () -> Unit) : BroadcastReceiver() {

    /**
     * Invoked by the system for each matching broadcast.
     *
     * @param context the receiving context (unused).
     * @param intent the broadcast; [onLocaleChanged] fires only for
     * `Intent.ACTION_LOCALE_CHANGED`, any other or null intent is ignored.
     */
    override fun onReceive(context: Context?, intent: Intent?) {
        if (intent?.action == Intent.ACTION_LOCALE_CHANGED) {
            onLocaleChanged()
        }
    }

    /**
     * Registers this receiver against the given context's system locale-change broadcast.
     *
     * @param context the context to register on; call [unregister] with the same one.
     */
    fun register(context: Context) {
        val filter = IntentFilter(Intent.ACTION_LOCALE_CHANGED)
        // RECEIVER_NOT_EXPORTED is required on API 33+ for receivers that
        // only need to observe system broadcasts within the app's own
        // process and aren't meant to be triggered by other apps.
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(this, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            context.registerReceiver(this, filter)
        }
    }

    /**
     * Always call this from the owning module's `invalidate()` to avoid leaking the receiver.
     *
     * @param context the context passed to [register]. Calling this when the
     * receiver is not registered is a safe no-op.
     */
    fun unregister(context: Context) {
        try {
            context.unregisterReceiver(this)
        } catch (_: IllegalArgumentException) {
            // Already unregistered (e.g. invalidate() called twice) — safe to ignore.
        }
    }
}
