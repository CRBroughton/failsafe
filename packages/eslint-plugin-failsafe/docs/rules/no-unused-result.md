# no-unused-result

Require a `Result`-producing call used as its own statement to be
assigned to a variable, so the `Err` case isn't silently discarded.

## Rule details

A `Result<T, E>` is just an object — nothing stops one from being produced
and immediately thrown away, silently losing the `Err` case the same way
an un-awaited `Promise` silently loses a rejection. This rule closes that
gap, mirroring `@typescript-eslint/no-floating-promises`'s reasoning.

It's type-aware and purely structural — it flags **any** bare-statement
expression whose type is `Result`-shaped (a union with both an `ok: true`
and an `ok: false` member), regardless of which function produced it. That
means it catches the library's own `safe()`/`tryX()`/`gen()` calls just as
well as any of your own functions that return `Result<T, E>`.

There is deliberately **no escape hatch** (no `void`-prefix exemption like
`no-floating-promises` offers). Every Result-producing call used as its
own statement must be assigned to a variable — even one you never read
afterward. This rule only polices "was it captured at all," not "was it
acted on" — a plain unused binding is a separate, existing rule's job
(`no-unused-vars`). The only opt-out is a plain `eslint-disable` comment.

👎 Examples of **incorrect** code:

```ts
safe(() => localStorage.setItem("key", value))
// if this throws, nobody ever finds out

await safeAsync()
// same problem, async form
```

👍 Examples of **correct** code:

```ts
const result = safe(() => localStorage.setItem("key", value))
if (isErr(result)) {
  console.error("failed to persist:", result.error)
}

// even a fire-and-forget case has to bind it — there's no void escape
// hatch, only assignment
const result = safe(() => trackAnalyticsEvent("page_view"))
```

## Limitations

This rule only recognizes the literal bare-statement position:
`ExpressionStatement > CallExpression`, or the `await` form of it. It
doesn't trace a Result through indirection — e.g. `void someWrapper(() =>
safe(...))`, or a Result produced inside a callback passed to another
function — those escape detection.

## When not to use it

If your codebase doesn't use `Result<T, E>` consistently, or you have
call sites where a discarded Result is genuinely fine and you'd rather
not require an (even unused) binding for it, don't enable this rule for
those files.
