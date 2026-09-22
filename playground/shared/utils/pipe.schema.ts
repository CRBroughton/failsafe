import { clientErrorSchema, resultSchema } from "#shared/utils/result.schema"
import { z } from "zod"

export const slugifyRequestSchema = z.object({
  input: z.string(),
})
export type SlugifyRequest = z.infer<typeof slugifyRequestSchema>

export const slugifyResponseSchema = z.object({
  slug: z.string(),
})
export type SlugifyResponse = z.infer<typeof slugifyResponseSchema>

export const slugifyDisplaySchema = resultSchema(slugifyResponseSchema, clientErrorSchema)
export type SlugifyDisplay = z.infer<typeof slugifyDisplaySchema>

export const readingTimeRequestSchema = z.object({
  text: z.string(),
})
export type ReadingTimeRequest = z.infer<typeof readingTimeRequestSchema>

export const readingTimeResponseSchema = z.object({
  label: z.string(),
})
export type ReadingTimeResponse = z.infer<typeof readingTimeResponseSchema>

export const readingTimeDisplaySchema = resultSchema(readingTimeResponseSchema, clientErrorSchema)
export type ReadingTimeDisplay = z.infer<typeof readingTimeDisplaySchema>
