import type { EmptyFieldError, ValidateSlugResponse } from "#shared/utils/gen.schema"
import { validateSlugRequestSchema, validateSlugResponseSchema } from "#shared/utils/gen.schema"
import { fail, gen } from "@crbroughton/failsafe/gen"

export default defineEventHandler(async (event): Promise<ValidateSlugResponse> => {
  const { input } = await readValidatedBody(event, validateSlugRequestSchema.parse)

  const result = gen(function* () {
    if (input.trim() === "") {
      return yield * fail<EmptyFieldError>({ tag: "EmptyFieldError", field: "slug" })
    }
    return input.trim().toLowerCase().replace(/\s+/g, "-")
  })

  return validateSlugResponseSchema.parse(result)
})
