# @crbroughton/failsafe

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
