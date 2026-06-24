package com.i18nkit

import com.facebook.react.bridge.ReactApplicationContext

class I18nKitModule(reactContext: ReactApplicationContext) :
  NativeI18nKitSpec(reactContext) {

  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }

  companion object {
    const val NAME = NativeI18nKitSpec.NAME
  }
}
