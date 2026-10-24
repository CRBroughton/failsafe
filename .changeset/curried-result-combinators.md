---
"@crbroughton/failsafe": minor
---

Add `andThen(fn)` and `mapErr(fn)`, and overload `unwrapOr` to accept a
curried 1-arg form — curried companions to `chain`/`unwrapOr` for composing
a `Result` pipeline through `pipe` (from `@crbroughton/failsafe/pipe`)
instead of nesting `chain` calls.

Also add `fromOption(onNone)`, which collapses a `Result<Option<T>, E>`
down to `Result<T, E>` — mirrors Rust's `Option::ok_or`. Lets a pipeline
flow past a step like `tryLocalStorageGet` (which returns
`Result<Option<string>, StorageError>` to keep "missing" distinct from
"Err") without a manual `matchOption` in the middle of the chain.

```ts
import { andThen, fromOption, mapErr, unwrapOr } from "@crbroughton/failsafe"
import { pipe } from "@crbroughton/failsafe/pipe"

const name = pipe(
  tryLocalStorageGet("user"),
  fromOption(missingUserError),
  andThen(parseUser),
  andThen(validateUser),
  mapErr(e => ({ ...e, source: "storage" })),
  unwrapOr(defaultUser),
)
```

`missingUserError`/`parseUser`/`validateUser` are named functions with an
explicit return type pinned to a shared error union — see the README for
why that's needed once a pipeline's steps produce different error types.
