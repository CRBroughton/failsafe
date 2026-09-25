import type { SlugifyResponse } from "#shared/utils/pipe.schema"
import { slugifyRequestSchema, slugifyResponseSchema } from "#shared/utils/pipe.schema"
import { pipe } from "@crbroughton/failsafe/pipe"

export default defineEventHandler(async (event): Promise<SlugifyResponse> => {
  const { input } = await readValidatedBody(event, raw => slugifyRequestSchema.parse(raw))

  const slug = pipe(
    input,
    s => s.trim(),
    s => s.toLowerCase(),
    s => s.replace(/\s+/g, "-"),
  )

  return slugifyResponseSchema.parse({ slug })
})
