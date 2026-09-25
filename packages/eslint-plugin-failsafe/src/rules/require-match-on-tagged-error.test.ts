import { RuleTester } from "@typescript-eslint/rule-tester"
import { afterAll, describe, it } from "vitest"
import { requireMatchOnTaggedError } from "./require-match-on-tagged-error"

RuleTester.afterAll = afterAll
RuleTester.describe = describe
RuleTester.it = it
// eslint-disable-next-line test/no-only-tests -- wiring RuleTester's required hook, not focusing a test
RuleTester.itOnly = it.only

const tsconfigRootDir = new URL("../../tests/fixtures", import.meta.url).pathname

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      tsconfigRootDir,
      project: "./tsconfig.json",
    },
  },
})

// Two-tag union, matching the shape used throughout every test case below.
const TAGGED_ERROR_SETUP = `
type ParseError = { tag: "ParseError", raw: string }
type StorageError = { tag: "StorageError", key: string }
type TaggedError = ParseError | StorageError

declare function match<E extends { tag: string }, Handlers extends { [K in E["tag"]]: (error: Extract<E, { tag: K }>) => unknown }>(
  error: E,
  handlers: Handlers,
): unknown

declare const result: { ok: false, error: TaggedError }
`

// Same tagged error, but as a real Result union — needed for the
// isErr()-branch checks below, which inspect the argument's type at the
// isErr() call site (i.e. before narrowing), so it must actually be a
// union of Ok<T> | Err<E>, not already-narrowed to Err<E> alone.
const ISERR_SETUP = `
type ParseError = { tag: "ParseError", raw: string }
type StorageError = { tag: "StorageError", key: string }
type TaggedError = ParseError | StorageError

declare function match<E extends { tag: string }, Handlers extends { [K in E["tag"]]: (error: Extract<E, { tag: K }>) => unknown }>(
  error: E,
  handlers: Handlers,
): unknown

declare function isErr<T, E>(result: { ok: true, value: T } | { ok: false, error: E }): result is { ok: false, error: E }
declare function isOk<T, E>(result: { ok: true, value: T } | { ok: false, error: E }): result is { ok: true, value: T }

declare const result: { ok: true, value: string } | { ok: false, error: TaggedError }
`

ruleTester.run("require-match-on-tagged-error", requireMatchOnTaggedError, {
  valid: [
    // --- Routed through match() directly ---
    {
      code: `${TAGGED_ERROR_SETUP}
match(result.error, {
  ParseError: e => e.raw,
  StorageError: e => e.key,
})`,
      filename: "file.ts",
    },

    // --- Assigned to a variable — deliberately not traced further ---
    {
      code: `${TAGGED_ERROR_SETUP}
const e = result.error`,
      filename: "file.ts",
    },

    // --- Single-variant tagged error — nothing to be exhaustive about ---
    {
      code: `
type OnlyError = { tag: "OnlyError", message: string }
declare const result: { ok: false, error: OnlyError }
console.log(result.error)`,
      filename: "file.ts",
    },

    // --- Plain Error, not a tagged union at all ---
    {
      code: `
declare const result: { ok: false, error: Error }
console.log(result.error)`,
      filename: "file.ts",
    },

    // --- A .error access that isn't a tagged union (plain string union) ---
    {
      code: `
declare const result: { ok: false, error: string | number }
console.log(result.error)`,
      filename: "file.ts",
    },

    // --- Unrelated .error property, not accessed at all ---
    {
      code: `${TAGGED_ERROR_SETUP}
console.log(result.ok)`,
      filename: "file.ts",
    },

    // --- isErr() branch that properly matches on .error ---
    {
      code: `${ISERR_SETUP}
if (isErr(result)) {
  match(result.error, {
    ParseError: e => e.raw,
    StorageError: e => e.key,
  })
}`,
      filename: "file.ts",
    },

    // --- isErr() branch with a single-tag error — nothing to be exhaustive about ---
    {
      code: `
type OnlyError = { tag: "OnlyError", message: string }
declare function isErr<T, E>(result: { ok: true, value: T } | { ok: false, error: E }): result is { ok: false, error: E }
declare const result: { ok: true, value: string } | { ok: false, error: OnlyError }
if (isErr(result)) {
  console.log("failed")
}`,
      filename: "file.ts",
    },

    // --- isOk() branch — not this rule's concern, no isErr() call at all ---
    {
      code: `${ISERR_SETUP}
if (isOk(result)) {
  console.log(result.value)
}`,
      filename: "file.ts",
    },
  ],
  invalid: [
    // --- Passed to an arbitrary function instead of match() ---
    {
      code: `${TAGGED_ERROR_SETUP}
console.log(result.error)`,
      filename: "file.ts",
      errors: [{ messageId: "requireMatch", data: { tags: "ParseError | StorageError" } }],
    },

    // --- Direct tag comparison, bypassing match() ---
    {
      code: `${TAGGED_ERROR_SETUP}
if (result.error.tag === "ParseError") {
  console.log("parse error")
}`,
      filename: "file.ts",
      errors: [{ messageId: "requireMatch", data: { tags: "ParseError | StorageError" } }],
    },

    // --- Returned directly from a function ---
    {
      code: `${TAGGED_ERROR_SETUP}
function getError() {
  return result.error
}`,
      filename: "file.ts",
      errors: [{ messageId: "requireMatch", data: { tags: "ParseError | StorageError" } }],
    },

    // --- Passed to a differently-named function, not match() ---
    {
      code: `${TAGGED_ERROR_SETUP}
declare function handle(e: TaggedError): void
handle(result.error)`,
      filename: "file.ts",
      errors: [{ messageId: "requireMatch", data: { tags: "ParseError | StorageError" } }],
    },

    // --- The reported case: isErr() branch that never touches .error at all ---
    {
      code: `${ISERR_SETUP}
if (isErr(result)) {
  console.log("re")
}`,
      filename: "file.ts",
      errors: [{ messageId: "missingMatch", data: { tags: "ParseError | StorageError" } }],
    },

    // --- Empty isErr() branch — the error is silently discarded ---
    {
      code: `${ISERR_SETUP}
if (isErr(result)) {
}`,
      filename: "file.ts",
      errors: [{ messageId: "missingMatch", data: { tags: "ParseError | StorageError" } }],
    },

    // --- isErr() branch that does unrelated work, still never touches .error ---
    {
      code: `${ISERR_SETUP}
declare function logGenericFailure(): void
if (isErr(result)) {
  logGenericFailure()
  console.log("something went wrong")
}`,
      filename: "file.ts",
      errors: [{ messageId: "missingMatch", data: { tags: "ParseError | StorageError" } }],
    },
  ],
})
