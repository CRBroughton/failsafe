import type { Result } from "../safe"
import { Err, isErr, Ok } from "../safe"

/**
 * Short-circuits a `gen()` block with an error. Must only be driven via
 * `yield*` inside a `gen()` generator — calling `.next()` on it directly a
 * second time throws, since resuming past the yield has no meaning outside
 * that context.
 *
 * @template E The type of the error
 * @param error The error to short-circuit with
 *
 * @example
 * ```ts
 * gen(function* () {
 *   if (!email.includes('@')) {
 *     return yield* fail({ tag: 'InvalidEmail', email })
 *   }
 *   // ...
 * })
 * ```
 */
export function* fail<E>(error: E): Generator<E, never, unknown> {
  yield error
  throw new Error("unreachable")
}

/**
 * Unwraps a `Result` inside a `gen()` block via `yield*` — yields the error
 * (short-circuiting the block) if `Err`, or resolves to the value if `Ok`.
 *
 * Always takes a plain, already-resolved `Result<T, E>`. For an async
 * Result-returning call, await it at the call site first:
 * `yield* unwrap(await fetchUser(id))`.
 *
 * @template T The success type
 * @template E The error type
 * @param result The Result to unwrap
 *
 * @example
 * ```ts
 * gen(function* () {
 *   const user = yield* unwrap(await fetchUser(id))
 *   return user.name
 * })
 * ```
 */
export function* unwrap<T, E>(result: Result<T, E>): Generator<E, T, unknown> {
  if (isErr(result)) {
    yield result.error
  }
  return (result as { ok: true, value: T }).value
}

/**
 * Runs a generator block and collects it into a `Result` — early-return
 * error propagation (like Rust's `?` operator) via `yield* fail(...)` and
 * `yield* unwrap(...)`, instead of manually checking `isErr` after every
 * step.
 *
 * Overloaded on sync vs async generators: pass a `function*` for a sync
 * block and get `Result<T, E>` back directly; pass an `async function*` and
 * get `Promise<Result<T, E>>`. Which overload TS picks follows from which
 * kind of function you write — there's no separate name for the async case.
 *
 * @template T The success type
 * @template E The error type
 * @param block A generator function that yields errors via `fail`/`unwrap`
 *   and returns the success value
 * @returns Ok(value) or Err(error) — wrapped in a Promise for async blocks
 *
 * @example
 * ```ts
 * // Sync
 * const slug = gen(function* () {
 *   if (input.trim() === '') {
 *     return yield* fail({ tag: 'EmptyFieldError', field: 'slug' })
 *   }
 *   return input.trim().toLowerCase()
 * })
 * // Result<string, EmptyFieldError>
 *
 * // Async
 * const login = await gen(async function* () {
 *   const { token, userId } = yield* unwrap(await postLogin(email, password))
 *   const user = yield* unwrap(await fetchUserProfile(userId))
 *   return { user, token }
 * })
 * // Result<{ user: UserProfile, token: string }, LoginError>
 * ```
 */
export function gen<T, E>(block: () => Generator<E, T, unknown>): Result<T, E>
export function gen<T, E>(block: () => AsyncGenerator<E, T, unknown>): Promise<Result<T, E>>
export function gen<T, E>(
  block: (() => Generator<E, T, unknown>) | (() => AsyncGenerator<E, T, unknown>),
): Result<T, E> | Promise<Result<T, E>> {
  const iter = block()

  if (Symbol.asyncIterator in iter) {
    return (async (): Promise<Result<T, E>> => {
      const first = await iter.next()
      return first.done ? Ok(first.value) : Err(first.value)
    })()
  }

  const first = iter.next()
  return first.done ? Ok(first.value) : Err(first.value)
}
