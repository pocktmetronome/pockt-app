#import "PocktObjCTry.h"

BOOL PocktTryObjC(NS_NOESCAPE void (^block)(void), NSString *_Nullable *_Nullable reason) {
  @try {
    block();
    return YES;
  } @catch (NSException *exception) {
    if (reason) {
      *reason = [NSString stringWithFormat:@"%@: %@", exception.name, exception.reason ?: @""];
    }
    NSLog(@"[POCKT] caught ObjC exception %@: %@", exception.name, exception.reason);
    return NO;
  }
}
