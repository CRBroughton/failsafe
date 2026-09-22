import type { InvalidCredentials, LoginResponse, NetworkError } from "#shared/utils/gen.schema"
import type { JSONParseError } from "#shared/utils/try.schema"
import type { Result } from "@crbroughton/failsafe"
import { loginRequestSchema, loginResponseSchema } from "#shared/utils/gen.schema"
import { fail, gen, unwrap } from "@crbroughton/failsafe/gen"
import { tryJSONParse } from "@crbroughton/failsafe/try"

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
): Promise<Result<UserProfile, NetworkError | JSONParseError>> {
  return gen(async function* () {
    if (userId !== "user_1") {
      return yield * fail<NetworkError>({
        tag: "NetworkError",
        url: `/api/users/${userId}`,
        status: 404,
      })
    }
    const raw = await delay(JSON.stringify({ userId: "user_1", name: "Craig" }), 200)
    return yield * unwrap(tryJSONParse<UserProfile>(raw))
  })
}

export default defineEventHandler(async (event): Promise<LoginResponse> => {
  const { email, password } = await readValidatedBody(event, loginRequestSchema.parse)

  const result = await gen(async function* () {
    if (!email.includes("@")) {
      return yield * fail<InvalidCredentials>({ tag: "InvalidCredentials", email })
    }
    const { token, userId } = yield * unwrap(await postLogin(email, password))
    const user = yield * unwrap(await fetchUserProfile(userId))
    return { user, token }
  })

  return loginResponseSchema.parse(result)
})
