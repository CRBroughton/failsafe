import { RuleTester } from "@typescript-eslint/rule-tester"
import { afterAll, describe, it } from "vitest"
import { noAsyncThunkInSafe } from "./no-async-thunk-in-safe"

RuleTester.afterAll = afterAll
RuleTester.describe = describe
RuleTester.it = it
// eslint-disable-next-line test/no-only-tests -- wiring RuleTester's required hook, not focusing a test
RuleTester.itOnly = it.only

const ruleTester = new RuleTester()

ruleTester.run("no-async-thunk-in-safe", noAsyncThunkInSafe, {
  valid: [
    // --- Sync thunk — the correct sync-overload usage ---
    "safe(() => doThing())",

    // --- Promise passed directly — the correct async-overload usage ---
    "safe(fetchData())",
    "await safe(fetchData())",

    // --- Sync function expression thunk ---
    "safe(function () { return 1 })",

    // --- mapError present, but thunk itself still sync — unaffected ---
    "safe(() => doThing(), (e) => e)",

    // --- Unrelated function that merely shares the name ---
    "someOtherSafe(async () => doThing())",
  ],
  invalid: [
    // --- Async arrow thunk ---
    {
      code: "safe(async () => fetchData())",
      errors: [{ messageId: "noAsyncThunk" }],
    },
    {
      code: "safe(async () => { return await fetchData() })",
      errors: [{ messageId: "noAsyncThunk" }],
    },

    // --- Async function expression thunk ---
    {
      code: "safe(async function () { return await fetchData() })",
      errors: [{ messageId: "noAsyncThunk" }],
    },

    // --- Still flagged even with a mapError second argument ---
    {
      code: "safe(async () => fetchData(), (e) => e)",
      errors: [{ messageId: "noAsyncThunk" }],
    },
  ],
})
