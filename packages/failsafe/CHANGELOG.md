# @crbroughton/failsafe

## 0.4.0

### Minor Changes

- e58b347: Add `collect(results)`: runs every `Result` and collects them,
  `Promise.all`-style — unlike `chain()`, which short-circuits on the first
  `Err`, `collect()` reports every failure at once. A literal array of
  `Result`s infers a real tuple (each position keeps its own `T`/`E`); a
  homogeneous array built at runtime (e.g. via `.map()`) collects into
  `Result<T[], E[]>` instead.
- 941654c: Add `partition(results)`: splits a batch of `Result`s into every `Ok`
  value and every `Err` error, without ever failing itself. Unlike
  `collect()`, which treats any single `Err` as a failure of the whole
  batch, `partition()` always returns both buckets — for batch-processing
  use cases (CSV imports, bulk API calls, migration scripts) where
  successful entries shouldn't be discarded just because others failed.

## 0.3.0

### Minor Changes

- 71edb42: Add `@crbroughton/failsafe/gen`: generator-based early-return error
  propagation for `Result`, similar to Rust's `?` operator. `gen()` runs a
  `function*`/`async function*` block and collects it into a `Result` (or
  `Promise<Result>`), short-circuiting via `yield* fail(error)` or
  `yield* unwrap(result)` instead of manual `isErr` checks after every step.

## 0.2.1

### Patch Changes

- Add the missing MIT LICENSE file. The package.json license field already
  said MIT; the file itself was never committed.

## 0.2.0

### Minor Changes

- 2aa5324: Initial release of failsafe: a `Result<T, E>` type with `Ok`/`Err`,
  `isOk`/`isErr`, `safe()`, `chain()`, `TaggedError`, and exhaustive
  matchers (`@crbroughton/failsafe`); `Result`-wrapped browser/Node API
  helpers for JSON, URI, base64, localStorage, URL, and structuredClone
  (`@crbroughton/failsafe/try`); and a left-to-right `pipe()` composition
  helper (`@crbroughton/failsafe/pipe`).
