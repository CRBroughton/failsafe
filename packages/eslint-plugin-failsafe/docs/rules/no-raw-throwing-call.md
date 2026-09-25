# no-raw-throwing-call

Disallow direct calls to native APIs that `@crbroughton/failsafe/try` already
wraps, unless the call is routed through `safe(() => ...)` or the matching
`tryX()` helper.

## Rule details

Mirrors `@crbroughton/failsafe/try`'s own table exactly, so the rule and the
library can't drift apart:

| Native call | Flagged as | `tryX()` helper |
| --- | --- | --- |
| `JSON.parse(...)` | member call | `tryJSONParse` |
| `JSON.stringify(...)` | member call | `tryJSONStringify` |
| `decodeURIComponent(...)` | identifier call | `tryURIDecode` |
| `encodeURIComponent(...)` | identifier call | `tryURIEncode` |
| `atob(...)` | identifier call | `tryBase64Decode` |
| `btoa(...)` | identifier call | `tryBase64Encode` |
| `localStorage.getItem(...)` | member call | `tryLocalStorageGet` |
| `localStorage.setItem(...)` | member call | `tryLocalStorageSet` |
| `new URL(...)` | new expression | `tryURL` |
| `structuredClone(...)` | identifier call | `tryStructuredClone` |

👎 Examples of **incorrect** code:

```ts
const user = JSON.parse(raw)

const decoded = atob(input)

function helper() {
  return JSON.parse(raw) // not recognized — see Limitations
}

safe(JSON.parse(raw)) // evaluated eagerly, before safe() ever runs
safe(async () => JSON.parse(raw)) // a sync throw here never reaches safe()'s catch
```

👍 Examples of **correct** code:

```ts
const user = safe(() => JSON.parse(raw))

const decoded = safe(() => atob(input))

const parsed = tryJSONParse<User>(raw)
```

## Limitations

This rule is deliberately conservative and purely syntactic — it does not
use type information or interprocedural analysis. A throwing call is only
recognized as protected when it sits **directly** inside the body of a
non-`async` arrow function or function expression that is itself
`arguments[0]` of a call to `safe(...)`.

Two patterns are consequently **not** recognized, even though they may be
safe (or unsafe) at runtime in ways this rule can't verify:

- **Nested inside another callback within the thunk** — e.g.
  `safe(() => arr.map(x => JSON.parse(x)))`. At runtime this is actually
  protected (the throw propagates synchronously up through `.map()` to
  `safe()`'s `catch`), but the rule only checks the *nearest* enclosing
  function, which here is the `.map()` callback, not the thunk. Pull the
  throwing call out of the nested callback, or wrap it in its own
  `safe()`/`tryX()` call.
- **Factored into a named helper function** — e.g.
  `function helper() { return JSON.parse(raw) }`, even if `helper` is only
  ever called from within a `safe()` thunk elsewhere. Proving that would
  require tracing every call site of `helper`, which this rule doesn't
  attempt.

A plain `try`/`catch` around a flagged call does **not** satisfy the rule —
it specifically enforces the `safe()`/`tryX()` idiom, not "any error
handling exists somewhere."

## When not to use it

If your codebase doesn't use `@crbroughton/failsafe`, or you intentionally
let some of these calls throw (e.g. deliberately unguarded at a boundary
that's expected to crash), don't enable this rule for those files.
