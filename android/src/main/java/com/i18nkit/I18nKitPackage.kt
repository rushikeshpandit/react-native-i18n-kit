package com.i18nkit

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/**
 * `BaseReactPackage` (rather than the legacy `ReactPackage`) is the
 * New-Architecture-recommended way to register a single TurboModule —
 * it lazily instantiates [I18nKitModule] only when first requested,
 * instead of eagerly building a list of every module up front.
 */
class I18nKitPackage : BaseReactPackage() {

    /**
     * Lazily creates the module on first request.
     *
     * @param name the module name React Native asks for.
     * @param reactContext the host React context.
     * @return a new [I18nKitModule] when [name] is `"I18nKit"`, otherwise `null`.
     */
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        if (name == I18nKitModule.NAME) I18nKitModule(reactContext) else null

    /**
     * Describes the module to the TurboModule registry.
     *
     * @return a provider mapping `"I18nKit"` to its [ReactModuleInfo].
     */
    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider {
        mapOf(
            I18nKitModule.NAME to ReactModuleInfo(
                I18nKitModule.NAME,
                I18nKitModule.NAME,
                false, // canOverrideExistingModule
                false, // needsEagerInit
                true,  // hasConstants — unused by this module but kept true for codegen compatibility
                false, // isCxxModule
                true   // isTurboModule
            )
        )
    }
}
