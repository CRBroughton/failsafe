/* eslint-disable no-console */
// Step 1: Result + Ok/Err/isErr — errors become values.
// Run: node playground/gen-guide-demo/step1.ts

import type { Result, TaggedError } from "@crbroughton/failsafe"
import { Err, isErr, Ok } from "@crbroughton/failsafe"

type NetworkError = TaggedError<"NetworkError", { url: string, status: number }>
interface LoginStep { token: string, userId: string }
interface UserProfile { userId: string, name: string }

async function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms))
}

async function postLogin(email: string, password: string): Promise<Result<LoginStep, NetworkError>> {
  if (password === "wrong-password") {
    return Err<NetworkError>({ tag: "NetworkError", url: `/api/login?email=${email}`, status: 401 })
  }
  await delay(undefined, 200)
  return Ok<LoginStep>({ token: "tok_abc123", userId: "user_1" })
}

async function fetchUserProfile(userId: string): Promise<Result<UserProfile, NetworkError>> {
  if (userId !== "user_1") {
    return Err({ tag: "NetworkError", url: `/api/users/${userId}`, status: 404 })
  }
  await delay(undefined, 200)
  return Ok({ userId: "user_1", name: "Craig" })
}

async function login(email: string, password: string): Promise<Result<{ user: UserProfile, token: string }, NetworkError>> {
  const loginResult = await postLogin(email, password)
  if (isErr(loginResult)) {
    return loginResult // bail out with the same Err
  }
  const { token, userId } = loginResult.value

  const userResult = await fetchUserProfile(userId)
  if (isErr(userResult)) {
    return userResult
  }
  const user = userResult.value

  return Ok({ user, token })
}

async function demo(label: string, email: string, password: string): Promise<void> {
  console.log(`\n--- ${label} ---`)
  const result = await login(email, password)
  // No try/catch needed — login() always returns, never throws. The
  // caller is forced by the type to check `ok` before touching `.value`.
  if (isErr(result)) {
    console.log("error (typed!):", result.error)
  }
  else {
    console.log("success:", result.value)
  }
}

async function main(): Promise<void> {
  await demo("success", "craig@example.com", "correct-password")
  await demo("wrong password", "craig@example.com", "wrong-password")
}

void main()
