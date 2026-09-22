<script setup lang="ts">
import type { LoginRequest, LoginResponse, ValidateSlugRequest, ValidateSlugResponse } from "#shared/utils/gen.schema"
import type { ClientError } from "#shared/utils/result.schema"
import { match, matchResult, safe } from "@crbroughton/failsafe"

type LoginDisplay = LoginResponse | { ok: false, error: ClientError }

const email = ref("craig@example.com")
const password = ref("correct-password")
const loginResult = ref<LoginDisplay | null>(null)
const loginLoading = ref(false)

async function runLogin() {
  loginLoading.value = true
  const body: LoginRequest = { email: email.value, password: password.value }

  const result = await safe($fetch<LoginResponse>("/api/gen/login", { method: "POST", body }))
  loginResult.value = matchResult(result, {
    // result succeeded at the network layer — loginResponse is itself a
    // Result, so match it too. Its err branch is the real tagged union
    // (InvalidCredentials | NetworkError | JSONStringifyError |
    // JSONParseError), which is what match() actually needs.
    ok: (loginResponse): LoginDisplay => matchResult(loginResponse, {
      ok: value => ({ ok: true, value }),
      err: (error): LoginDisplay => {
        match(error, {
          InvalidCredentials: e => console.warn("invalid credentials:", e.email),
          NetworkError: e => console.warn("upstream failed:", e.status),
          JSONStringifyError: () => console.warn("could not serialize profile"),
          JSONParseError: e => console.warn("could not parse profile:", e.raw),
        })
        return { ok: false, error }
      },
    }),
    // the fetch itself failed — this Error has no tag, so match() can't
    // run on it; it never reached the endpoint's own Result at all.
    err: (error): LoginDisplay => ({ ok: false, error: { tag: "FetchError", message: error.message } }),
  })
  loginLoading.value = false
}

type ValidateSlugDisplay = ValidateSlugResponse | { ok: false, error: ClientError }

const slugInput = ref("hello world")
const slugResult = ref<ValidateSlugDisplay | null>(null)
const slugLoading = ref(false)

async function runValidateSlug() {
  slugLoading.value = true
  const body: ValidateSlugRequest = { input: slugInput.value }

  const result = await safe($fetch<ValidateSlugResponse>("/api/gen/validate-slug", { method: "POST", body }))
  slugResult.value = matchResult(result, {
    ok: (value): ValidateSlugDisplay => value,
    err: (error): ValidateSlugDisplay => ({ ok: false, error: { tag: "FetchError", message: error.message } }),
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
