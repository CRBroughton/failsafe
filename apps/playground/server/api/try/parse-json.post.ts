import type { ParseJsonResponse } from "#shared/utils/try.schema"
import { parseJsonRequestSchema, parseJsonResponseSchema } from "#shared/utils/try.schema"
import { tryJSONParse } from "@crbroughton/failsafe/try"

export default defineEventHandler(async (event): Promise<ParseJsonResponse> => {
  const { raw } = await readValidatedBody(event, body => parseJsonRequestSchema.parse(body))

  return parseJsonResponseSchema.parse(tryJSONParse(raw))
})
