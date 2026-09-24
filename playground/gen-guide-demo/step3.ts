/* eslint-disable no-console */
// Step 3: the repo's actual version — postLogin and fetchUserProfile are
// also rewritten with gen()/fail(), and fetchUserProfile chains two real
// dependent steps internally (tryJSONStringify -> tryJSONParse), which is
// where gen() earns its place even inside a single function.
// Run: node playground/gen-guide-demo/step3.ts

import type { Result, TaggedError } from "@crbroughton/failsafe"
import type { JSONParseError, JSONStringifyError } from "@crbroughton/failsafe/try"
import { isErr, match } from "@crbroughton/failsafe"
import { fail, gen, unwrap } from "@crbroughton/failsafe/gen"
import { tryJSONParse, tryJSONStringify } from "@crbroughton/failsafe/try"

type NetworkError = TaggedError<"NetworkError", { url: string, status: number }>
interface LoginStep { token: string, userId: string }
interface UserProfile { userId: string, name: string }

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms))
}

function postLogin(
  email: string,
  password: string,
): Promise<Result<LoginStep, NetworkError>> {
  return gen(async function* () {
    if (password === "wrong-password") {
      return yield * fail<NetworkError>({ tag: "NetworkError", url: `/api/login?email=${email}`, status: 401 })
    }
    await delay(undefined, 200)
    return { token: "tok_abc123", userId: "user_1" }
  })
}

function fetchUserProfile(
  userId: string,
): Promise<Result<UserProfile, NetworkError | JSONStringifyError | JSONParseError>> {
  return gen(async function* () {
    if (userId !== "user_1") {
      return yield * fail<NetworkError>({
        tag: "NetworkError",
        url: `/api/users/${userId}`,
        status: 404,
      })
    }
    // A real second fallible step inside this one function: serialize,
    // then (pretending it round-tripped through a network call) parse.
    // gen() unions the error types of every fail()/unwrap() in the
    // block automatically — that's why the return type above already
    // includes JSONStringifyError | JSONParseError.
    const stringified = yield * unwrap(tryJSONStringify({ userId: "user_1", name: "Craig" }))
    const raw = await delay(stringified, 200)
    return yield * unwrap(tryJSONParse<UserProfile>(raw))
  })
}

async function login(email: string, password: string): Promise<Result<
  { user: UserProfile, token: string },
  TaggedError<"InvalidCredentials", { email: string }> | NetworkError | JSONStringifyError | JSONParseError
>> {
  return gen(async function* () {
    if (!email.includes("@")) {
      return yield * fail<TaggedError<"InvalidCredentials", { email: string }>>({ tag: "InvalidCredentials", email })
    }
    const { token, userId } = yield * unwrap(await postLogin(email, password))
    const user = yield * unwrap(await fetchUserProfile(userId))
    return { user, token }
  })
}

async function demo(label: string, email: string, password: string): Promise<void> {
  console.log(`\n--- ${label} ---`)
  const result = await login(email, password)

  if (isErr(result)) {
    match(result.error, {
      NetworkError: error => console.log(error), // both send to logger and user
      InvalidCredentials: () => {
        console.log("asdasd")
      }, // show to user
      JSONParseError: error => console.log(error), // send to logger
      JSONStringifyError: error => console.log(error), // send to loggger
    })
  }
  else {
    console.log("success:", result.value)
  }
}

async function main(): Promise<void> {
  await demo("success", "craig@example.com", "correct-password")
  await demo("invalid email (fails before any network call)", "not-an-email", "whatever")
  await demo("wrong password (fails at step 1 — postLogin)", "craig@example.com", "wrong-password")

  console.log("\n--- unknown user (fetchUserProfile called directly) ---")
  const profileResult = await fetchUserProfile("nonexistent-user")
  if (isErr(profileResult)) {
    console.log("error (typed!):", profileResult.error)
  }
}

main()
