import type { CloneResponse } from "#shared/utils/try.schema"
import { cloneRequestSchema, cloneResponseSchema } from "#shared/utils/try.schema"
import { tryStructuredClone } from "@crbroughton/failsafe/try"

export default defineEventHandler(async (event): Promise<CloneResponse> => {
  const { value, forceNonCloneable } = await readValidatedBody(event, cloneRequestSchema.parse)

  // structuredClone can't clone functions — force that failure path on
  // demand, since anything arriving as a JSON request body is already
  // guaranteed to be structured-cloneable on its own.
  const input = forceNonCloneable ? { value, handler: () => {} } : value

  return cloneResponseSchema.parse(tryStructuredClone(input))
})
