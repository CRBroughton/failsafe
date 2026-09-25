import { RuleTester } from "@typescript-eslint/rule-tester"
import { afterAll, describe, it } from "vitest"
import { noThrowInGenBlock } from "./no-throw-in-gen-block"

RuleTester.afterAll = afterAll
RuleTester.describe = describe
RuleTester.it = it
// eslint-disable-next-line test/no-only-tests -- wiring RuleTester's required hook, not focusing a test
RuleTester.itOnly = it.only

const ruleTester = new RuleTester()

ruleTester.run("no-throw-in-gen-block", noThrowInGenBlock, {
  valid: [
    // --- No throw at all — the correct idiom ---
    `gen(function* () {
      if (invalid) {
        return yield* fail({ tag: "InvalidInput" })
      }
      return yield* unwrap(await doThing())
    })`,

    // --- Throw completely outside any gen() call ---
    `function helper() {
      throw new Error("not in a gen block")
    }`,

    // --- Throw nested inside another callback within the gen block —
    // conservative: nearest enclosing function is the callback, not the
    // gen() block directly ---
    `gen(function* () {
      items.forEach(() => {
        throw new Error("nested callback")
      })
    })`,

    // --- Throw factored into a named helper called from within gen() ---
    `function helper() {
      throw new Error("factored out")
    }
    gen(function* () {
      helper()
    })`,

    // --- Throw inside an arrow-function thunk, not a gen() generator ---
    `safe(() => {
      throw new Error("this is safe()'s job, not gen()'s")
    })`,

    // --- Unrelated function that merely shares the name ---
    `someOtherGen(function* () {
      throw new Error("not the real gen()")
    })`,
  ],
  invalid: [
    // --- Direct throw in a sync gen() generator ---
    {
      code: `gen(function* () {
        throw new Error("bad")
      })`,
      errors: [{ messageId: "noThrow" }],
    },

    // --- Direct throw in an async gen() generator ---
    {
      code: `gen(async function* () {
        throw new Error("bad")
      })`,
      errors: [{ messageId: "noThrow" }],
    },

    // --- Throw inside an if-block — still the same function boundary ---
    {
      code: `gen(function* () {
        if (!email.includes("@")) {
          throw new Error("invalid email")
        }
        return yield* unwrap(await postLogin(email, password))
      })`,
      errors: [{ messageId: "noThrow" }],
    },

    // --- Throw inside a catch block — still the same function boundary ---
    {
      code: `gen(function* () {
        try {
          doSomething()
        }
        catch (e) {
          throw e
        }
      })`,
      errors: [{ messageId: "noThrow" }],
    },
  ],
})
