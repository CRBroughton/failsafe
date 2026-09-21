/* eslint-disable ts/no-redeclare */

/**
 * Represents a successful result containing a value.
 * @template T The type of the success value
 */
export interface Ok<T> {
  ok: true
  value: T
}

/**
 * Represents a failed result containing an error.
 * @template E The type of the error
 */
export interface Err<E> {
  ok: false
  error: E
}

/**
 * A Result type representing either success (Ok) or failure (Err).
 * Inspired by Rust's Result<T, E> type for explicit error handling.
 *
 * @template T The type of the success value
 * @template E The type of the error (defaults to Error)
 *
 * @example
 * ```ts
 * const result: Result<number, string> = Ok(42)
 *
 * if (result.ok === false) {
 *   console.error(result.error) // TypeScript knows this is string
 * } else {
 *   console.log(result.value) // TypeScript knows this is number
 * }
 * ```
 */
export type Result<T, E = Error> = Ok<T> | Err<E>

/**
 * Creates a successful Result with the given value.
 *
 * @template T The type of the value
 * @param value The success value to wrap
 * @returns An Ok result containing the value
 *
 * @example
 * ```ts
 * const result = Ok(42)
 * // result is { ok: true, value: 42 }
 * ```
 */
export const Ok = <T>(value: T): Ok<T> => ({ ok: true as const, value })

/**
 * Creates a failed Result with the given error.
 *
 * @template E The type of the error
 * @param error The error to wrap
 * @returns An Err result containing the error
 *
 * @example
 * ```ts
 * const result = Err('Something went wrong')
 * // result is { ok: false, error: 'Something went wrong' }
 * ```
 */
export const Err = <E>(error: E): Err<E> => ({ ok: false as const, error })

/**
 * Type guard to check if a Result is Ok.
 * Narrows the type to Ok<T> when true.
 *
 * @template T The type of the success value
 * @template E The type of the error
 * @param result The Result to check
 * @returns true if the result is Ok, false otherwise
 *
 * @example
 * ```ts
 * const result = safe(() => JSON.parse(raw))
 *
 * if (isOk(result)) {
 *   // TypeScript knows result is Ok<T>
 *   console.log(result.value)
 * }
 * ```
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok === true
}

/**
 * Type guard to check if a Result is Err.
 * Narrows the type to Err<E> when true.
 *
 * @template T The type of the success value
 * @template E The type of the error
 * @param result The Result to check
 * @returns true if the result is Err, false otherwise
 *
 * @example
 * ```ts
 * const result = safe(() => JSON.parse(raw))
 *
 * if (isErr(result)) {
 *   // TypeScript knows result is Err<E>
 *   console.error(result.error)
 * }
 * ```
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result.ok === false
}

/**
 * Extracts the value from a Result if Ok, otherwise returns null.
 * Convenient for converting Result to nullable value.
 *
 * @template T The type of the success value
 * @template E The type of the error
 * @param result The Result to extract from
 * @returns The value if Ok, null if Err
 *
 * @example
 * ```ts
 * const result = safe(() => JSON.parse(raw))
 * const value = ok(result) // T | null
 *
 * const name = ok(result)?.name ?? 'Guest'
 * ```
 */
export function ok<T, E>(result: Result<T, E>): T | null {
  return result.ok === true ? result.value : null
}

/**
 * Extracts the error from a Result if Err, otherwise returns null.
 * Convenient for converting Result to nullable error.
 *
 * @template T The type of the success value
 * @template E The type of the error
 * @param result The Result to extract from
 * @returns The error if Err, null if Ok
 *
 * @example
 * ```ts
 * const result = safe(() => JSON.parse(raw))
 * const error = err(result) // E | null
 *
 * if (error) {
 *   console.error('Failed:', error)
 * }
 * ```
 */
export function err<T, E>(result: Result<T, E>): E | null {
  return result.ok === true ? null : result.error
}

/**
 * Runs a throwing SYNCHRONOUS function and returns a Result instead of throwing.
 * Optionally maps the caught error into a typed shape.
 *
 * @template T The return type of the function if it succeeds
 * @template E The error type (defaults to Error)
 * @param fn The synchronous function to run
 * @param mapError Optional — transform the caught value into a typed error
 * @returns Ok(value) or Err(mappedError)
 *
 * @example
 * ```ts
 * const result = safe(() => JSON.parse(raw))
 * // Result<any, Error>
 *
 * type ParseError = TaggedError<'ParseError', { raw: string }>
 *
 * const tagged = safe(
 *   () => JSON.parse(raw) as User,
 *   (): ParseError => ({ tag: 'ParseError', raw })
 * )
 * // Result<User, ParseError>
 * ```
 */
export function safe<T, E = Error>(
  fn: () => T,
  mapError?: (error: unknown) => E,
): Result<T, E>

/**
 * Awaits a Promise and returns a Result instead of letting it reject.
 * Optionally maps the caught error into a typed shape.
 *
 * @template T The type of the resolved promise value
 * @template E The error type (defaults to Error)
 * @param promise The promise to await
 * @param mapError Optional — transform the caught value into a typed error
 * @returns A Promise that resolves to Ok(value) or Err(mappedError)
 *
 * @example
 * ```ts
 * const result = await safe(fetch('/api/data'))
 * if (result.ok === false) {
 *   console.error('Fetch failed:', result.error)
 *   return
 * }
 * const response = result.value
 *
 * type FetchError = TaggedError<'FetchError', { url: string }>
 *
 * const tagged = await safe(
 *   fetchData(),
 *   (): FetchError => ({ tag: 'FetchError', url })
 * )
 * ```
 */
