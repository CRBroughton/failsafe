# FailSafe

Type-safe error handling utilities for TypeScript. A `Result<T, E>` type
(inspired by Rust) plus helpers for turning throwing browser/Node APIs into
values instead of exceptions.

Lightweight, dependency-free alternative to neverthrow, plus additional
helpers for wrapping browser/Node APIs that throw exceptions.

## Install

```sh
pnpm add @crbroughton/failsafe
```

## Quick start

```ts
import { chain, isOk, match, matchOption, matchResult, type TaggedError } from "@crbroughton/failsafe"
import { tryJSONParse, tryLocalStorageGet } from "@crbroughton/failsafe/try"

interface User { name: string }

const result = chain(
  tryLocalStorageGet("user"),
  raw => matchOption(raw, {
    some: value => tryJSONParse<User>(value),
    none: () => ({ ok: false as const, error: { tag: "JSONParseError" as const, raw: "" } }),
  }),
)

if (isOk(result)) {
  console.log(result.value.name)
}

const message = matchResult(result, {
  ok: user => `Welcome, ${user.name}`,
  err: error => `Could not load user: ${error.tag}`,
})
```

`tryLocalStorageGet` returns `Result<Option<string>, StorageError>` — a
missing key is a normal outcome (`None`), kept distinct from an actual
storage failure (`Err`). See [Option](#option) below.

## Exports

- `@crbroughton/failsafe`: the `Result` type, `Ok`/`Err`, guards, and matchers, plus the `Option` type and its helpers
- `@crbroughton/failsafe/try`: `Result`-returning wrappers around throwing web/Node APIs
- `@crbroughton/failsafe/pipe`: plain left-to-right function composition
- `@crbroughton/failsafe/gen`: generator-based early-return error propagation

## `@crbroughton/failsafe`

### `Result<T, E = Error>`

```ts
type Result<T, E = Error> = Ok<T> | Err<E>
interface Ok<T> { ok: true, value: T }
interface Err<E> { ok: false, error: E }
```

### `Ok(value)` / `Err(error)`

Construct a `Result` directly.

```ts
const success = Ok(42) // { ok: true, value: 42 }
const failure = Err("boom") // { ok: false, error: "boom" }
```

### `isOk(result)` / `isErr(result)`

Type guards that narrow a `Result` to `Ok<T>` or `Err<E>`.

```ts
if (isOk(result)) {
  result.value // T
}
```

### `ok(result)` / `err(result)`

Extract the value or error as an `Option`, for quick one-liners.

```ts
const value = ok(result) // Option<T>
const error = err(result) // Option<E>

const name = matchOption(ok(result), { some: v => v.name, none: () => "Guest" })
```

> **Breaking change (1.0.0):** previously returned `T | null` / `E | null`.
> That made `ok(Ok(null))` and `ok(Err(...))` indistinguishable — both came
> back as `null`. Returning `Option` fixes that: `{ some: true, value: null }`
> vs. `{ some: false }`. Replace `ok(result)?.foo ?? fallback` with
> `matchOption(ok(result), { some: v => v.foo, none: () => fallback })`, or
> reach for `unwrapOr`/`unwrapOrElse` on the `Result` directly when you don't
> need the `Option` in between.

### `safe(fn | promise, mapError?)`

Runs a throwing sync function, or awaits a promise, and returns a `Result`
instead of throwing/rejecting. Optionally maps the caught value into a typed
error.

```ts
// Sync: pass a thunk
const parsed = safe(() => JSON.parse(raw)) // Result<any, Error>

// Async: pass the Promise directly (not a function that returns one)
const fetched = await safe(fetch("/api/data")) // Result<Response, Error>

// With a typed error mapper
type FetchError = TaggedError<"FetchError", { url: string }>
const tagged = await safe(
  fetchData(),
  (): FetchError => ({ tag: "FetchError", url: "/api/data" }),
)
```

> Passing an async function itself (`safe(async () => ...)`) matches the sync
> overload, since calling it never throws synchronously; it just returns a
> Promise. Always pass the awaited Promise directly for async code.

### `chain(result, fn)`

Chains a `Result`-returning function onto an existing `Result`,
short-circuiting on `Err`.

```ts
const result = chain(tryLocalStorageGet("user"), raw =>
  matchOption(raw, {
    some: value => tryJSONParse<User>(value),
    none: () => Err({ tag: "ParseError", raw: "" }),
  }))
```

### `collect(results)`

Runs every `Result` and collects them, `Promise.all`-style — unlike
`chain()`, which short-circuits on the first `Err`, `collect()` reports
every failure at once. Pass a literal array and each position keeps its
own `T`/`E` (a real tuple back, not a widened array); pass a
runtime-built homogeneous array (e.g. from `.map()`) and it collects into
`Result<T[], E[]>` instead.

```ts
const results = collect([
  validateEmail(form.email),
  validatePassword(form.password),
  validateAge(form.age),
])
// Result<[string, string, number], (InvalidEmailError | TooShortError | TooYoungError)[]>

if (isErr(results)) {
  return results // every field's error, not just the first
}
const [email, password, age] = results.value // a real tuple
```

### `partition(results)`

Splits a batch of `Result`s into every `Ok` value and every `Err` error,
without ever failing itself — unlike `collect()`, which treats any single
`Err` as a failure of the whole batch, `partition()` always returns both
buckets. Use `collect()` when the batch only counts if every entry
succeeds; use `partition()` when successes shouldn't be held hostage by
failures (CSV imports, bulk API calls, migration scripts).

```ts
const results = csvRows.map((row, i) => parseRow(i + 1, row))
const { oks, errs } = partition(results)

console.log(`imported ${oks.length} contacts, ${errs.length} rows failed`)
// the successful rows go through even if others failed
```

### `TaggedError<Tag, Extra?>`

A discriminated error shape: every error carries a `tag` so consumers can
narrow on it.

```ts
type ParseError = TaggedError<"ParseError", { raw: string }>
type StorageError = TaggedError<"StorageError", { key: string }>
```

### `matchResult(result, { ok, err })`

Exhaustively matches a `Result`, requiring both handlers.

```ts
const message = matchResult(result, {
  ok: value => `Got ${value}`,
  err: error => `Failed: ${error.message}`,
})
```

### `match(taggedError, handlers)`

Exhaustively matches a tagged error union. TypeScript requires a handler for
every tag, and adding a new tag later forces every call site to update.

```ts
match(result.error, {
  ParseError: e => console.error("bad json:", e.raw),
  StorageError: e => console.error("storage failed:", e.key),
  // omitting a tag here is a compile error
})
```

### `unwrapOr(result, fallback)` / `unwrapOrElse(result, fn)`

Extract the value from a `Result`, or fall back — for when you just want a
value and don't need to branch on the error.

```ts
const timeout = unwrapOr(tryJSONParse<number>(raw), DEFAULT_TIMEOUT)

const config = unwrapOrElse(tryJSONParse<Config>(raw), (error) => {
  console.warn("using default config:", error)
  return DEFAULT_CONFIG
})
```

### `andThen(fn)` / `mapErr(fn)` / `unwrapOr(fallback)`

Curried companions to `chain`/`unwrapOr`, for composing a `Result` pipeline
through `pipe` (from `@crbroughton/failsafe/pipe`) instead of nesting calls.
`unwrapOr` is overloaded: call it with both arguments for the data-first form
above, or with just the fallback to get the curried form back.

```ts
import { andThen, mapErr, unwrapOr } from "@crbroughton/failsafe"
import { pipe } from "@crbroughton/failsafe/pipe"
import { tryJSONParse } from "@crbroughton/failsafe/try"

const timeout = pipe(
  tryJSONParse<number>(raw),
  andThen(n => (n > 0 ? Ok(n) : Err({ tag: "JSONParseError", raw }))),
  mapErr(e => ({ ...e, source: "config" })),
  unwrapOr(DEFAULT_TIMEOUT),
)
```

### `fromOption(onNone)`

Collapses a `Result<Option<T>, E>` down to `Result<T, E>`, requiring a
reason for `None` — mirrors Rust's `Option::ok_or`. Curried, for composing
through `pipe`: lets a pipeline flow past a step like `tryLocalStorageGet`
(which returns `Result<Option<string>, StorageError>` to keep "missing"
distinct from "Err") without a manual `matchOption` in the middle of the
chain.

A pipeline with steps that each produce a *different* error type needs one
shared error union across the whole chain — `andThen`/`fromOption` fix `E`
from the first argument they see, so a later step returning a narrower
error won't line up on its own. Give each step its own named function with
an explicit return type pinned to the shared union, rather than inlining
the steps as anonymous arrows inside `pipe`:

```ts
import type { Result, TaggedError } from "@crbroughton/failsafe"
import { andThen, Err, fromOption, mapErr, Ok, unwrapOr } from "@crbroughton/failsafe"
import { pipe } from "@crbroughton/failsafe/pipe"
import type { JSONParseError, StorageError } from "@crbroughton/failsafe/try"
import { tryJSONParse, tryLocalStorageGet } from "@crbroughton/failsafe/try"

interface User { id: string }
type ValidationError = TaggedError<"ValidationError", { reason: string }>
type UserError = StorageError | JSONParseError | ValidationError

const defaultUser: User = { id: "guest" }

function missingUserError(): StorageError {
  return { tag: "StorageError", key: "user" }
}

function parseUser(raw: string): Result<User, UserError> {
  return tryJSONParse<User>(raw)
}

function validateUser(user: User): Result<User, UserError> {
  return user.id.length > 0 ? Ok(user) : Err({ tag: "ValidationError", reason: "missing id" })
}

const name = pipe(
  tryLocalStorageGet("user"),
  fromOption(missingUserError),
  andThen(parseUser),
  andThen(validateUser),
  mapErr(e => ({ ...e, source: "storage" })),
  unwrapOr(defaultUser),
)
```

See [`apps/playground/app/pages/index.vue`](../../apps/playground/app/pages/index.vue)
for this example running end to end.

### `fromNullable(value, onNull)`

Converts a nullable value into a `Result`, requiring a reason for the
absence. Use this at the edges — a missing route param, a required field —
where absence is itself an error the caller must explain. For absence that's
a normal outcome (an optional setting), use `optionFromNullable` instead,
which returns an `Option` with no reason attached.

```ts
const result = fromNullable(
  req.params.id,
  (): MissingParamError => ({ tag: "MissingParamError", param: "id" }),
)
```

## Option

A tagged union mirroring `Result`, for values that may simply be absent
(no error attached). Reads the same way as `Result`: `some`/`none` instead
of `ok`/`error`.

```ts
type Option<T> = Some<T> | None
interface Some<T> { some: true, value: T }
interface None { some: false }
```

### `some(value)` / `none`

Construct an `Option` directly. `none` is a single stable value — absence
carries no data.

```ts
const present = some(42) // { some: true, value: 42 }
const absent = none // { some: false }
```

### `isSome(option)` / `isNone(option)`

Type guards that narrow an `Option` to `Some<T>` or `None`.

```ts
if (isSome(option)) {
  option.value // T
}
```

### `matchOption(option, { some, none })`

Exhaustively matches an `Option`, requiring both handlers.

```ts
const message = matchOption(option, {
  some: value => `Got ${value}`,
  none: () => "Nothing",
})
```

### `optionFromNullable(value)`

Converts a nullable value into an `Option`. Absence is fine here — no
reason is attached, unlike `fromNullable` above. Falsy-but-present values
(`0`, `""`, `false`) stay `Some`; only `null`/`undefined` become `None`.

```ts
const timeout = optionFromNullable(config.timeout)
const effective = matchOption(timeout, { some: v => v, none: () => DEFAULT_TIMEOUT })
```

## `@crbroughton/failsafe/try`

`Result`-returning wrappers around browser/Node APIs that throw. Each
mirrors its native function's signature exactly (including overloaded
argument types) and returns a `TaggedError` on failure.

