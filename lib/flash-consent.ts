/** First-use physical flash acknowledgement. Separate from the current flash-enabled flag. */

export function shouldPromptPhoneFlash(accepted: unknown, enabling: boolean): boolean {
  return enabling && accepted !== true;
}

export function phoneFlashEnabledAfterPrompt(accepted: unknown, enabling: boolean): boolean {
  if (!enabling) return false;
  return accepted === true;
}

export const PHONE_FLASH_TITLE = 'Use iPhone Flash?';
export const PHONE_FLASH_MESSAGE =
  'The rear flash will pulse with primary beats. Avoid pointing it directly at anyone’s eyes. You can turn it off at any time.';
