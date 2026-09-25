import { RuleTester } from "@typescript-eslint/rule-tester"
import { afterAll, describe, it } from "vitest"
import { noRawThrowingCall } from "./no-raw-throwing-call"

RuleTester.afterAll = afterAll
RuleTester.describe = describe
RuleTester.it = it
// eslint-disable-next-line test/no-only-tests -- wiring RuleTester's required hook, not focusing a test
RuleTester.itOnly = it.only

const ruleTester = new RuleTester()

ruleTester.run("no-raw-throwing-call", noRawThrowingCall, {
  valid: [
    // --- Each native call, wrapped in a non-async safe() thunk ---
    "safe(() => JSON.parse(raw))",
    "safe(() => { return JSON.parse(raw) })",
    "safe(() => JSON.stringify(value))",
    "safe(() => decodeURIComponent(input))",
    "safe(() => encodeURIComponent(input))",
    "safe(() => atob(input))",
    "safe(() => btoa(input))",
    "safe(() => localStorage.getItem(key))",
    "safe(() => localStorage.setItem(key, value))",
    "safe(() => new URL(input))",
    "safe(() => structuredClone(value))",
    // function expression thunk, not just arrow
    "safe(function () { return JSON.parse(raw) })",

    // --- Already using the matching tryX() helper — never matched at all ---
    "tryJSONParse(raw)",
    "tryJSONStringify(value)",
    "tryURIDecode(input)",
    "tryURIEncode(input)",
    "tryBase64Decode(input)",
    "tryBase64Encode(input)",
    "tryLocalStorageGet(key)",
    "tryLocalStorageSet(key, value)",
    "tryURL(input)",
    "tryStructuredClone(value)",

    // --- Multiple calls directly in the same thunk, not nested in another function ---
    "safe(() => JSON.parse(raw) ?? JSON.parse(fallback))",
    "safe(() => cond ? JSON.parse(a) : JSON.parse(b))",

    // --- Unrelated calls/members that merely share a name with a pattern ---
    "SomeOtherThing.parse(raw)",
    "myLocalStorage.getItem(key)",
    "new NotURL(input)",
  ],
  invalid: [
    // --- Each native call, completely unwrapped ---
    {
      code: "JSON.parse(raw)",
      errors: [{ messageId: "wrapWithSafe", data: { label: "JSON.parse", tryHelper: "tryJSONParse" } }],
    },
    {
      code: "JSON.stringify(value)",
      errors: [{ messageId: "wrapWithSafe", data: { label: "JSON.stringify", tryHelper: "tryJSONStringify" } }],
    },
    {
      code: "decodeURIComponent(input)",
      errors: [{ messageId: "wrapWithSafe", data: { label: "decodeURIComponent", tryHelper: "tryURIDecode" } }],
    },
    {
      code: "encodeURIComponent(input)",
      errors: [{ messageId: "wrapWithSafe", data: { label: "encodeURIComponent", tryHelper: "tryURIEncode" } }],
    },
    {
      code: "atob(input)",
      errors: [{ messageId: "wrapWithSafe", data: { label: "atob", tryHelper: "tryBase64Decode" } }],
    },
    {
      code: "btoa(input)",
      errors: [{ messageId: "wrapWithSafe", data: { label: "btoa", tryHelper: "tryBase64Encode" } }],
    },
    {
      code: "localStorage.getItem(key)",
      errors: [{ messageId: "wrapWithSafe", data: { label: "localStorage.getItem", tryHelper: "tryLocalStorageGet" } }],
    },
    {
      code: "localStorage.setItem(key, value)",
      errors: [{ messageId: "wrapWithSafe", data: { label: "localStorage.setItem", tryHelper: "tryLocalStorageSet" } }],
    },
    {
      code: "new URL(input)",
      errors: [{ messageId: "wrapWithSafe", data: { label: "new URL(...)", tryHelper: "tryURL" } }],
    },
    {
      code: "structuredClone(value)",
      errors: [{ messageId: "wrapWithSafe", data: { label: "structuredClone", tryHelper: "tryStructuredClone" } }],
    },

    // --- The eager-evaluation footgun: passed as a value, not a thunk ---
    // JSON.parse runs immediately, before safe() is even called — never
    // protected, regardless of how it looks at a glance.
    {
      code: "safe(JSON.parse(raw))",
      errors: [{ messageId: "wrapWithSafe" }],
    },

    // --- The async-thunk footgun: a sync throw inside async () => {} ---
    // never reaches safe()'s try/catch (see isDirectlyWrappedInSafeThunk's
    // docstring) — must still be flagged.
    {
      code: "safe(async () => { return JSON.parse(raw) })",
      errors: [{ messageId: "wrapWithSafe" }],
    },
    {
      code: "safe(async () => JSON.parse(raw))",
      errors: [{ messageId: "wrapWithSafe" }],
    },

    // --- Nested inside another callback within the thunk — documented ---
    // false positive under the conservative design: the nearest enclosing
    // function is the .map() callback, not the safe() thunk directly.
    {
      code: "safe(() => arr.map(x => JSON.parse(x)))",
      errors: [{ messageId: "wrapWithSafe" }],
    },

    // --- Factored into a named helper function — not recognized, since ---
    // proving the helper is only ever called from within a safe() thunk
    // requires interprocedural analysis this rule doesn't attempt.
    {
      code: "function helper() { return JSON.parse(raw) }",
      errors: [{ messageId: "wrapWithSafe" }],
    },

    // --- Wrapped in a plain try/catch instead of safe()/tryX() — the ---
    // rule specifically enforces the failsafe idiom, not just "any error
    // handling exists somewhere."
    {
      code: "try { JSON.parse(raw) } catch { /* empty */ }",
      errors: [{ messageId: "wrapWithSafe" }],
    },

    // --- Passed to safe() as the second argument (mapError position), ---
    // not the first (the thunk) — still unprotected.
    {
      code: "safe(other, () => JSON.parse(raw))",
      errors: [{ messageId: "wrapWithSafe" }],
    },

    // --- A different pattern (identifier call, not a member call) ---
    // also unprotected by a plain try/catch — proves the rule isn't only
    // checking the JSON.parse case above.
    {
      code: "try { atob(input) } catch { /* empty */ }",
      errors: [{ messageId: "wrapWithSafe" }],
    },
  ],
})
