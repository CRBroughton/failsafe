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
import { chain, isOk, match, matchResult, type TaggedError } from "@crbroughton/failsafe"
import { tryJSONParse, tryLocalStorageGet } from "@crbroughton/failsafe/try"

interface User { name: string }

const result = chain(
  tryLocalStorageGet("user"),
  raw => raw === null
    ? { ok: false as const, error: { tag: "JSONParseError" as const, raw: "" } }
    : tryJSONParse<User>(raw),
)

if (isOk(result)) {
  console.log(result.value.name)
}

const message = matchResult(result, {
  ok: user => `Welcome, ${user.name}`,
  err: error => `Could not load user: ${error.tag}`,
})
```

## Exports

- `@crbroughton/failsafe`: the `Result` type, `Ok`/`Err`, guards, and matchers
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

Extract the value or error as a nullable, for quick one-liners.

```ts
const value = ok(result) // T | null
const error = err(result) // E | null
```

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
  raw === null ? Err({ tag: "ParseError", raw: "" }) : tryJSONParse<User>(raw))
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
| `tryLocalStorageGet(key)` | `localStorage.getItem` | `StorageError` |
| `tryLocalStorageSet(key, value)` | `localStorage.setItem` | `StorageError` |
| `tryURL(input, base?)` | `new URL(...)` | `URLParseError` |
| `tryStructuredClone<T>(value, options?)` | `structuredClone` | `StructuredCloneError` |

```ts
import { tryJSONParse, tryURL } from "@crbroughton/failsafe/try"

const parsed = tryJSONParse<User>(raw)
const url = tryURL(userSuppliedString)

if (isOk(url)) {
  console.log(url.value.hostname)
}
```

## `@crbroughton/failsafe/pipe`

### `pipe(value, ...fns)`

Pipes a value through up to five functions, left to right. Deliberately
independent of `Result`; plain function composition. Compose it with `chain`
for a `Result` pipeline.

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

## Development

This repo uses [devenv](https://devenv.sh) to provide Node and pnpm.

```sh
devenv shell
pnpm install
pnpm exec nx run-many -t build test lint typecheck
```
