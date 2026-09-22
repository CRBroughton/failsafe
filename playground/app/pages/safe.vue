<script setup lang="ts">
import type { ClientError } from "#shared/utils/result.schema"
import type {
  DivideDisplay,
  DivideRequest,
  DivideResponse,
  DivisionError,
  UpstreamDisplay,
  UpstreamError,
  UpstreamRequest,
  UpstreamResponse,
} from "#shared/utils/safe.schema"
import { chain, safe } from "@crbroughton/failsafe"

const a = ref(10)
const b = ref(0)
const divideResult = ref<DivideDisplay | null>(null)
const divideLoading = ref(false)

async function runDivide() {
  divideLoading.value = true
  const body: DivideRequest = { a: a.value, b: b.value }

  // mapError is typed wide enough to cover the endpoint's own error too,
  // so chain() can flatten Result<DivideResponse, ClientError> into a
  // single Result<number, ClientError | DivisionError> in one step —
  // which is exactly what DivideDisplay is, so no further unwrapping.
  const fetched = await safe(
    $fetch<DivideResponse>("/api/safe/divide", { method: "POST", body }),
    (e): ClientError | DivisionError => ({ tag: "FetchError", message: e instanceof Error ? e.message : "Request failed" }),
  )
  divideResult.value = chain(fetched, divideResponse => divideResponse)
  divideLoading.value = false
}

const shouldFail = ref(false)
const upstreamResult = ref<UpstreamDisplay | null>(null)
const upstreamLoading = ref(false)

async function runUpstream() {
  upstreamLoading.value = true
  const body: UpstreamRequest = { shouldFail: shouldFail.value }

  const fetched = await safe(
    $fetch<UpstreamResponse>("/api/safe/upstream", { method: "POST", body }),
    (e): ClientError | UpstreamError => ({ tag: "FetchError", message: e instanceof Error ? e.message : "Request failed" }),
  )
  upstreamResult.value = chain(fetched, upstreamResponse => upstreamResponse)
  upstreamLoading.value = false
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-50">
      @crbroughton/failsafe
    </h1>
    <p class="mt-2 text-gray-400">
      The <code>Result</code> type, <code>Ok</code>/<code>Err</code>, guards,
      and <code>safe()</code> — runs a throwing sync function or a rejecting
      promise and returns a <code>Result</code> instead. Each demo below also
      wraps its own <code>$fetch</code> call in <code>safe()</code>, typed
      end-to-end against the shared Zod schema the endpoint validates
      against, then flattens the nested <code>Result</code> with
      <code>chain()</code> — see the script block.
    </p>

    <div class="mt-8 grid gap-4">
      <DemoCard title="Divide two numbers" wraps="safe(() => a / b, mapError)">
        <p class="mb-3 text-sm text-gray-400">
          Sync overload — <code>b = 0</code> throws, caught and turned into
          <code>Err</code>.
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <input
            v-model.number="a"
            type="number"
            class="w-24 rounded border border-gray-700 bg-gray-950 px-3 py-1.5 text-sm text-gray-100"
          >
          <span class="text-gray-500">÷</span>
          <input
            v-model.number="b"
            type="number"
            class="w-24 rounded border border-gray-700 bg-gray-950 px-3 py-1.5 text-sm text-gray-100"
          >
          <button
            class="rounded-md bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-900 hover:bg-white"
            :disabled="divideLoading"
            @click="runDivide"
          >
            Run
          </button>
        </div>
        <ResultDisplay :result="divideResult" :loading="divideLoading" />
      </DemoCard>

      <DemoCard title="Call an upstream service" wraps="await safe(promise, mapError)">
        <p class="mb-3 text-sm text-gray-400">
          Async overload — awaits a real 150–300ms delayed promise; toggling
          the flag makes it reject, caught and mapped into a tagged
          <code>UpstreamError</code>.
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <label class="flex items-center gap-2 text-sm text-gray-300">
            <input v-model="shouldFail" type="checkbox">
            force failure
          </label>
          <button
            class="rounded-md bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-900 hover:bg-white"
            :disabled="upstreamLoading"
            @click="runUpstream"
          >
            Run
          </button>
        </div>
        <ResultDisplay :result="upstreamResult" :loading="upstreamLoading" />
      </DemoCard>
    </div>
  </div>
</template>
