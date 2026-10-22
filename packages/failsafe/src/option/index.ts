/**
 * Represents the presence of a value.
 * @template T The type of the contained value
 */
export interface Some<T> {
  some: true
  value: T
}

/**
 * Represents the absence of a value.
 */
export interface None {
  some: false
}

/**
 * An Option type representing either presence (Some) or absence (None) of
 * a value. Mirrors Result's `ok` discriminant with `some`, so the two read
 * the same way.
 *
 * @template T The type of the contained value
 *
 * @example
 * ```ts
 * const option: Option<number> = some(42)
 *
 * if (option.some === false) {
 *   console.log('nothing here')
 * } else {
 *   console.log(option.value) // TypeScript knows this is number
 * }
 * ```
 */
export type Option<T> = Some<T> | None

/**
 * The single None value. Absence carries no data, so there is only ever
 * one of it.
 */
export const none: None = { some: false as const }

/**
 * Creates a Some Option wrapping the given value.
 *
 * @template T The type of the value
 * @param value The value to wrap
 * @returns A Some option containing the value
 *
 * @example
 * ```ts
 * const option = some(42)
 * // option is { some: true, value: 42 }
 * ```
 */
export const some = <T>(value: T): Some<T> => ({ some: true as const, value })

/**
 * Type guard to check if an Option is Some.
 * Narrows the type to Some<T> when true.
 *
 * @template T The type of the contained value
 * @param option The Option to check
 * @returns true if the option is Some, false otherwise
 */
export const isSome = <T>(option: Option<T>): option is Some<T> => option.some

/**
 * Type guard to check if an Option is None.
 * Narrows the type to None when true.
 *
 * @template T The type of the contained value
 * @param option The Option to check
 * @returns true if the option is None, false otherwise
 */
export const isNone = <T>(option: Option<T>): option is None => !option.some

/**
 * Exhaustively matches an Option — requires both a some and a none handler.
 * Lowercase arms mirror matchResult's ok/err.
 *
 * @template T The contained value type
 * @template R The return type of both handlers
 * @param option The Option to match on
 * @param arms Handlers for the some and none cases
 * @param arms.some Called with the unwrapped value when option is Some
 * @param arms.none Called when option is None
 * @returns Whichever handler's return value applies
 *
 * @example
 * ```ts
 * const message = matchOption(option, {
 *   some: (value) => `Got ${value}`,
 *   none: () => 'Nothing',
 * })
 * ```
 */
export function matchOption<T, R>(
  option: Option<T>,
  arms: { some: (value: T) => R, none: () => R },
): R {
  return option.some ? arms.some(option.value) : arms.none()
}

/**
 * Converts a nullable value into an Option. Use this when absence is a
 * normal outcome that needs no explanation (e.g. an optional setting) —
 * unlike `fromNullable` (see `../safe`), which returns a `Result` and keeps
 * the caller's reason for the absence.
 *
 * Falsy-but-present values (`0`, `''`, `false`) stay `Some` — only `null`
 * and `undefined` count as absence.
 *
 * @template T The type of the value when present
 * @param value The nullable value to convert
 * @returns Some(value) if present, None if null or undefined
 *
 * @example
 * ```ts
 * const timeout = optionFromNullable(config.timeout)
 * const effective = matchOption(timeout, { some: (v) => v, none: () => DEFAULT_TIMEOUT })
 * ```
 */
export function optionFromNullable<T>(
  value: T | null | undefined,
): Option<NonNullable<T>> {
  return value == null ? none : some(value)
}
