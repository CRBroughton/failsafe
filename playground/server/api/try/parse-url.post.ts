import type { ParseUrlResponse } from "#shared/utils/try.schema"
import { parseUrlRequestSchema, parseUrlResponseSchema } from "#shared/utils/try.schema"
import { tryURL } from "@crbroughton/failsafe/try"

export default defineEventHandler(async (event): Promise<ParseUrlResponse> => {
  const { input, base } = await readValidatedBody(event, parseUrlRequestSchema.parse)

  const result = tryURL(input, base)

  // URL instances don't serialize to JSON usefully on their own (toJSON
  // returns just the href string) — shape it into something the demo can
  // actually show.
  const shaped = result.ok
    ? {
        ok: true as const,
        value: {
          href: result.value.href,
          hostname: result.value.hostname,
          pathname: result.value.pathname,
          protocol: result.value.protocol,
        },
      }
    : result

  return parseUrlResponseSchema.parse(shaped)
})
