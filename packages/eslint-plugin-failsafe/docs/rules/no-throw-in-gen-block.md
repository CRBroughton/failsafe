# no-throw-in-gen-block

Disallow a raw `throw` inside a `gen()` block — it escapes as a real
exception instead of becoming an `Err`.

## Rule details

`gen()` exists to let you write early-return error propagation
(`yield* unwrap(...)`, `yield* fail(...)`) without manual `if
(isErr(...))` chains, converting every failure into a typed `Err` in the
returned `Result`. A raw `throw` inside that same block sidesteps all of
that — it becomes a real exception that propagates up past `gen()`
entirely, breaking the guarantee that calling code gets a `Result` back
instead of something that can throw.

Like [no-raw-throwing-call](./no-raw-throwing-call.md), this rule is pure
AST syntax — no type information needed.

👎 Examples of **incorrect** code:

```ts
gen(function* () {
  if (!email.includes("@")) {
    throw new Error("invalid email") // escapes gen() as a real exception
  }
  return yield * unwrap(await postLogin(email, password))
})
```

👍 Examples of **correct** code:

```ts
gen(function* () {
  if (!email.includes("@")) {
    return yield * fail<InvalidEmail>({ tag: "InvalidEmail", email })
  }
  return yield * unwrap(await postLogin(email, password))
})
```

## Limitations

This rule is deliberately conservative and purely syntactic, matching
`no-raw-throwing-call`'s approach: a `throw` is only recognized when it
sits **directly** inside the generator function passed to `gen(...)` —
not nested inside another callback within that block (e.g.
`items.forEach(() => { throw ... })`), and not factored into a named
helper function called from within the block. Both would require
interprocedural analysis this rule doesn't attempt.

A `throw` inside a `catch` block within the `gen()` generator is still
flagged, including a plain rethrow (`catch (e) { throw e }`) — if that's
intentional (e.g. deliberately letting a genuine programmer error crash
rather than becoming a typed `Err`), use an inline `eslint-disable` for
that specific case rather than disabling the rule broadly.

## When not to use it

If you intentionally mix exceptions and `Result`s within `gen()` blocks
(e.g. treating some failures as truly unrecoverable and letting them
crash), don't enable this rule for those files.
