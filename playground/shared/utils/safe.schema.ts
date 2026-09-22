import { resultSchema } from "#shared/utils/result.schema"
import { z } from "zod"

export const divideRequestSchema = z.object({
  a: z.number(),
  b: z.number(),
})
export type DivideRequest = z.infer<typeof divideRequestSchema>

export const divisionErrorSchema = z.object({
  tag: z.literal("DivisionError"),
  message: z.string(),
})
export type DivisionError = z.infer<typeof divisionErrorSchema>

export const divideResponseSchema = resultSchema(z.number(), divisionErrorSchema)
export type DivideResponse = z.infer<typeof divideResponseSchema>

export const upstreamRequestSchema = z.object({
  shouldFail: z.boolean(),
})
export type UpstreamRequest = z.infer<typeof upstreamRequestSchema>

export const upstreamErrorSchema = z.object({
  tag: z.literal("UpstreamError"),
  message: z.string(),
})
export type UpstreamError = z.infer<typeof upstreamErrorSchema>

export const upstreamOkSchema = z.object({
  status: z.literal("ok"),
  latencyMs: z.number(),
})

export const upstreamResponseSchema = resultSchema(upstreamOkSchema, upstreamErrorSchema)
export type UpstreamResponse = z.infer<typeof upstreamResponseSchema>
