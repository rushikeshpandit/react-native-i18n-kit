#import "I18nKit.h"

@implementation I18nKit
- (NSNumber *)multiply:(double)a b:(double)b {
    NSNumber *result = @(a * b);

    return result;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeI18nKitSpecJSI>(params);
}

+ (NSString *)moduleName
{
  return @"I18nKit";
}

@end