| Function | Wraps | Error tag |
| --- | --- | --- |
| `tryJSONParse<T>(raw, reviver?)` | `JSON.parse` | `JSONParseError` |
| `tryJSONStringify(value, replacer?, space?)` | `JSON.stringify` | `JSONStringifyError` |
| `tryURIDecode(input)` | `decodeURIComponent` | `URIError` |
| `tryURIEncode(input)` | `encodeURIComponent` | `URIError` |
| `tryBase64Decode(input)` | `atob` | `Base64Error` |
| `tryBase64Encode(input)` | `btoa` | `Base64Error` |
| `tryLocalStorageGet(key)` | `localStorage.getItem` | `StorageError`, returns `Result<Option<string>, StorageError>` |
| `tryLocalStorageSet(key, value)` | `localStorage.setItem` | `StorageError` |
| `tryURL(input, base?)` | `new URL(...)` | `URLParseError` |
| `tryStructuredClone<T>(value, options?)` | `structuredClone` | `StructuredCloneError` |

Two more wrap APIs that return `null` rather than throw — absence there is a
normal outcome, so these return an `Option` directly rather than a `Result`:

| Function | Wraps |
| --- | --- |
| `tryQuerySelector<T>(selector, root?)` | `Element.querySelector` |
| `tryURLSearchParamsGet(params, key)` | `URLSearchParams.get` |

