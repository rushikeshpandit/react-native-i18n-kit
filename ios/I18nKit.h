// The codegen'd spec header is Objective-C++ only. This header is also part of
// the pod's public umbrella (read by Swift's module build as plain
// Objective-C), so everything is guarded.
#ifdef __cplusplus
#import <I18nKitSpec/I18nKitSpec.h>
#import <React/RCTEventEmitter.h>

/// TurboModule entry point. Conforms to the codegen'd `NativeI18nKitSpec`
/// protocol and delegates all work to the Swift `I18nKitImpl`.
@interface I18nKit : RCTEventEmitter <NativeI18nKitSpec>
@end
#endif
