/* eslint-disable no-console */
// Step 0: the typical way — try/catch.
// Run: node playground/gen-guide-demo/step0.ts

interface LoginStep { token: string, userId: string }
interface UserProfile { userId: string, name: string }

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms))
}

async function postLogin(email: string, password: string): Promise<LoginStep> {
  if (password === "wrong-password") {
    throw new Error(`login failed for ${email}: 401`)
  }
  await delay(undefined, 200)
  return { token: "tok_abc123", userId: "user_1" }
}

async function fetchUserProfile(userId: string): Promise<UserProfile> {
  if (userId !== "user_1") {
    throw new Error(`no such user: ${userId}`)
  }
  await delay(undefined, 200)
  return { userId: "user_1", name: "Craig" }
}

async function login(email: string, password: string): Promise<{ user: UserProfile, token: string }> {
  try {
    const { token, userId } = await postLogin(email, password)
    try {
      const user = await fetchUserProfile(userId)
      return { user, token }
    }
    catch (err) {
      console.error("could not fetch profile:", err)
      throw err
    }
  }
  catch (err) {
    console.error("could not log in:", err)
    throw err
  }
}

async function demo(label: string, email: string, password: string): Promise<void> {
  console.log(`\n--- ${label} ---`)
  try {
    const result = await login(email, password)
    console.log("success:", result)
  }
  catch (err) {
    // The caller still has to wrap every call site in its own try/catch —
    // there's no type telling them this function can fail, or how.
    console.log("caller had to catch too:", (err as Error).message)
  }
}

async function main(): Promise<void> {
  await demo("success", "craig@example.com", "correct-password")
  await demo("wrong password", "craig@example.com", "wrong-password")
}

main()
