import { resultSchema } from "#shared/utils/result.schema"
import { jsonParseErrorSchema, jsonStringifyErrorSchema } from "#shared/utils/try.schema"
import { z } from "zod"

export const loginRequestSchema = z.object({
  email: z.string(),
  password: z.string(),
})
export type LoginRequest = z.infer<typeof loginRequestSchema>

export const invalidCredentialsSchema = z.object({
  tag: z.literal("InvalidCredentials"),
  email: z.string(),
})
export type InvalidCredentials = z.infer<typeof invalidCredentialsSchema>

export const networkErrorSchema = z.object({
  tag: z.literal("NetworkError"),
  url: z.string(),
  status: z.number(),
})
export type NetworkError = z.infer<typeof networkErrorSchema>

export const loginErrorSchema = z.discriminatedUnion("tag", [
  invalidCredentialsSchema,
  networkErrorSchema,
  jsonStringifyErrorSchema,
  jsonParseErrorSchema,
])
export type LoginError = z.infer<typeof loginErrorSchema>

export const loginOkSchema = z.object({
  user: z.object({
    userId: z.string(),
    name: z.string(),
  }),
  token: z.string(),
})

export const loginResponseSchema = resultSchema(loginOkSchema, loginErrorSchema)
export type LoginResponse = z.infer<typeof loginResponseSchema>

export const validateSlugRequestSchema = z.object({
  input: z.string(),
})
export type ValidateSlugRequest = z.infer<typeof validateSlugRequestSchema>

export const emptyFieldErrorSchema = z.object({
  tag: z.literal("EmptyFieldError"),
  field: z.string(),
})
export type EmptyFieldError = z.infer<typeof emptyFieldErrorSchema>

export const validateSlugResponseSchema = resultSchema(z.string(), emptyFieldErrorSchema)
export type ValidateSlugResponse = z.infer<typeof validateSlugResponseSchema>
