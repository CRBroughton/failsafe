import { z } from "zod"

// eslint-disable-next-line ts/explicit-function-return-type
export function resultSchema<TValue extends z.ZodType, TError extends z.ZodType>(
  value: TValue,
  error: TError,
) {
  return z.discriminatedUnion("ok", [
    z.object({ ok: z.literal(true), value }),
    z.object({ ok: z.literal(false), error }),
  ])
}

export const clientErrorSchema = z.object({
  tag: z.literal("FetchError"),
  message: z.string(),
})
export type ClientError = z.infer<typeof clientErrorSchema>
