import { z } from "zod"

/**
 * Mirrors @crbroughton/failsafe's Result<T, E> shape as a Zod schema:
 * { ok: true, value: T } | { ok: false, error: E }. Used to build every
 * endpoint's response schema below, so the wire shape always matches what
 * the library itself produces.
 */
// eslint-disable-next-line ts/explicit-function-return-type -- inferred Zod discriminated-union type is unwieldy to spell out manually
export function resultSchema<TValue extends z.ZodType, TError extends z.ZodType>(
  value: TValue,
  error: TError,
) {
  return z.discriminatedUnion("ok", [
    z.object({ ok: z.literal(true), value }),
    z.object({ ok: z.literal(false), error }),
  ])
}

/**
 * Every demo page wraps its $fetch call in safe() client-side too — the
 * endpoint's own Result never captures a failure at the network layer
 * (offline, CORS, a non-2xx status $fetch throws on). This is the shape
 * that failure gets flattened into, on top of whatever the endpoint's own
 * error type is.
 */
export const clientErrorSchema = z.object({
  tag: z.literal("FetchError"),
  message: z.string(),
})
export type ClientError = z.infer<typeof clientErrorSchema>
