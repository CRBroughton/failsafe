<script setup lang="ts">
import type { EmptyFieldError, LoginDisplay, LoginRequest, LoginResponse, ValidateSlugDisplay, ValidateSlugRequest, ValidateSlugResponse } from "#shared/utils/gen.schema"
import type { ClientError } from "#shared/utils/result.schema"
import { chain, match, matchResult, safe } from "@crbroughton/failsafe"
import { gen, unwrap } from "@crbroughton/failsafe/gen"

const email = ref("craig@example.com")
const password = ref("correct-password")
const loginResult = ref<LoginDisplay | null>(null)
const loginLoading = ref(false)

async function runLogin() {
  loginLoading.value = true
  const body: LoginRequest = { email: email.value, password: password.value }

  // Two Result-producing steps, chained with gen(): the network fetch
  // (safe(), mapError tags its Error into a ClientError up front) and
  // the endpoint's own LoginResponse (already tagged). Both yield*
  // points now contribute tagged errors, so gen()'s inferred union is
  // uniformly tagged — no runtime guard needed before match().
  const result = await gen(async function* () {
    const loginResponse = yield * unwrap(await safe(
      $fetch<LoginResponse>("/api/gen/login", { method: "POST", body }),
      (e): ClientError => ({ tag: "FetchError", message: e instanceof Error ? e.message : "Request failed" }),
    ))
    return yield * unwrap(loginResponse)
  })

  loginResult.value = matchResult(result, {
    ok: (value): LoginDisplay => ({ ok: true, value }),
    err: (error): LoginDisplay => {
      match(error, {
        FetchError: e => console.warn("fetch failed:", e.message),
        InvalidCredentials: e => console.warn("invalid credentials:", e.email),
        NetworkError: e => console.warn("upstream failed:", e.status),
        JSONStringifyError: () => console.warn("could not serialize profile"),
        JSONParseError: e => console.warn("could not parse profile:", e.raw),
      })
      return { ok: false, error }
    },
  })
  loginLoading.value = false
}

const slugInput = ref("hello world")
const slugResult = ref<ValidateSlugDisplay | null>(null)
const slugLoading = ref(false)

async function runValidateSlug() {
  slugLoading.value = true
  const body: ValidateSlugRequest = { input: slugInput.value }

  // safe()'s mapError is typed wide enough to cover the endpoint's own
  // error too, purely so chain() can flatten Result<ValidateSlugResponse,
  // ClientError> into a single Result<string, ClientError | EmptyFieldError>
  // in one step — no nested Result, one matchResult + one match().
  const fetched = await safe(
    $fetch<ValidateSlugResponse>("/api/gen/validate-slug", { method: "POST", body }),
    (e): ClientError | EmptyFieldError => ({
      tag: "FetchError",
      message: e instanceof Error ? e.message : "Request failed",
    }),
  )
  const result = chain(fetched, validateSlugResponse => validateSlugResponse)

  slugResult.value = matchResult(result, {
    ok: (value): ValidateSlugDisplay => ({ ok: true, value }),
    err: (error): ValidateSlugDisplay => {
      match(error, {
        FetchError: e => console.warn("fetch failed:", e.message),
        EmptyFieldError: e => console.warn("empty field:", e.field),
      })
      return { ok: false, error }
    },
  })
  slugLoading.value = false
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-50">
      @crbroughton/failsafe/gen
    </h1>
    <p class="mt-2 text-gray-400">
      Early-return error propagation for <code>Result</code> — like Rust's
      <code>?</code> operator, via generators and <code>yield*</code>.
    </p>

    <div class="mt-8 grid gap-4">
      <DemoCard title="Login flow (async)" wraps="gen(async function* () { … })">
        <p class="mb-3 text-sm text-gray-400">
          Chains two real (~200ms delayed) async steps via
          <code>yield* unwrap(await …)</code>, plus a sync
          <code>yield* fail(…)</code> for invalid input. Try an email
          without <code>@</code>, the password
          <code>wrong-password</code>, or leave everything as-is for
          success.
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <input
            v-model="email"
            type="text"
            placeholder="email"
            class="min-w-48 flex-1 rounded border border-gray-700 bg-gray-950 px-3 py-1.5 font-mono text-sm text-gray-100 placeholder-gray-600"
          >
          <input
            v-model="password"
            type="text"
            placeholder="password"
            class="min-w-48 flex-1 rounded border border-gray-700 bg-gray-950 px-3 py-1.5 font-mono text-sm text-gray-100 placeholder-gray-600"
          >
          <button
            class="rounded-md bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-900 hover:bg-white"
            :disabled="loginLoading"
            @click="runLogin"
          >
            Run
          </button>
        </div>
        <ResultDisplay :result="loginResult" :loading="loginLoading" />
      </DemoCard>

      <DemoCard title="Validate a slug (sync)" wraps="gen(function* () { … })">
        <p class="mb-3 text-sm text-gray-400">
          The sync overload — <code>gen()</code> returns
          <code>Result&lt;T, E&gt;</code> directly, no <code>Promise</code>.
          Clear the field to see <code>EmptyFieldError</code>.
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <input
            v-model="slugInput"
            type="text"
            class="min-w-64 flex-1 rounded border border-gray-700 bg-gray-950 px-3 py-1.5 font-mono text-sm text-gray-100"
          >
          <button
            class="rounded-md bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-900 hover:bg-white"
            :disabled="slugLoading"
            @click="runValidateSlug"
          >
            Run
          </button>
        </div>
        <ResultDisplay :result="slugResult" :loading="slugLoading" />
      </DemoCard>
    </div>
  </div>
</template>
