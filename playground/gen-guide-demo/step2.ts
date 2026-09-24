/* eslint-disable no-console */
// Step 2: gen() + unwrap() — the boilerplate disappears.
// postLogin/fetchUserProfile are unchanged from step1.ts — gen() composes
// any Result-returning functions, it doesn't require them to be written
// any particular way. Only login() changes.
// Run: node playground/gen-guide-demo/step2.ts

import type { Result, TaggedError } from "@crbroughton/failsafe"
import { Err, isErr, Ok } from "@crbroughton/failsafe"
import { gen, unwrap } from "@crbroughton/failsafe/gen"

type NetworkError = TaggedError<"NetworkError", { url: string, status: number }>
interface LoginStep { token: string, userId: string }
interface UserProfile { userId: string, name: string }

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms))
}

async function postLogin(email: string, password: string): Promise<Result<LoginStep, NetworkError>> {
  if (password === "wrong-password") {
    return Err({ tag: "NetworkError", url: `/api/login?email=${email}`, status: 401 })
  }
  await delay(undefined, 200)
  return Ok({ token: "tok_abc123", userId: "user_1" })
}

async function fetchUserProfile(userId: string): Promise<Result<UserProfile, NetworkError>> {
  if (userId !== "user_1") {
    return Err({ tag: "NetworkError", url: `/api/users/${userId}`, status: 404 })
  }
  await delay(undefined, 200)
  return Ok({ userId: "user_1", name: "Craig" })
}

async function login(email: string, password: string): Promise<Result<{ user: UserProfile, token: string }, NetworkError>> {
  return gen(async function* () {
    const { token, userId } = yield * unwrap(await postLogin(email, password))
    const user = yield * unwrap(await fetchUserProfile(userId))
    return { user, token }
  })
}

async function demo(label: string, email: string, password: string): Promise<void> {
  console.log(`\n--- ${label} ---`)
  const result = await login(email, password)
  if (isErr(result)) {
    console.log("error (typed!):", result.error)
  }
  else {
    console.log("success:", result.value)
  }
}

async function main(): Promise<void> {
  await demo("success", "craig@example.com", "correct-password")
  await demo("wrong password (fails at step 1 — postLogin)", "craig@example.com", "wrong-password")

  // postLogin always returns userId "user_1" on success, so login() can
  // never actually reach fetchUserProfile's error branch — call it
  // directly instead, to prove that step 2's failure mode is real too,
  // just not reachable through this particular login() as written.
  console.log("\n--- unknown user (fetchUserProfile called directly) ---")
  const profileResult = await fetchUserProfile("nonexistent-user")
  if (isErr(profileResult)) {
    console.log("error (typed!):", profileResult.error)
  }
}

main()
