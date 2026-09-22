import type { Base64Response } from "#shared/utils/try.schema"
import { base64RequestSchema, base64ResponseSchema } from "#shared/utils/try.schema"
import { tryBase64Decode, tryBase64Encode } from "@crbroughton/failsafe/try"

export default defineEventHandler(async (event): Promise<Base64Response> => {
  const { mode, input } = await readValidatedBody(event, base64RequestSchema.parse)

  const result = mode === "encode" ? tryBase64Encode(input) : tryBase64Decode(input)

  return base64ResponseSchema.parse(result)
})
