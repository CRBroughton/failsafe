import type { DivideResponse } from "#shared/utils/safe.schema"
import { divideRequestSchema, divideResponseSchema } from "#shared/utils/safe.schema"
import { safe } from "@crbroughton/failsafe"

export default defineEventHandler(async (event): Promise<DivideResponse> => {
  const { a, b } = await readValidatedBody(event, divideRequestSchema.parse)

  // Error instances don't serialize meaningfully over JSON (message/stack
  // aren't enumerable) — map the caught error into a plain object so the
  // API response actually shows something.
  const result = safe(
    () => {
      if (b === 0) {
        throw new Error("Division by zero")
      }
      return a / b
    },
    (error): { tag: "DivisionError", message: string } => ({
      tag: "DivisionError",
      message: error instanceof Error ? error.message : "Unknown error",
    }),
  )

  return divideResponseSchema.parse(result)
})
