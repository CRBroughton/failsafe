import { RuleTester } from "@typescript-eslint/rule-tester"
import { afterAll, describe, it } from "vitest"
import { noUnusedResult } from "./no-unused-result"

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

const RESULT_SETUP = `
declare function safe<T>(fn: () => T): { ok: true, value: T } | { ok: false, error: Error }
declare function safeAsync<T>(): Promise<{ ok: true, value: T } | { ok: false, error: Error }>
`

ruleTester.run("no-unused-result", noUnusedResult, {
  valid: [
    // --- Assigned to a variable — satisfies the rule even if unused after ---
    {
      code: `${RESULT_SETUP}
const result = safe(() => 1)`,
      filename: "file.ts",
    },

    // --- Assigned from an awaited call ---
    {
      code: `${RESULT_SETUP}
async function run() {
  const result = await safeAsync()
}`,
      filename: "file.ts",
    },

    // --- A bare statement, but the call doesn't return a Result at all ---
    {
      code: `console.log("hi")`,
      filename: "file.ts",
    },

    // --- A bare statement returning an already-narrowed single-branch shape,
    // not a real Ok|Err union — structurally not a Result ---
    {
      code: `
declare function getErr(): { ok: false, error: Error }
getErr()`,
      filename: "file.ts",
    },
  ],
  invalid: [
    // --- Bare sync call, Result discarded ---
    {
      code: `${RESULT_SETUP}
safe(() => 1)`,
      filename: "file.ts",
      errors: [{ messageId: "unusedResult" }],
    },

    // --- Bare awaited call, Result discarded ---
    {
      code: `${RESULT_SETUP}
async function run() {
  await safeAsync()
}`,
      filename: "file.ts",
      errors: [{ messageId: "unusedResult" }],
    },
  ],
})
