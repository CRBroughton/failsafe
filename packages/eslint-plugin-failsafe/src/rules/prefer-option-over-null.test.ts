import { RuleTester } from "@typescript-eslint/rule-tester"
import { afterAll, describe, it } from "vitest"
import { preferOptionOverNull } from "./prefer-option-over-null"

RuleTester.afterAll = afterAll
RuleTester.describe = describe
RuleTester.it = it
// eslint-disable-next-line test/no-only-tests -- wiring RuleTester's required hook, not focusing a test
RuleTester.itOnly = it.only

const ruleTester = new RuleTester()

ruleTester.run("prefer-option-over-null", preferOptionOverNull, {
  valid: [
    // --- No type annotation at all ---
    "function findUser(id) { return users.find(u => u.id === id) }",

    // --- Already returns Option<T> ---
    "function findUser(id: string): Option<User> { return optionFromNullable(users.find(u => u.id === id)) }",

    // --- A union with no null/undefined member ---
    "function parse(input: string): string | number { return Number(input) || input }",

    // --- Arrow function, non-nullable return type ---
    "const findUser = (id: string): User => users[id]",

    // --- Function expression, non-nullable return type ---
    "const findUser = function (id: string): User { return users[id] }",

    // --- Variable declaration, non-nullable type ---
    "const user: User = defaultUser",

    // --- Function parameter, non-nullable type ---
    "function greet(name: string) { return `hi ${name}` }", // eslint-disable-line no-template-curly-in-string -- test fixture string, not a template-literal mistake

    // --- Interface property, non-nullable type ---
    "interface Foo { bar: string }",

    // --- Type alias, non-nullable type ---
    "type UserId = string",
  ],
  invalid: [
    // --- Function declaration returning T | null ---
    {
      code: "function findUser(id: string): User | null { return users.find(u => u.id === id) ?? null }",
      errors: [{ messageId: "preferOption" }],
    },

    // --- Arrow function returning T | undefined (e.g. Array.find's real type) ---
    {
      code: "const findUser = (id: string): User | undefined => users.find(u => u.id === id)",
      errors: [{ messageId: "preferOption" }],
    },

    // --- Function expression returning T | null ---
    {
      code: "const findUser = function (id: string): User | null { return null }",
      errors: [{ messageId: "preferOption" }],
    },

    // --- A wider union that still includes null ---
    {
      code: "function parse(input: string): string | number | null { return null }",
      errors: [{ messageId: "preferOption" }],
    },

    // --- Both null and undefined present ---
    {
      code: "function findUser(id: string): User | null | undefined { return null }",
      errors: [{ messageId: "preferOption" }],
    },

    // --- Variable declaration whose annotation is a function type with a
    // nullable return (the outer annotation wraps a TSFunctionType, which
    // isn't itself nullish — only the function type's own nested return
    // type annotation is) ---
    {
      code: "const findUser: (id: string) => User | null = (id) => users[id] ?? null",
      errors: [{ messageId: "preferOption" }],
    },

    // --- Plain variable, no function involved ---
    {
      code: "let currentUser: User | null = null",
      errors: [{ messageId: "preferOption" }],
    },

    // --- Function parameter with a nullable type ---
    {
      code: "function greet(name: string | null) { return name }",
      errors: [{ messageId: "preferOption" }],
    },

    // --- Interface property ---
    {
      code: "interface Foo { bar: string | null }",
      errors: [{ messageId: "preferOption" }],
    },

    // --- Class property ---
    {
      code: "class Foo { bar: string | undefined = undefined }",
      errors: [{ messageId: "preferOption" }],
    },

    // --- Type alias assigned a nullable union directly ---
    {
      code: "type UserId = string | null",
      errors: [{ messageId: "preferOption" }],
    },
  ],
})