export function safe<T, E = Error>(
  promise: Promise<T>,
  mapError?: (error: unknown) => E,
): Promise<Result<T, E>>

/**
 * safe — one entry point for both throwing sync functions and rejecting
 * Promises. Pass a thunk (`() => value`) for sync code, or a Promise
 * directly for async code; the correct overload above governs each case.
 *
 * NOTE: passing an async function itself (e.g. `safe(async () => ...)`)
 * matches the sync overload, since calling an async function never throws
 * synchronously — it returns a Promise immediately. That would incorrectly
 * produce `Ok(Promise<T>)` instead of catching a later rejection. Always
 * either pass the awaited Promise directly (`safe(fetchData())`) or wrap
 * it as `safe(() => value)` only for genuinely synchronous work.
 *
 * @example
 * ```ts
 * // Sync — pass a thunk
 * const parsed = safe(() => JSON.parse(raw))
 * // Result<any, Error>
 *
 * // Async — pass the Promise directly, not a function that returns one
 * const fetched = await safe(fetch('/api/data'))
 * // Result<Response, Error>
 *
 * // Wrong — this matches the sync overload and won't catch a rejection
 * const broken = safe(async () => fetchData())
 * // Result<Promise<Data>, Error> — NOT what you want
 *
 * // Correct async form for the same call
 * const fixed = await safe(fetchData())
 * // Result<Data, Error>
 *
 * // With a tagged error mapper (works for either overload)
 * type FetchError = TaggedError<'FetchError', { url: string }>
 *
 * const tagged = await safe(
 *   fetchData(),
 *   (): FetchError => ({ tag: 'FetchError', url: '/api/data' }),
 * )
 * // Result<Data, FetchError>
 * ```
 */
export function safe<T, E = Error>(
  input: (() => T) | Promise<T>,
  mapError?: (error: unknown) => E,
): Result<T, E> | Promise<Result<T, E>> {
  if (input instanceof Promise) {
    return input
      .then(data => Ok(data))
      .catch(error => Err(mapError ? mapError(error) : (error as E)))
  }

  try {
    return Ok(input())
  }
  catch (error) {
    return Err(mapError ? mapError(error) : (error as E))
  }
}

/**
 * Chains a Result-returning function onto an existing Result,
 * short-circuiting if the input is already an Err.
 *
 * @template T The input success type
 * @template U The output success type
 * @template E The error type (shared between input and output)
 * @param result The Result to chain from
 * @param fn A function that takes the unwrapped Ok value and returns a new Result
 * @returns The result of fn if input was Ok, otherwise the original Err unchanged
 *
 * @example
 * ```ts
 * const result = chain(tryLocalStorageGet('user'), (raw) =>
 *   raw === null ? Err({ tag: 'ParseError', raw: '' }) : tryJSONParse<User>(raw))
 * ```
 */
export function chain<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  return isOk(result) ? fn(result.value) : result
}

/**
 * A discriminated error shape — every error carries a `tag` so consumers
 * can narrow on it (if/switch, or match for exhaustive handling).
 *
 * @template Tag The string literal discriminant
 * @template Extra Additional fields specific to this error
 *
 * @example
 * ```ts
 * type ParseError = TaggedError<'ParseError', { raw: string }>
 * type StorageError = TaggedError<'StorageError', { key: string }>
 * ```
 */
export type TaggedError<Tag extends string, Extra extends object = object> = {
  tag: Tag
} & Extra

/**
 * Exhaustively matches a Result — requires both an ok and an err handler.
 *
 * @template T The success type
 * @template E The error type
 * @template R The return type of both handlers
 * @param result The Result to match on
 * @param handlers Handlers for the ok and err cases
 * @param handlers.ok Called with the unwrapped value when result is Ok
 * @param handlers.err Called with the unwrapped error when result is Err
 * @returns Whichever handler's return value applies
 *
 * @example
 * ```ts
 * const message = matchResult(result, {
 *   ok: (value) => `Got ${value}`,
 *   err: (error) => `Failed: ${error.message}`,
 * })
 * ```
 */
export function matchResult<T, E, R>(
  result: Result<T, E>,
  handlers: { ok: (value: T) => R, err: (error: E) => R },
): R {
  return result.ok ? handlers.ok(result.value) : handlers.err(result.error)
}

/**
 * Exhaustively matches a tagged error union. TypeScript requires a handler
 * for every tag in the union — omitting one is a compile error, and adding
 * a new tag later forces every call site to be updated.
 *
 * @template E The tagged error union type
 * @template Handlers An object with one handler per tag in E
 * @param error The tagged error to match on
 * @param handlers An object mapping each tag to a handler function
 * @returns Whichever handler's return value applies
 *
 * @example
 * ```ts
 * match(result.error, {
 *   ParseError: (e) => console.error('bad json:', e.raw),
 *   StorageError: (e) => console.error('storage failed:', e.key),
 *   // omitting a tag here is a compile error
 * })
 * ```
 */
export function match<
  E extends { tag: string },
  Handlers extends { [K in E["tag"]]: (error: Extract<E, { tag: K }>) => unknown },
>(error: E, handlers: Handlers): ReturnType<Handlers[E["tag"]]> {
  return handlers[error.tag as E["tag"]](error as any) as ReturnType<Handlers[E["tag"]]>
}
