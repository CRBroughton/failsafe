---
"@crbroughton/failsafe": minor
---

Add `partition(results)`: splits a batch of `Result`s into every `Ok`
value and every `Err` error, without ever failing itself. Unlike
`collect()`, which treats any single `Err` as a failure of the whole
batch, `partition()` always returns both buckets — for batch-processing
use cases (CSV imports, bulk API calls, migration scripts) where
successful entries shouldn't be discarded just because others failed.