```ts
import { tryJSONParse, tryURL } from "@crbroughton/failsafe/try"

const parsed = tryJSONParse<User>(raw)
const url = tryURL(userSuppliedString)

if (isOk(url)) {
  console.log(url.value.hostname)
}

const button = tryQuerySelector<HTMLButtonElement>("#submit")
matchOption(button, {
  some: el => el.addEventListener("click", onSubmit),
  none: () => console.warn("submit button not found"),
})
```

## `@crbroughton/failsafe/pipe`

### `pipe(value, ...fns)`

Pipes a value through up to five functions, left to right. Deliberately
independent of `Result`; plain function composition. Compose it with
`andThen`/`mapErr`/`unwrapOr` (curried, see above) for a `Result` pipeline.

```ts
import { pipe } from "@crbroughton/failsafe/pipe"

const slug = pipe(
  "  Hello World  ",
  s => s.trim(),
  s => s.toLowerCase(),
  s => s.replace(/\s+/g, "-"),
)
// 'hello-world'
```

## `@crbroughton/failsafe/gen`

Early-return error propagation for `Result` — like Rust's `?` operator, via
generators and `yield*`. Instead of manually checking `isErr` after every
step, short-circuit with `yield* fail(...)` or `yield* unwrap(existingResult)`
and let `gen()` collect the outcome into a `Result`.

