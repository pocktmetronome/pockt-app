#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// Runs `block`, turning an Objective-C exception (AVAudioEngine throws these on a bad tap or format)
/// into a NO return instead of a crash.
FOUNDATION_EXPORT BOOL PocktTryObjC(NS_NOESCAPE void (^block)(void), NSString *_Nullable *_Nullable reason);

NS_ASSUME_NONNULL_END
