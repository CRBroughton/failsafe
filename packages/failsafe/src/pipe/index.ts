/**
 * Pipes a value through a sequence of functions, left to right — each
 * function's output becomes the next function's input.
 *
 * Deliberately independent of Result/safe: this is plain function
 * composition and knows nothing about Ok/Err or short-circuiting. For a
 * pipeline that stops early on an Err, use `chain` from the package root
 * instead — the two compose fine together (see example below).
 *
 * @param value The initial value
 * @returns The result of applying every function in sequence
 *
 * @example
 * ```ts
 * const slug = pipe('  Hello World  ', (s) => s.trim(), (s) => s.toLowerCase(), (s) => s.replace(/\s+/g, '-'))
 * // 'hello-world'
 * ```
 *
 * @example
 * ```ts
 * // Composing with andThen/mapErr/unwrapOr (from '@crbroughton/failsafe')
 * // for a Result pipeline:
 * import { andThen, Err, matchOption, unwrapOr } from '@crbroughton/failsafe'
 * import { tryLocalStorageGet, tryJSONParse } from '@crbroughton/failsafe/try'
 *
 * const name = pipe(
 *   tryLocalStorageGet('user'),
 *   andThen((raw) => matchOption(raw, {
 *     some: (value) => tryJSONParse<User>(value),
 *     none: () => Err({ tag: 'JSONParseError', raw: '' }),
 *   })),
 *   unwrapOr(defaultUser),
 * )
 * ```
 */
export function pipe<T>(value: T): T
export function pipe<T, A>(value: T, fn1: (v: T) => A): A
export function pipe<T, A, B>(value: T, fn1: (v: T) => A, fn2: (v: A) => B): B
export function pipe<T, A, B, C>(value: T, fn1: (v: T) => A, fn2: (v: A) => B, fn3: (v: B) => C): C
export function pipe<T, A, B, C, D>(
  value: T,
  fn1: (v: T) => A,
  fn2: (v: A) => B,
  fn3: (v: B) => C,
  fn4: (v: C) => D,
): D
export function pipe<T, A, B, C, D, E>(
  value: T,
  fn1: (v: T) => A,
  fn2: (v: A) => B,
  fn3: (v: B) => C,
  fn4: (v: C) => D,
  fn5: (v: D) => E,
): E
export function pipe(value: unknown, ...fns: Array<(v: unknown) => unknown>): unknown {
  return fns.reduce((acc, fn) => fn(acc), value)
}
