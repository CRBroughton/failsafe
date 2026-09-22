import { z } from "zod"

export const slugifyRequestSchema = z.object({
  input: z.string(),
})
export type SlugifyRequest = z.infer<typeof slugifyRequestSchema>

export const slugifyResponseSchema = z.object({
  slug: z.string(),
})
export type SlugifyResponse = z.infer<typeof slugifyResponseSchema>

export const readingTimeRequestSchema = z.object({
  text: z.string(),
})
export type ReadingTimeRequest = z.infer<typeof readingTimeRequestSchema>

export const readingTimeResponseSchema = z.object({
  label: z.string(),
})
export type ReadingTimeResponse = z.infer<typeof readingTimeResponseSchema>
