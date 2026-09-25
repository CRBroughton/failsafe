# require-match-on-tagged-error

Require a tagged error union (2+ variants) accessed via `.error` to be
handled with `match()`, not used directly.

## Rule details

`match()` already gives compile-time exhaustiveness — TypeScript forces a
handler for every tag in the union, so omitting one is a type error. What
it can't prevent is bypassing `match()` entirely: nothing stops you from
treating the whole union as one opaque blob instead of branching on its
tag. This rule closes that gap.

It's type-aware: a `.error` access is only flagged when its type is
actually a union of 2 or more variants that each carry their own
string-literal `tag` property — the same shape `match()`'s own
`E extends { tag: string }` constraint expects. A plain `Error`, a string,
or a single-variant tagged error has nothing to be exhaustive about, so
none of those are flagged.

The rule has two complementary checks:

1. `.error` is accessed, but not routed through `match()`.
2. An `if (isErr(result))` branch never touches `.error` at all — the
   error isn't just handled sloppily, it's silently discarded entirely.

Each case is caught by exactly one of the two — the second check only
fires when `.error` is never accessed anywhere in the branch, so a branch
that *does* touch `.error` (correctly or not) is only ever reported by the
first check, never both.

👎 Examples of **incorrect** code:

```ts
if (isErr(result)) {
  console.log(result.error) // bypasses match() — no per-tag handling at all
}

if (isErr(result)) {
  console.log("something failed") // never even looks at result.error
}

if (result.error.tag === "ParseError") { // manual, non-exhaustive narrowing
  // ...
}

function getError() {
  return result.error // escapes unmatched
}
```

👍 Examples of **correct** code:

```ts
if (isErr(result)) {
  match(result.error, {
    ParseError: e => console.error("bad json:", e.raw),
    StorageError: e => console.error("storage failed:", e.key),
    // omitting a tag here is a compile error
  })
}
```

## Limitations

This rule is purely structural and doesn't do interprocedural or dataflow
analysis:

- **Only triggers on `x.error` property access.** A tagged union value
  that arrives some other way — a function parameter, a variable that
  wasn't assigned directly from `.error` — isn't detected. Tracing every
  possible origin of a value would require real dataflow analysis, which
  this rule doesn't attempt (same reasoning as
  [no-raw-throwing-call](./no-raw-throwing-call.md)'s "named helper
  function" limitation).
- **Assigning to a variable always escapes detection.** `const e =
  result.error` is allowed and not traced any further, so
  `const e = result.error; console.log(e)` is not flagged even though it
  has the same problem as `console.log(result.error)` directly. Catching
  that would require tracking every reference to `e`.
- **The "never touches `.error`" check only recognizes the literal
  `if (isErr(x)) { ... }` pattern.** `if (!isOk(x)) { ... }`, the implicit
  `else` branch of `if (isOk(x)) { ... } else { ... }`, ternaries, and
  `switch` all escape it — none of those are recognized as introducing an
  Err-handling obligation. Same reasoning as the rest of this rule:
  recognizing every control-flow-equivalent form would require broader
  analysis than a syntax-first rule attempts.
- That same check only confirms `.error` is accessed *somewhere* in the
  branch — not that it's the same `result` being narrowed, and not that it
  correctly reaches `match()`. That correctness check is the first rule
  above; the two together cover "did you look at the error" and "did you
  look at it properly," but not in a single combined pass.

## When not to use it

If your error types aren't tagged unions (no `tag` discriminant), or you
have call sites that intentionally treat a multi-tag error generically
(e.g. a catch-all logger that doesn't need to branch per tag), don't
enable this rule for those files.
