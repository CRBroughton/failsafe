---
"@crbroughton/failsafe": minor
---

Add `@crbroughton/failsafe/gen`: generator-based early-return error
propagation for `Result`, similar to Rust's `?` operator. `gen()` runs a
`function*`/`async function*` block and collects it into a `Result` (or
`Promise<Result>`), short-circuiting via `yield* fail(error)` or
`yield* unwrap(result)` instead of manual `isErr` checks after every step.
