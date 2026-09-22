<script setup lang="ts">
import type { ReadingTimeDisplay, ReadingTimeRequest, ReadingTimeResponse, SlugifyDisplay, SlugifyRequest, SlugifyResponse } from "#shared/utils/pipe.schema"
import type { ClientError } from "#shared/utils/result.schema"
import { safe } from "@crbroughton/failsafe"

const slugInput = ref("  Hello World  ")
const slugResult = ref<SlugifyDisplay | null>(null)
const slugLoading = ref(false)

async function runSlugify() {
  slugLoading.value = true
  const body: SlugifyRequest = { input: slugInput.value }

  // pipe()'s endpoint never fails, so unlike safe/try/gen there's no
  // nested Result to flatten with chain() — safe()'s own Result already
  // matches SlugifyDisplay's shape exactly.
  slugResult.value = await safe(
    $fetch<SlugifyResponse>("/api/pipe/slugify", { method: "POST", body }),
    (e): ClientError => ({ tag: "FetchError", message: e instanceof Error ? e.message : "Request failed" }),
  )
  slugLoading.value = false
}

const readingText = ref(
  "FailSafe is a lightweight, dependency-free alternative to neverthrow "
  + "for TypeScript, with helpers for wrapping throwing browser and Node APIs.",
)
const readingResult = ref<ReadingTimeDisplay | null>(null)
const readingLoading = ref(false)

async function runReadingTime() {
  readingLoading.value = true
  const body: ReadingTimeRequest = { text: readingText.value }

  readingResult.value = await safe(
    $fetch<ReadingTimeResponse>("/api/pipe/reading-time", { method: "POST", body }),
    (e): ClientError => ({ tag: "FetchError", message: e instanceof Error ? e.message : "Request failed" }),
  )
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
            class="min-w-64 flex-1 rounded border border-gray-700 bg-gray-950 px-3 py-1.5 font-mono text-sm text-gray-100"
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
            class="w-full rounded border border-gray-700 bg-gray-950 px-3 py-1.5 font-mono text-sm text-gray-100"
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
