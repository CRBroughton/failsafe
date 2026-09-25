import type { InvalidCredentials, LoginResponse, NetworkError } from "#shared/utils/gen.schema"
import type { JSONParseError, JSONStringifyError } from "#shared/utils/try.schema"
import type { Result } from "@crbroughton/failsafe"
import { loginRequestSchema, loginResponseSchema } from "#shared/utils/gen.schema"
import { fail, gen, unwrap } from "@crbroughton/failsafe/gen"
import { tryJSONParse, tryJSONStringify } from "@crbroughton/failsafe/try"

interface LoginStep { token: string, userId: string }
interface UserProfile { userId: string, name: string }

async function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms))
}

async function postLogin(
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

async function fetchUserProfile(
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
    const stringified = yield * unwrap(tryJSONStringify({ userId: "user_1", name: "Craig" }))
    const raw = await delay(stringified, 200)
    return yield * unwrap(tryJSONParse<UserProfile>(raw))
  })
}

export default defineEventHandler(async (event): Promise<LoginResponse> => {
  const { email, password } = await readValidatedBody(event, raw => loginRequestSchema.parse(raw))

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
