# no-async-thunk-in-safe

Disallow passing an async thunk to `safe()` — it matches the *sync*
overload and returns `Ok(Promise<T>)` without ever awaiting or catching
the rejection.

## Rule details

`safe()` has two overloads: pass a thunk (`() => value`) for sync code, or
a `Promise` directly for async code. Calling an async function never
throws synchronously — it returns a `Promise` immediately — so
`safe(async () => ...)` always matches the *sync* overload. The result is
`Ok(Promise<T>)`, not the awaited value, and if that promise later
rejects, nothing catches it. This is documented directly in `safe()`'s own
JSDoc as a footgun; this rule enforces it mechanically.

Unlike [no-raw-throwing-call](./no-raw-throwing-call.md) and
[require-match-on-tagged-error](./require-match-on-tagged-error.md), this
rule is pure AST syntax — no type information needed, so it applies
everywhere `safe()` is called, including files without type-aware linting
enabled.

👎 Examples of **incorrect** code:

```ts
const result = safe(async () => fetchData())
// Result<Promise<Data>, Error> — never awaited, rejection never caught

const result = safe(async () => {
  return await fetchData()
})
```

👍 Examples of **correct** code:

```ts
const result = await safe(fetchData())
// Result<Data, Error>

const tagged = await safe(
  fetchData(),
  (e): FetchError => ({ tag: "FetchError", message: String(e) }),
)
```

## Limitations

This rule only checks whether the thunk passed to `safe()` is itself
declared `async` — it doesn't verify that a sync thunk is actually free of
async work smuggled in some other way (e.g. calling an async function and
ignoring its returned promise inside a sync thunk is a different problem
this rule doesn't detect).

## When not to use it

If your codebase never calls `safe()` with a thunk at all (always passing
promises directly), this rule has nothing to do and can be safely
disabled.
