/**
 * Stable error codes consumers can branch on programmatically
 * (e.g. `if (err instanceof I18nKitError && err.code === 'INVALID_LOCALE')`).
 */
export type I18nKitErrorCode =
  | 'NATIVE_MODULE_UNAVAILABLE'
  | 'UNSUPPORTED_PLATFORM'
  | 'INVALID_LOCALE'
  | 'MISSING_TRANSLATION_TREE'
  | 'TRANSLATION_KEY_NOT_FOUND'
  | 'PROVIDER_NOT_FOUND'
  | 'NATIVE_CALL_FAILED';

/**
 * Single error type for the whole library. Native-side failures
 * (rejected promises from Kotlin/Swift) are normalized into this
 * shape too, so callers only ever need to handle one error class.
 */
export class I18nKitError extends Error {
  public readonly code: I18nKitErrorCode;
  public readonly cause?: unknown;

  /**
   * Creates a library error.
   *
   * @param code - Stable machine-readable error code.
   * @param message - Human-readable description.
   * @param cause - Optional original error or value that triggered this one.
   */
  constructor(code: I18nKitErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'I18nKitError';
    this.code = code;
    this.cause = cause;

    // Restores the correct prototype chain when compiled down to ES5,
    // otherwise `instanceof I18nKitError` can silently fail.
    Object.setPrototypeOf(this, I18nKitError.prototype);
  }
}

/**
 * Wraps an unknown thrown value from a native call into a typed I18nKitError.
 *
 * @param error - Anything that was thrown or used to reject a promise.
 * @param fallbackCode - Code to use when `error` is not already an
 * {@link I18nKitError} (default `NATIVE_CALL_FAILED`).
 * @returns `error` itself if it is already an `I18nKitError`; otherwise a new
 * one carrying the message and the original value as `cause`.
 */
export function toI18nKitError(
  error: unknown,
  fallbackCode: I18nKitErrorCode = 'NATIVE_CALL_FAILED'
): I18nKitError {
  if (error instanceof I18nKitError) {
    return error;
  }
  const message = error instanceof Error ? error.message : String(error);
  return new I18nKitError(fallbackCode, message, error);
}
