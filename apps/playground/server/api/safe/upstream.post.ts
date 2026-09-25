import type { UpstreamResponse } from "#shared/utils/safe.schema"
import { upstreamRequestSchema, upstreamResponseSchema } from "#shared/utils/safe.schema"
import { safe } from "@crbroughton/failsafe"

async function simulateUpstreamCall(shouldFail: boolean): Promise<{ status: "ok", latencyMs: number }> {
  const latencyMs = 150 + Math.round(Math.random() * 150)
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) {
        reject(new Error("Upstream service timed out"))
      }
      else {
        resolve({ status: "ok", latencyMs })
      }
    }, latencyMs)
  })
}

export default defineEventHandler(async (event): Promise<UpstreamResponse> => {
  const { shouldFail } = await readValidatedBody(event, raw => upstreamRequestSchema.parse(raw))

  const result = await safe(
    simulateUpstreamCall(shouldFail),
    (error): { tag: "UpstreamError", message: string } => ({
      tag: "UpstreamError",
      message: error instanceof Error ? error.message : "Unknown error",
    }),
  )

  return upstreamResponseSchema.parse(result)
})
