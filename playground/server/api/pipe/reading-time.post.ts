import type { ReadingTimeResponse } from "#shared/utils/pipe.schema"
import { readingTimeRequestSchema, readingTimeResponseSchema } from "#shared/utils/pipe.schema"
import { pipe } from "@crbroughton/failsafe/pipe"

const WORDS_PER_MINUTE = 200

export default defineEventHandler(async (event): Promise<ReadingTimeResponse> => {
  const { text } = await readValidatedBody(event, readingTimeRequestSchema.parse)

  const label = pipe(
    text,
    s => s.trim(),
    s => s.split(/\s+/).filter(Boolean).length,
    wordCount => wordCount / WORDS_PER_MINUTE,
    minutes => Math.max(1, Math.ceil(minutes)),
    minutes => `${minutes} min read`,
  )

  return readingTimeResponseSchema.parse({ label })
})
