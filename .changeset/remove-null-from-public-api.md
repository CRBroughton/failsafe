---
"@crbroughton/failsafe": major
---

Remove `null` from the public API: `ok(result)`/`err(result)` now return
`Option<T>`/`Option<E>` instead of `T | null`/`E | null`, and
`tryLocalStorageGet` now returns `Result<Option<string>, StorageError>`
instead of `Result<string | null, StorageError>`. A missing key is a normal
outcome (`None`), kept distinct from an actual storage failure (`Err`).

Added the `Option<T>` type and its helpers — `Some`, `None`, `some`, `none`,
`isSome`, `isNone`, `matchOption`, `optionFromNullable` — exported from the
package root alongside the existing `Result` helpers. Also added
`fromNullable` (converts a nullable value into a `Result`, with a caller-
supplied reason for the absence), `unwrapOr`/`unwrapOrElse` on `Result`, and
two new `/try` wrappers — `tryQuerySelector`/`tryURLSearchParamsGet` — for
browser APIs that return `null` instead of throwing.

See the README's "Migrating to 1.0.0" section for call-site updates.
