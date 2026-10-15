# Keep the TurboModule and package class names — codegen + autolinking
# resolve them by reflection/name, so renaming via R8 would break linking.
-keep class com.i18nkit.** { *; }
