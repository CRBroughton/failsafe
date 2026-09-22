<script setup lang="ts">
import type { ClientError } from "#shared/utils/result.schema"
import type { ReadingTimeRequest, ReadingTimeResponse, SlugifyRequest, SlugifyResponse } from "#shared/utils/pipe.schema"
import { matchResult, safe } from "@crbroughton/failsafe"

type SlugifyDisplay = { ok: true, value: SlugifyResponse } | { ok: false, error: ClientError }

const slugInput = ref("  Hello World  ")
const slugResult = ref<SlugifyDisplay | null>(null)
const slugLoading = ref(false)

async function runSlugify() {
  slugLoading.value = true
  const body: SlugifyRequest = { input: slugInput.value }

  const result = await safe($fetch<SlugifyResponse>("/api/pipe/slugify", { method: "POST", body }))
  slugResult.value = matchResult(result, {
    ok: (value): SlugifyDisplay => ({ ok: true, value }),
    err: (error): SlugifyDisplay => ({ ok: false, error: { tag: "FetchError", message: error.message } }),
  })
  slugLoading.value = false
}

type ReadingTimeDisplay = { ok: true, value: ReadingTimeResponse } | { ok: false, error: ClientError }

const readingText = ref(
  "FailSafe is a lightweight, dependency-free alternative to neverthrow "
  + "for TypeScript, with helpers for wrapping throwing browser and Node APIs.",
)
const readingResult = ref<ReadingTimeDisplay | null>(null)
const readingLoading = ref(false)

async function runReadingTime() {
  readingLoading.value = true
  const body: ReadingTimeRequest = { text: readingText.value }

  const result = await safe($fetch<ReadingTimeResponse>("/api/pipe/reading-time", { method: "POST", body }))
  readingResult.value = matchResult(result, {
    ok: (value): ReadingTimeDisplay => ({ ok: true, value }),
    err: (error): ReadingTimeDisplay => ({ ok: false, error: { tag: "FetchError", message: error.message } }),
  })
  readingLoading.value = false
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-50">
      @crbroughton/failsafe/pipe
    </h1>
    <p class="mt-2 text-gray-400">
      Plain left-to-right function composition, independent of
      <code>Result</code>. Pipes a value through up to five functions.
    </p>

    <div class="mt-8 grid gap-4">
      <DemoCard title="Slugify" wraps="pipe(input, trim, toLowerCase, replace)">
        <div class="flex flex-wrap items-center gap-3">
          <input
            v-model="slugInput"
            type="text"
            class="min-w-64 flex-1 rounded border border-gray-700 bg-gray-950 px-3 py-1.5 font-mono text-sm"
          >
          <button
            class="rounded-md bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-900 hover:bg-white"
            :disabled="slugLoading"
            @click="runSlugify"
          >
            Run
          </button>
        </div>
        <ResultDisplay :result="slugResult" :loading="slugLoading" />
      </DemoCard>

      <DemoCard title="Reading time estimator" wraps="pipe(text, …5 functions)">
        <p class="mb-3 text-sm text-gray-400">
          Five chained functions — the max arity <code>pipe()</code>
          supports: trim → word count → minutes → round up → label.
        </p>
        <div class="flex flex-col gap-3">
          <textarea
            v-model="readingText"
            rows="3"
            class="w-full rounded border border-gray-700 bg-gray-950 px-3 py-1.5 font-mono text-sm"
          />
          <button
            class="self-start rounded-md bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-900 hover:bg-white"
            :disabled="readingLoading"
            @click="runReadingTime"
          >
            Run
          </button>
        </div>
        <ResultDisplay :result="readingResult" :loading="readingLoading" />
      </DemoCard>
    </div>
  </div>
</template>
