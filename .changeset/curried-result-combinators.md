---
"@crbroughton/failsafe": minor
---

Add `andThen(fn)` and `mapErr(fn)`, and overload `unwrapOr` to accept a
curried 1-arg form — curried companions to `chain`/`unwrapOr` for composing
a `Result` pipeline through `pipe` (from `@crbroughton/failsafe/pipe`)
instead of nesting `chain` calls.

```ts
import { andThen, mapErr, unwrapOr } from "@crbroughton/failsafe"
import { pipe } from "@crbroughton/failsafe/pipe"

const name = pipe(
  tryLocalStorageGet("user"),
  andThen(raw => tryJSONParse<User>(raw)),
  andThen(validateUser),
  mapErr(e => ({ ...e, source: "storage" })),
  unwrapOr(defaultUser),
)
```
