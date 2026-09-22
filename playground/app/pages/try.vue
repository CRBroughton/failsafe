<script setup lang="ts">
import type { ClientError } from "#shared/utils/result.schema"
import type {
  Base64Request,
  Base64Response,
  CloneRequest,
  CloneResponse,
  ParseJsonRequest,
  ParseJsonResponse,
  ParseUrlRequest,
  ParseUrlResponse,
} from "#shared/utils/try.schema"
import { matchResult, safe } from "@crbroughton/failsafe"
import { tryJSONParse } from "@crbroughton/failsafe/try"

type ParseJsonDisplay = ParseJsonResponse | { ok: false, error: ClientError }

const jsonRaw = ref("{\"name\":\"ada\"}")
const jsonResult = ref<ParseJsonDisplay | null>(null)
const jsonLoading = ref(false)

async function runParseJson() {
  jsonLoading.value = true
  const body: ParseJsonRequest = { raw: jsonRaw.value }
  // The endpoint already returns a Result-shaped body, but the fetch
  // itself can still fail for reasons that Result never captures —
  // offline, CORS, a non-2xx status $fetch throws on — so it's wrapped
  // in safe() here too, and matchResult() handles both outcomes.
  const result = await safe($fetch<ParseJsonResponse>("/api/try/parse-json", { method: "POST", body }))
  jsonResult.value = matchResult(result, {
    ok: (value): ParseJsonDisplay => value,
    err: (error): ParseJsonDisplay => ({ ok: false, error: { tag: "FetchError", message: error.message } }),
  })
  jsonLoading.value = false
}

type ParseUrlDisplay = ParseUrlResponse | { ok: false, error: ClientError }

const urlInput = ref("https://example.com/path")
const urlResult = ref<ParseUrlDisplay | null>(null)
const urlLoading = ref(false)

async function runParseUrl() {
  urlLoading.value = true
  const body: ParseUrlRequest = { input: urlInput.value }
  const result = await safe($fetch<ParseUrlResponse>("/api/try/parse-url", { method: "POST", body }))
  urlResult.value = matchResult(result, {
    ok: (value): ParseUrlDisplay => value,
    err: (error): ParseUrlDisplay => ({ ok: false, error: { tag: "FetchError", message: error.message } }),
  })
  urlLoading.value = false
}

type Base64Display = Base64Response | { ok: false, error: ClientError }

const base64Mode = ref<"encode" | "decode">("encode")
const base64Input = ref("hello")
const base64Result = ref<Base64Display | null>(null)
const base64Loading = ref(false)

async function runBase64() {
  base64Loading.value = true
  const body: Base64Request = { mode: base64Mode.value, input: base64Input.value }
  const result = await safe($fetch<Base64Response>("/api/try/base64", { method: "POST", body }))
  base64Result.value = matchResult(result, {
    ok: (value): Base64Display => value,
    err: (error): Base64Display => ({ ok: false, error: { tag: "FetchError", message: error.message } }),
  })
  base64Loading.value = false
}

type CloneDisplay = CloneResponse | { ok: false, error: ClientError }

const cloneInput = ref("{\"a\":1,\"b\":[1,2,3]}")
const forceNonCloneable = ref(false)
const cloneResult = ref<CloneDisplay | null>(null)
const cloneLoading = ref(false)

async function runClone() {
  cloneLoading.value = true
  // Not valid JSON (e.g. a bare word)? Fall back to sending the raw
  // string itself — either way the clone demo below still has a value.
  const parsedValue = matchResult(tryJSONParse(cloneInput.value), {
    ok: value => value,
    err: () => cloneInput.value,
  })
  const body: CloneRequest = { value: parsedValue, forceNonCloneable: forceNonCloneable.value }
  const result = await safe($fetch<CloneResponse>("/api/try/clone", { method: "POST", body }))
  cloneResult.value = matchResult(result, {
    ok: (value): CloneDisplay => value,
    err: (error): CloneDisplay => ({ ok: false, error: { tag: "FetchError", message: error.message } }),
  })
  cloneLoading.value = false
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-50">
      @crbroughton/failsafe/try
    </h1>
    <p class="mt-2 text-gray-400">
      <code>Result</code>-returning wrappers around browser/Node APIs that
      throw. Each mirrors its native function's signature exactly and
      returns a <code>TaggedError</code> on failure.
    </p>

    <div class="mt-8 grid gap-4">
      <DemoCard title="Parse JSON" wraps="tryJSONParse(raw)">
        <p class="mb-3 text-sm text-gray-400">
          Try malformed JSON (e.g. remove a closing brace) to see a
          <code>JSONParseError</code>.
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <input
            v-model="jsonRaw"
            type="text"
            class="min-w-64 flex-1 rounded border border-gray-700 bg-gray-950 px-3 py-1.5 font-mono text-sm"
          >
          <button
            class="rounded-md bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-900 hover:bg-white"
            :disabled="jsonLoading"
            @click="runParseJson"
          >
            Run
          </button>
        </div>
        <ResultDisplay :result="jsonResult" :loading="jsonLoading" />
      </DemoCard>

      <DemoCard title="Parse a URL" wraps="tryURL(input, base?)">
        <p class="mb-3 text-sm text-gray-400">
          Try <code>"not a url"</code> to see a <code>URLParseError</code>.
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <input
            v-model="urlInput"
            type="text"
            class="min-w-64 flex-1 rounded border border-gray-700 bg-gray-950 px-3 py-1.5 font-mono text-sm"
          >
          <button
            class="rounded-md bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-900 hover:bg-white"
            :disabled="urlLoading"
            @click="runParseUrl"
          >
            Run
          </button>
        </div>
        <ResultDisplay :result="urlResult" :loading="urlLoading" />
      </DemoCard>

      <DemoCard title="Base64 encode / decode" wraps="tryBase64Encode / tryBase64Decode">
        <p class="mb-3 text-sm text-gray-400">
          In decode mode, try an invalid base64 string to see a
          <code>Base64Error</code>.
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <select
            v-model="base64Mode"
            class="rounded border border-gray-700 bg-gray-950 px-3 py-1.5 text-sm"
          >
            <option value="encode">
              encode
            </option>
            <option value="decode">
              decode
            </option>
          </select>
          <input
            v-model="base64Input"
            type="text"
            class="min-w-64 flex-1 rounded border border-gray-700 bg-gray-950 px-3 py-1.5 font-mono text-sm"
          >
          <button
            class="rounded-md bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-900 hover:bg-white"
            :disabled="base64Loading"
            @click="runBase64"
          >
            Run
          </button>
        </div>
        <ResultDisplay :result="base64Result" :loading="base64Loading" />
      </DemoCard>

      <DemoCard title="structuredClone a value" wraps="tryStructuredClone(value, options?)">
        <p class="mb-3 text-sm text-gray-400">
          Forcing a non-cloneable value (a function) shows a
          <code>StructuredCloneError</code>.
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <input
            v-model="cloneInput"
            type="text"
            class="min-w-64 flex-1 rounded border border-gray-700 bg-gray-950 px-3 py-1.5 font-mono text-sm"
          >
          <label class="flex items-center gap-2 text-sm text-gray-300">
            <input v-model="forceNonCloneable" type="checkbox">
            force non-cloneable
          </label>
          <button
            class="rounded-md bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-900 hover:bg-white"
            :disabled="cloneLoading"
            @click="runClone"
          >
            Run
          </button>
        </div>
        <ResultDisplay :result="cloneResult" :loading="cloneLoading" />
      </DemoCard>
    </div>
  </div>
</template>
