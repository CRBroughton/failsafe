---
"@crbroughton/failsafe": minor
---

Add `collect(results)`: runs every `Result` and collects them,
`Promise.all`-style — unlike `chain()`, which short-circuits on the first
`Err`, `collect()` reports every failure at once. A literal array of
`Result`s infers a real tuple (each position keeps its own `T`/`E`); a
homogeneous array built at runtime (e.g. via `.map()`) collects into
`Result<T[], E[]>` instead.
