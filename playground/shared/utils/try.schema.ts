import { clientErrorSchema, resultSchema } from "#shared/utils/result.schema"
import { z } from "zod"

export const parseJsonRequestSchema = z.object({
  raw: z.string(),
})
export type ParseJsonRequest = z.infer<typeof parseJsonRequestSchema>

export const jsonParseErrorSchema = z.object({
  tag: z.literal("JSONParseError"),
  raw: z.string(),
})
export type JSONParseError = z.infer<typeof jsonParseErrorSchema>

export const parseJsonResponseSchema = resultSchema(z.unknown(), jsonParseErrorSchema)
export type ParseJsonResponse = z.infer<typeof parseJsonResponseSchema>

export const parseJsonDisplayErrorSchema = z.discriminatedUnion("tag", [
  clientErrorSchema,
  jsonParseErrorSchema,
])

export const parseJsonDisplaySchema = resultSchema(z.unknown(), parseJsonDisplayErrorSchema)
export type ParseJsonDisplay = z.infer<typeof parseJsonDisplaySchema>

export const jsonStringifyErrorSchema = z.object({
  tag: z.literal("JSONStringifyError"),
})
export type JSONStringifyError = z.infer<typeof jsonStringifyErrorSchema>

export const parseUrlRequestSchema = z.object({
  input: z.string(),
  base: z.string().optional(),
})
export type ParseUrlRequest = z.infer<typeof parseUrlRequestSchema>

export const urlParseErrorSchema = z.object({
  tag: z.literal("URLParseError"),
  input: z.string(),
})
export type URLParseError = z.infer<typeof urlParseErrorSchema>

export const parsedUrlSchema = z.object({
  href: z.string(),
  hostname: z.string(),
  pathname: z.string(),
  protocol: z.string(),
})

export const parseUrlResponseSchema = resultSchema(parsedUrlSchema, urlParseErrorSchema)
export type ParseUrlResponse = z.infer<typeof parseUrlResponseSchema>

export const parseUrlDisplayErrorSchema = z.discriminatedUnion("tag", [
  clientErrorSchema,
  urlParseErrorSchema,
])

export const parseUrlDisplaySchema = resultSchema(parsedUrlSchema, parseUrlDisplayErrorSchema)
export type ParseUrlDisplay = z.infer<typeof parseUrlDisplaySchema>

export const base64RequestSchema = z.object({
  mode: z.enum(["encode", "decode"]),
  input: z.string(),
})
export type Base64Request = z.infer<typeof base64RequestSchema>

export const base64ErrorSchema = z.object({
  tag: z.literal("Base64Error"),
  input: z.string(),
})
export type Base64Error = z.infer<typeof base64ErrorSchema>

export const base64ResponseSchema = resultSchema(z.string(), base64ErrorSchema)
export type Base64Response = z.infer<typeof base64ResponseSchema>

export const base64DisplayErrorSchema = z.discriminatedUnion("tag", [
  clientErrorSchema,
  base64ErrorSchema,
])

export const base64DisplaySchema = resultSchema(z.string(), base64DisplayErrorSchema)
export type Base64Display = z.infer<typeof base64DisplaySchema>

export const cloneRequestSchema = z.object({
  value: z.unknown(),
  forceNonCloneable: z.boolean(),
})
export type CloneRequest = z.infer<typeof cloneRequestSchema>

export const structuredCloneErrorSchema = z.object({
  tag: z.literal("StructuredCloneError"),
})
export type StructuredCloneError = z.infer<typeof structuredCloneErrorSchema>

export const cloneResponseSchema = resultSchema(z.unknown(), structuredCloneErrorSchema)
export type CloneResponse = z.infer<typeof cloneResponseSchema>

export const cloneDisplayErrorSchema = z.discriminatedUnion("tag", [
  clientErrorSchema,
  structuredCloneErrorSchema,
])

export const cloneDisplaySchema = resultSchema(z.unknown(), cloneDisplayErrorSchema)
export type CloneDisplay = z.infer<typeof cloneDisplaySchema>