### `gen(block)`

Runs a generator block and collects it into a `Result`. Overloaded on sync
vs async: pass a `function*` and get `Result<T, E>` back directly; pass an
`async function*` and get `Promise<Result<T, E>>`. There's no separate name
for the async case — which overload applies follows from which kind of
function you write.

### `fail(error)`

Short-circuits a `gen()` block with an error, via `yield* fail(...)`.

### `unwrap(result)`

Unwraps a `Result` inside a `gen()` block via `yield* unwrap(...)` — yields
the error (short-circuiting) if `Err`, or resolves to the value if `Ok`.
Always takes a plain, already-resolved `Result<T, E>`; for an async
Result-returning call, await it at the call site: `yield* unwrap(await fetchUser(id))`.

```ts
import type { TaggedError } from "@crbroughton/failsafe"
import { fail, gen, unwrap } from "@crbroughton/failsafe/gen"

type EmptyFieldError = TaggedError<"EmptyFieldError", { field: string }>

// Sync
const slug = gen(function* () {
  if (input.trim() === "") {
    return yield * fail<EmptyFieldError>({ tag: "EmptyFieldError", field: "slug" })
  }
  return input.trim().toLowerCase()
})
// Result<string, EmptyFieldError>

// Async — chaining multiple Result-returning calls
const login = await gen(async function* () {
  const { token, userId } = yield * unwrap(await postLogin(email, password))
  const user = yield * unwrap(await fetchUserProfile(userId))
  return { user, token }
})
// Result<{ user: UserProfile, token: string }, LoginError>
```

## Migrating to 1.0.0

`ok()` and `err()` now return `Option<T>`/`Option<E>` instead of `T | null`/
`E | null`, and `tryLocalStorageGet` now returns `Result<Option<string>,
StorageError>` instead of `Result<string | null, StorageError>`. Both are
breaking changes. To update:

- `ok(result)?.foo ?? fallback` → `matchOption(ok(result), { some: v => v.foo, none: () => fallback })`
- `err(result)` truthiness checks → `isSome(err(result))`
- `raw === null ? ... : tryJSONParse(raw)` after `tryLocalStorageGet` →
  `matchOption(raw, { some: value => tryJSONParse(value), none: () => ... })`

## License

MIT
