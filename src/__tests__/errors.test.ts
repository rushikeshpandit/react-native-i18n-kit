import { I18nKitError, toI18nKitError } from '../errors';

describe('I18nKitError', () => {
  it('carries code, message, name and cause', () => {
    const cause = new Error('boom');
    const error = new I18nKitError('INVALID_LOCALE', 'bad locale', cause);
    expect(error.code).toBe('INVALID_LOCALE');
    expect(error.message).toBe('bad locale');
    expect(error.name).toBe('I18nKitError');
    expect(error.cause).toBe(cause);
  });

  it('is an Error and an I18nKitError (prototype chain intact)', () => {
    const error = new I18nKitError('PROVIDER_NOT_FOUND', 'x');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(I18nKitError);
    expect(error.stack).toBeDefined();
  });

  it('leaves cause undefined when none is given', () => {
    expect(new I18nKitError('INVALID_LOCALE', 'x').cause).toBeUndefined();
  });
});

describe('toI18nKitError', () => {
  it('returns an existing I18nKitError unchanged (same reference)', () => {
    const original = new I18nKitError('UNSUPPORTED_PLATFORM', 'nope');
    expect(toI18nKitError(original)).toBe(original);
  });

  it('wraps a plain Error, keeping its message and cause', () => {
    const original = new Error('native exploded');
    const wrapped = toI18nKitError(original);
    expect(wrapped).toBeInstanceOf(I18nKitError);
    expect(wrapped.code).toBe('NATIVE_CALL_FAILED');
    expect(wrapped.message).toBe('native exploded');
    expect(wrapped.cause).toBe(original);
  });

  it.each([
    ['a string', 'plain string', 'plain string'],
    ['a number', 42, '42'],
    ['undefined', undefined, 'undefined'],
    ['null', null, 'null'],
  ])('stringifies %s', (_label, input, expected) => {
    const wrapped = toI18nKitError(input);
    expect(wrapped.message).toBe(expected);
    expect(wrapped.cause).toBe(input);
  });

  it('honours a custom fallback code', () => {
    expect(toI18nKitError('x', 'INVALID_LOCALE').code).toBe('INVALID_LOCALE');
  });
});
