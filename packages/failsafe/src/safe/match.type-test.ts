import type { Equals, Expect } from "@crbroughton/ts-test-utils"
import { match } from "./index"

type TestError =
  | { tag: "ParseError", raw: string }
  | { tag: "StorageError", key: string }

// `err`'s type comes from a function parameter (not a module-level const)
// so TypeScript doesn't narrow it down to a single union member, which
// would otherwise mask what these tests are checking.
function run(err: TestError): void {
  // exhaustive, exact handlers: should compile
  const ok = match(err, {
    ParseError: e => `bad json: ${e.raw}`,
    StorageError: e => `storage failed: ${e.key}`,
  })
  // eslint-disable-next-line unused-imports/no-unused-vars -- type-level assertion, usage is the type-check itself
  type OkResult = Expect<Equals<typeof ok, string>>

  // missing a tag handler: should fail to compile
  // @ts-expect-error - StorageError handler is missing
  const missing = match(err, {
    ParseError: e => `bad json: ${e.raw}`,
  })

  // extra/misspelled key: should fail to compile
  const bad = match(err, {
    ParseError: e => `bad json: ${e.raw}`,
    StorageError: e => `storage failed: ${e.key}`,
    // @ts-expect-error - JSONParseEraror is not a valid tag on TestError
    JSONParseEraror: (_e: any) => "typo",
  })

  void ok
  void missing
  void bad
}

void run
